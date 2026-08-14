/* eslint-disable no-await-in-loop, no-restricted-syntax */

import JSZip from "jszip"

import { formatUnits, RAY, rayDiv } from "./bigint"
import { createCsv } from "./serialize/csv"
import {
  borrowerStatement,
  marketConditionStatement,
  positionStatement,
  renderPdf,
  renderXlsx,
  StatementModel,
} from "./statements/render"
import { CanonicalExportRequest, MarketDataset } from "./types"

const transactionHeaders = [
  "market_address",
  "market_symbol",
  "timestamp_utc",
  "block_number",
  "tx_hash",
  "tx_index",
  "tx_from",
  "tx_to",
  "method",
  "status",
  "asset_address",
  "asset_symbol",
  "deposited",
  "deposited_raw",
  "borrowed",
  "borrowed_raw",
  "repaid",
  "repaid_raw",
  "withdrawal_queued",
  "withdrawal_queued_raw",
  "withdrawal_executed",
  "withdrawal_executed_raw",
  "fees_collected",
  "fees_collected_raw",
  "escrowed_out",
  "escrowed_out_raw",
  "untracked_asset_in",
  "untracked_asset_in_raw",
  "untracked_asset_out",
  "untracked_asset_out_raw",
  "market_tokens_transferred",
  "market_tokens_transferred_raw",
  "gas_used",
  "gas_price_wei",
  "tx_fee_native",
  "tx_fee_native_raw",
  "events",
  "summary",
] as const

const eventHeaders = [
  "market_address",
  "market_symbol",
  "timestamp_utc",
  "block_number",
  "tx_hash",
  "log_index",
  "event",
  "participant",
  "counterparty",
  "token_address",
  "token_symbol",
  "amount",
  "amount_raw",
  "scaled_amount_raw",
  "expiry",
  "tx_from",
  "method",
  "tx_status",
  "details_json",
] as const

const accrualHeaders = [
  "market_address",
  "market_symbol",
  "block_number",
  "tx_hash",
  "log_index",
  "period_start_utc",
  "period_end_utc",
  "period_seconds",
  "base_interest_ray",
  "delinquency_fee_ray",
  "protocol_fees",
  "protocol_fees_raw",
  "scale_factor_before_ray",
  "scale_factor_after_ray",
  "base_interest_assets",
  "base_interest_assets_raw",
  "penalty_interest_assets",
  "penalty_interest_assets_raw",
  "scaled_total_supply_raw",
  "is_delinquent",
  "annual_interest_bips",
  "delinquency_fee_bips",
] as const

const iso = (timestamp: number) => new Date(timestamp * 1000).toISOString()

const totalField = (
  dataset: MarketDataset,
  field: keyof MarketDataset["transactions"][number],
) =>
  dataset.transactions.reduce((sum, row) => {
    const value = row[field]
    return sum + (typeof value === "bigint" ? value : 0n)
  }, 0n)

const marketAggregate = (dataset: MarketDataset) => {
  const latest = dataset.dailySeries[dataset.dailySeries.length - 1]
  const decimal = (value: bigint) =>
    formatUnits(value, dataset.market.assetDecimals)
  const protocolFees = dataset.interestAccruals.reduce(
    (sum, row) => sum + row.protocolFeesRaw,
    0n,
  )
  const baseInterest = dataset.interestAccruals.reduce(
    (sum, row) => sum + row.baseInterestAssetsRaw,
    0n,
  )
  const penaltyInterest = dataset.interestAccruals.reduce(
    (sum, row) => sum + row.penaltyInterestAssetsRaw,
    0n,
  )
  const lenders = new Map<string, bigint>()
  let scaleFactor = RAY
  for (const event of dataset.events) {
    if (event.name === "InterestAndFeesAccrued") {
      scaleFactor = BigInt(String(event.args.scaleFactor))
    }
    if (event.name === "Deposit" && event.participant) {
      lenders.set(
        event.participant,
        (lenders.get(event.participant) ?? 0n) +
          BigInt(String(event.args.scaledAmount)),
      )
    }
    if (event.name === "WithdrawalQueued" && event.participant) {
      lenders.set(
        event.participant,
        (lenders.get(event.participant) ?? 0n) -
          BigInt(String(event.args.scaledAmount)),
      )
    }
    if (event.name === "ForceBuyBack" && event.participant) {
      lenders.set(
        event.participant,
        (lenders.get(event.participant) ?? 0n) -
          BigInt(String(event.args.scaledAmount)),
      )
    }
    if (
      event.name === "Transfer" &&
      event.participant &&
      event.counterparty &&
      event.participant !== "0x0000000000000000000000000000000000000000" &&
      event.counterparty !== "0x0000000000000000000000000000000000000000" &&
      event.participant !== dataset.market.address &&
      event.counterparty !== dataset.market.address
    ) {
      const scaled = rayDiv(event.amountRaw ?? 0n, scaleFactor)
      lenders.set(
        event.participant,
        (lenders.get(event.participant) ?? 0n) - scaled,
      )
      lenders.set(
        event.counterparty,
        (lenders.get(event.counterparty) ?? 0n) + scaled,
      )
    }
  }
  const marketClosed = dataset.events.find(
    (event) => event.name === "MarketClosed",
  )
  const deploymentTimestamp = dataset.events[0]?.timestamp
  return {
    address: dataset.market.address,
    name: dataset.market.name,
    symbol: dataset.market.symbol,
    borrower: dataset.market.borrower,
    version: dataset.market.version,
    asset: dataset.market.assetAddress,
    asset_name: dataset.market.assetName,
    asset_symbol: dataset.market.assetSymbol,
    asset_decimals: dataset.market.assetDecimals,
    deploy_block: dataset.market.deploymentBlock,
    deploy_timestamp_utc: deploymentTimestamp ? iso(deploymentTimestamp) : null,
    removed_at_block: dataset.market.removedAtBlock ?? null,
    is_closed: latest?.market_closed_eod === "true",
    closed_at_utc: marketClosed ? iso(marketClosed.timestamp) : null,
    total_supply_raw: latest?.outstanding_principal_raw,
    total_assets_raw: latest?.total_assets_held_raw,
    total_debts_raw: latest?.total_debt_obligation_raw,
    parameters_at_snapshot: {
      annual_interest_bips: latest?.base_apr_bips_eod,
      reserve_ratio_bips: latest?.reserve_ratio_bips_eod,
      delinquency_fee_bips: latest?.penalty_apr_bips_nominal,
      delinquency_grace_period_seconds: latest?.grace_period_seconds,
      withdrawal_batch_duration_seconds: latest?.withdrawal_cycle_seconds,
      max_total_supply_raw: latest?.capacity_raw,
      protocol_fee_bips: latest?.protocol_fee_bips_eod,
      scale_factor_ray: dataset.manifest.reconciliation.snapshotScaleFactorRay,
    },
    aggregates: {
      lender_deposits: decimal(totalField(dataset, "depositedRaw")),
      lender_deposits_raw: String(totalField(dataset, "depositedRaw")),
      lender_withdrawals: decimal(totalField(dataset, "withdrawalExecutedRaw")),
      lender_withdrawals_raw: String(
        totalField(dataset, "withdrawalExecutedRaw"),
      ),
      borrowed: decimal(totalField(dataset, "borrowedRaw")),
      borrowed_raw: String(totalField(dataset, "borrowedRaw")),
      repaid: decimal(totalField(dataset, "repaidRaw")),
      repaid_raw: String(totalField(dataset, "repaidRaw")),
      base_interest_accrued: decimal(baseInterest),
      base_interest_accrued_raw: String(baseInterest),
      penalty_interest_accrued: decimal(penaltyInterest),
      penalty_interest_accrued_raw: String(penaltyInterest),
      protocol_fees_accrued: decimal(protocolFees),
      protocol_fees_accrued_raw: String(protocolFees),
      active_lender_count: [...lenders.values()].filter((value) => value > 0n)
        .length,
      distinct_lender_count: lenders.size,
      net_lender_flow_raw: dataset.manifest.netLenderFlowRaw,
      open_withdrawal_claims_raw: dataset.manifest.openWithdrawalClaimsRaw,
      protocol_fees_by_year_raw: dataset.manifest.protocolFeesByYearRaw,
    },
    delinquency_episodes: dataset.manifest.delinquencyEpisodes.map(
      (episode) => ({
        onset_utc: iso(episode.onsetTimestamp),
        onset_block: episode.onsetBlock,
        onset_tx_hash: episode.onsetTransactionHash,
        cure_utc: episode.cureTimestamp ? iso(episode.cureTimestamp) : null,
        cure_block: episode.cureBlock ?? null,
        cure_tx_hash: episode.cureTransactionHash ?? null,
        penalty_end_utc: episode.penaltyEndTimestamp
          ? iso(episode.penaltyEndTimestamp)
          : null,
        duration_hours: (episode.durationSeconds / 3_600).toFixed(6),
        grace_period_hours: episode.gracePeriodSeconds / 3_600,
        penalty_triggered: episode.penaltyTriggered,
        penalty_interest_assets: decimal(episode.penaltyInterestAssetsRaw),
        penalty_interest_assets_raw: String(episode.penaltyInterestAssetsRaw),
        reserve_ratio_bips: episode.reserveRatioBips,
        is_open: episode.isOpen,
      }),
    ),
    reconciliation: {
      ...dataset.manifest.reconciliation,
      passed: true,
      event_count: dataset.events.length,
      transaction_count: dataset.transactions.length,
    },
    cross_checks: dataset.manifest.crossChecks,
  }
}

const transactionRows = (dataset: MarketDataset) =>
  dataset.transactions.map((row) => {
    const decimal = (value: bigint) =>
      formatUnits(value, dataset.market.assetDecimals)
    const flow = (value: bigint) =>
      row.status === "failed" ? "" : decimal(value)
    const rawFlow = (value: bigint) => (row.status === "failed" ? "" : value)
    const fee = row.gasUsed * row.gasPriceWei
    return {
      market_address: row.marketAddress,
      market_symbol: row.marketSymbol,
      timestamp_utc: iso(row.timestamp),
      block_number: row.blockNumber,
      tx_hash: row.transactionHash,
      tx_index: row.transactionIndex,
      tx_from: row.transactionFrom,
      tx_to: row.transactionTo,
      method: row.method,
      status: row.status,
      asset_address: row.assetAddress,
      asset_symbol: row.assetSymbol,
      deposited: flow(row.depositedRaw),
      deposited_raw: rawFlow(row.depositedRaw),
      borrowed: flow(row.borrowedRaw),
      borrowed_raw: rawFlow(row.borrowedRaw),
      repaid: flow(row.repaidRaw),
      repaid_raw: rawFlow(row.repaidRaw),
      withdrawal_queued: flow(row.withdrawalQueuedRaw),
      withdrawal_queued_raw: rawFlow(row.withdrawalQueuedRaw),
      withdrawal_executed: flow(row.withdrawalExecutedRaw),
      withdrawal_executed_raw: rawFlow(row.withdrawalExecutedRaw),
      fees_collected: flow(row.feesCollectedRaw),
      fees_collected_raw: rawFlow(row.feesCollectedRaw),
      escrowed_out: flow(row.escrowedOutRaw),
      escrowed_out_raw: rawFlow(row.escrowedOutRaw),
      untracked_asset_in: flow(row.untrackedAssetInRaw),
      untracked_asset_in_raw: rawFlow(row.untrackedAssetInRaw),
      untracked_asset_out: flow(row.untrackedAssetOutRaw),
      untracked_asset_out_raw: rawFlow(row.untrackedAssetOutRaw),
      market_tokens_transferred: flow(row.marketTokensTransferredRaw),
      market_tokens_transferred_raw: rawFlow(row.marketTokensTransferredRaw),
      gas_used: row.gasUsed,
      gas_price_wei: row.gasPriceWei,
      tx_fee_native: formatUnits(fee, 18),
      tx_fee_native_raw: fee,
      events: row.events.join("; "),
      summary: row.summary,
    }
  })

const eventRows = (dataset: MarketDataset) =>
  dataset.events.map((row) => ({
    market_address: row.marketAddress,
    market_symbol: row.marketSymbol,
    timestamp_utc: iso(row.timestamp),
    block_number: row.blockNumber,
    tx_hash: row.transactionHash,
    log_index: row.logIndex,
    event: row.name,
    participant: row.participant,
    counterparty: row.counterparty,
    token_address: row.tokenAddress,
    token_symbol: row.tokenSymbol,
    amount:
      row.amountRaw === undefined
        ? ""
        : formatUnits(row.amountRaw, dataset.market.assetDecimals),
    amount_raw: row.amountRaw,
    scaled_amount_raw: row.scaledAmountRaw,
    expiry: row.expiry ? iso(row.expiry) : "",
    tx_from: row.transactionFrom,
    method: row.method,
    tx_status: row.transactionStatus,
    details_json: JSON.stringify(row.args),
  }))

const accrualRows = (dataset: MarketDataset) =>
  dataset.interestAccruals.map((row) => ({
    market_address: row.marketAddress,
    market_symbol: row.marketSymbol,
    block_number: row.blockNumber,
    tx_hash: row.transactionHash,
    log_index: row.logIndex,
    period_start_utc: iso(row.periodStart),
    period_end_utc: iso(row.periodEnd),
    period_seconds: row.periodEnd - row.periodStart,
    base_interest_ray: row.baseInterestRay,
    delinquency_fee_ray: row.delinquencyFeeRay,
    protocol_fees: formatUnits(
      row.protocolFeesRaw,
      dataset.market.assetDecimals,
    ),
    protocol_fees_raw: row.protocolFeesRaw,
    scale_factor_before_ray: row.scaleFactorBeforeRay,
    scale_factor_after_ray: row.scaleFactorAfterRay,
    base_interest_assets: formatUnits(
      row.baseInterestAssetsRaw,
      dataset.market.assetDecimals,
    ),
    base_interest_assets_raw: row.baseInterestAssetsRaw,
    penalty_interest_assets: formatUnits(
      row.penaltyInterestAssetsRaw,
      dataset.market.assetDecimals,
    ),
    penalty_interest_assets_raw: row.penaltyInterestAssetsRaw,
    scaled_total_supply_raw: row.scaledTotalSupplyRaw,
    is_delinquent: row.isDelinquent,
    annual_interest_bips: row.annualInterestBips,
    delinquency_fee_bips: row.delinquencyFeeBips,
    protocol_fee_bips: row.protocolFeeBips,
  }))

const singleMarketReadme = `Wildcat export bundle.
README.txt describes this bundle.
statements/ contains the requested informational summaries.
data/transactions.csv contains one row per market-touching transaction.
data/events.csv contains every decoded market event.
data/interest_accrual.csv contains every accrual period.
data/daily_series.csv contains end-of-day market state.
data/manifest.json records provenance, filters and reconciliation.
All times are UTC and all values come from public on-chain data.
This export is informational and is not tax, accounting or investment advice.`

const multiMarketReadme = `Wildcat multi-market export bundle.
README.txt describes this bundle.
markets/ contains one folder per market, named with its symbol and address.
Each market folder contains its requested statements/ summaries.
Each market folder contains data/transactions.csv and data/events.csv.
Each market folder contains data/interest_accrual.csv and data/daily_series.csv.
Each market folder contains data/manifest.json with provenance and reconciliation.
No market's rows are combined with another market's data files.
All times are UTC and all values come from public on-chain data.
This export is informational and is not tax, accounting or investment advice.`

const marketFolderName = (dataset: MarketDataset) => {
  const symbol =
    dataset.market.symbol
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^[-.]+|[-.]+$/g, "") || "market"
  return `${symbol}_${dataset.market.address.toLowerCase()}`
}

export async function buildExportBundle(
  request: CanonicalExportRequest,
  datasets: MarketDataset[],
  excludedV1: string[],
  generatedAtUtc?: string,
  onProgress?: (stage: "creating_statements" | "creating_zip") => Promise<void>,
) {
  const generatedAt = generatedAtUtc ?? new Date().toISOString()
  const zip = new JSZip()
  const pinned = new Date(
    Math.max(...datasets.map((item) => item.snapshotTimestamp)) * 1000,
  )
  const options = { date: pinned, createFolders: false }
  const dataFilesFor = (dataset: MarketDataset, root: string) => {
    const transactions = transactionRows(dataset)
    const events = eventRows(dataset)
    const accruals = accrualRows(dataset)
    const daily = dataset.dailySeries
    return new Map<string, string | Buffer>([
      [
        `${root}/daily_series.csv`,
        createCsv(Object.keys(daily[0] ?? {}), daily),
      ],
      [`${root}/events.csv`, createCsv(eventHeaders, events)],
      [`${root}/interest_accrual.csv`, createCsv(accrualHeaders, accruals)],
      [
        `${root}/manifest.json`,
        `${JSON.stringify(
          {
            schema_version: "1.0",
            pipeline_version: dataset.pipelineVersion,
            generated_at_utc: generatedAt,
            scope: "full_market",
            snapshot_block: request.snapshotBlock,
            snapshot_block_hash: request.snapshotBlockHash,
            snapshot_timestamp_utc: iso(dataset.snapshotTimestamp),
            chain_id: request.chainId,
            filters_applied: {
              markets: request.markets,
              statements: request.statements,
              addresses: request.addresses,
              date_from: request.dateFrom ?? null,
              date_to: request.dateTo ?? null,
              date_scope: "statements_only",
              statement_format: request.format,
            },
            markets: [marketAggregate(dataset)],
            excluded_v1_markets: excludedV1,
            reverted_tx_coverage: "direct_only",
            rpc_providers: [...new Set(dataset.manifest.rpcProviders)],
            excluded_transfers: [...dataset.manifest.excludedTransfers].sort(
              (left, right) =>
                Number(left.block_number) - Number(right.block_number) ||
                Number(left.log_index) - Number(right.log_index),
            ),
            position_summaries: Object.values(dataset.positions)
              .sort((left, right) => left.address.localeCompare(right.address))
              .map((position) => ({
                market_address: dataset.market.address,
                address: position.address,
                deposits: formatUnits(
                  position.depositsRaw,
                  dataset.market.assetDecimals,
                ),
                deposits_raw: String(position.depositsRaw),
                principal_acquired_by_transfer: formatUnits(
                  position.principalAcquiredByTransferRaw,
                  dataset.market.assetDecimals,
                ),
                principal_acquired_by_transfer_raw: String(
                  position.principalAcquiredByTransferRaw,
                ),
                active_principal: formatUnits(
                  position.activePrincipalRaw,
                  dataset.market.assetDecimals,
                ),
                active_principal_raw: String(position.activePrincipalRaw),
                pending_withdrawal_principal: formatUnits(
                  position.pendingWithdrawalPrincipalRaw,
                  dataset.market.assetDecimals,
                ),
                pending_withdrawal_principal_raw: String(
                  position.pendingWithdrawalPrincipalRaw,
                ),
                principal_still_invested: formatUnits(
                  position.principalStillInvestedRaw,
                  dataset.market.assetDecimals,
                ),
                principal_still_invested_raw: String(
                  position.principalStillInvestedRaw,
                ),
                principal_returned: formatUnits(
                  position.principalReturnedRaw,
                  dataset.market.assetDecimals,
                ),
                principal_returned_raw: String(position.principalReturnedRaw),
                principal_transferred_out: formatUnits(
                  position.principalTransferredOutRaw,
                  dataset.market.assetDecimals,
                ),
                principal_transferred_out_raw: String(
                  position.principalTransferredOutRaw,
                ),
                market_tokens_transferred_out: formatUnits(
                  position.marketTokensTransferredOutRaw,
                  dataset.market.assetDecimals,
                ),
                market_tokens_transferred_out_raw: String(
                  position.marketTokensTransferredOutRaw,
                ),
                current_value: formatUnits(
                  position.currentValueRaw,
                  dataset.market.assetDecimals,
                ),
                current_value_raw: String(position.currentValueRaw),
                pending_withdrawal_value: formatUnits(
                  position.pendingWithdrawalValueRaw,
                  dataset.market.assetDecimals,
                ),
                pending_withdrawal_value_raw: String(
                  position.pendingWithdrawalValueRaw,
                ),
                total_position_value: formatUnits(
                  position.totalPositionValueRaw,
                  dataset.market.assetDecimals,
                ),
                total_position_value_raw: String(
                  position.totalPositionValueRaw,
                ),
                payouts: formatUnits(
                  position.payoutsRaw,
                  dataset.market.assetDecimals,
                ),
                payouts_raw: String(position.payoutsRaw),
                earnings: formatUnits(
                  position.earningsRaw,
                  dataset.market.assetDecimals,
                ),
                earnings_raw: String(position.earningsRaw),
                scaled_balance_raw: String(position.scaledBalanceRaw),
                annual_earnings_raw: Object.fromEntries(
                  Object.entries(position.annualEarnings).map(
                    ([year, value]) => [year, String(value)],
                  ),
                ),
              })),
          },
          null,
          2,
        )}\n`,
      ],
      [`${root}/transactions.csv`, createCsv(transactionHeaders, transactions)],
    ])
  }
  const isMultiMarket = datasets.length > 1
  const dataFiles = new Map<string, string | Buffer>()
  datasets.forEach((dataset) => {
    const root = isMultiMarket
      ? `markets/${marketFolderName(dataset)}/data`
      : "data"
    dataFilesFor(dataset, root).forEach((content, name) =>
      dataFiles.set(name, content),
    )
  })

  await onProgress?.("creating_statements")
  const statementFiles = new Map<string, Buffer>()
  for (const dataset of [...datasets].sort((a, b) =>
    a.market.address.localeCompare(b.market.address),
  )) {
    const extension = request.format
    const statementRoot = isMultiMarket
      ? `markets/${marketFolderName(dataset)}/statements`
      : "statements"
    const addStatement = async (filename: string, model: StatementModel) => {
      const content =
        extension === "pdf"
          ? await renderPdf(model, dataset.snapshotTimestamp)
          : await renderXlsx(model, dataset)
      statementFiles.set(`${statementRoot}/${filename}.${extension}`, content)
    }
    if (request.statements.includes("market_condition")) {
      await addStatement(
        isMultiMarket
          ? "market_condition"
          : `market_condition_${dataset.market.address}`,
        marketConditionStatement(dataset, request),
      )
    }
    if (request.statements.includes("borrower")) {
      await addStatement(
        isMultiMarket
          ? "borrower_statement"
          : `borrower_statement_${dataset.market.address}`,
        borrowerStatement(dataset, request),
      )
    }
    if (request.statements.includes("position")) {
      for (const address of request.addresses) {
        const position = dataset.positions[address.toLowerCase()]
        await addStatement(
          isMultiMarket
            ? `position_statement_${address.toLowerCase()}`
            : `position_statement_${
                dataset.market.address
              }_${address.toLowerCase()}`,
          positionStatement(dataset, position, request),
        )
      }
    }
  }

  await onProgress?.("creating_zip")

  zip.file(
    "README.txt",
    isMultiMarket ? multiMarketReadme : singleMarketReadme,
    options,
  )
  for (const [name, content] of [...statementFiles].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    zip.file(name, content, options)
  }
  for (const [name, content] of [...dataFiles].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    zip.file(name, content, options)
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
  })
}
/* eslint-disable no-await-in-loop, no-restricted-syntax */
