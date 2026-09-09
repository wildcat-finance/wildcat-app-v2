/* eslint-disable no-await-in-loop, no-continue, no-nested-ternary, no-restricted-syntax, no-use-before-define */

import { BigNumber, constants, utils } from "ethers"

import {
  advanceRateState,
  aggregateAccrualsForDay,
  percentagesFromRateSeconds,
} from "./dailyRates"
import {
  erc20Interface,
  marketInterface,
  supportedMarketTopics,
} from "../abi/registry"
import {
  BIPS,
  addPercentages,
  formatUnits,
  percentFromBips,
  percentFromRay,
  percentFromScaleFactors,
  RAY,
  rayDiv,
  rayMul,
  SECONDS_PER_YEAR,
} from "../bigint"
import {
  EtherscanLog,
  etherscanExplorer,
  ExportExplorer,
} from "../sources/etherscan"
import {
  ExportRpc,
  fromHex,
  fromHexBigInt,
  normalizeRpcBlock,
  normalizeRpcLog,
  toBlockHex,
} from "../sources/rpc"
import { contractRead, contractReadMany, erc20Read } from "../sources/state"
import {
  DecodedMarketEvent,
  DelinquencyEpisode,
  InterestAccrualRow,
  JsonRpcLog,
  JsonRpcReceipt,
  JsonRpcTransaction,
  MarketDataset,
  MarketMetadata,
  PositionSummary,
  TransactionLedgerRow,
} from "../types"
import { EXPORT_PIPELINE_VERSION } from "../version"

const zeroAddress = constants.AddressZero.toLowerCase()

const asBigInt = (value: unknown) => BigInt(BigNumber.from(value).toString())
const asNumber = (value: unknown) => Number(BigNumber.from(value).toString())
const asAddress = (value: unknown) => String(value).toLowerCase()

function jsonValue(value: unknown): unknown {
  if (BigNumber.isBigNumber(value)) return value.toString()
  if (Array.isArray(value)) return value.map(jsonValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/^\d+$/.test(key))
        .map(([key, child]) => [key, jsonValue(child)]),
    )
  }
  return value
}

const namedArgs = (args: utils.Result) =>
  Object.fromEntries(
    Object.keys(args)
      .filter((key) => !/^\d+$/.test(key))
      .map((key) => [key, jsonValue(args[key])]),
  )

type CurrentState = utils.Result & {
  isClosed: boolean
  maxTotalSupply: BigNumber
  accruedProtocolFees: BigNumber
  normalizedUnclaimedWithdrawals: BigNumber
  scaledTotalSupply: BigNumber
  scaledPendingWithdrawals: BigNumber
  pendingWithdrawalExpiry: BigNumber
  isDelinquent: boolean
  timeDelinquent: BigNumber
  protocolFeeBips: BigNumber
  annualInterestBips: BigNumber
  reserveRatioBips: BigNumber
  scaleFactor: BigNumber
  lastInterestAccruedTimestamp: BigNumber
}

const eventAmount = (name: string, args: utils.Result) => {
  const fields: Record<string, string> = {
    Deposit: "assetAmount",
    Borrow: "assetAmount",
    DebtRepaid: "assetAmount",
    WithdrawalQueued: "normalizedAmount",
    WithdrawalExecuted: "normalizedAmount",
    WithdrawalBatchPayment: "normalizedAmountPaid",
    WithdrawalBatchExpired: "normalizedAmountPaid",
    FeesCollected: "assets",
    Approval: "value",
    MaxTotalSupplyUpdated: "assets",
    SanctionedAccountAssetsQueuedForWithdrawal: "normalizedAmount",
    SanctionedAccountAssetsSentToEscrow: "amount",
    SanctionedAccountWithdrawalSentToEscrow: "amount",
    ForceBuyBack: "normalizedAmount",
    Transfer: "value",
  }
  const field = fields[name]
  return field && args[field] !== undefined ? asBigInt(args[field]) : undefined
}

const eventScaledAmount = (name: string, args: utils.Result) => {
  const field =
    name === "WithdrawalBatchPayment" || name === "WithdrawalBatchExpired"
      ? "scaledAmountBurned"
      : "scaledAmount"
  return args[field] !== undefined ? asBigInt(args[field]) : undefined
}

const eventParties = (name: string, args: utils.Result) => {
  const participantFields: Record<string, string> = {
    Deposit: "account",
    DebtRepaid: "from",
    WithdrawalQueued: "account",
    WithdrawalExecuted: "account",
    Approval: "owner",
    AccountSanctioned: "account",
    SanctionedAccountAssetsQueuedForWithdrawal: "account",
    SanctionedAccountAssetsSentToEscrow: "account",
    SanctionedAccountWithdrawalSentToEscrow: "account",
    ForceBuyBack: "lender",
    Transfer: "from",
    ChangedSpherexOperator: "oldSphereXAdmin",
    ChangedSpherexEngineAddress: "oldEngineAddress",
  }
  const counterpartyFields: Record<string, string> = {
    Approval: "spender",
    SanctionedAccountAssetsSentToEscrow: "escrow",
    SanctionedAccountWithdrawalSentToEscrow: "escrow",
    Transfer: "to",
    ChangedSpherexOperator: "newSphereXAdmin",
    ChangedSpherexEngineAddress: "newEngineAddress",
  }
  const participant = participantFields[name]
    ? asAddress(args[participantFields[name]])
    : undefined
  const counterparty = counterpartyFields[name]
    ? asAddress(args[counterpartyFields[name]])
    : undefined
  return { participant, counterparty }
}

const methodName = (transaction: JsonRpcTransaction) => {
  if (!transaction.input || transaction.input === "0x") return "transfer"
  try {
    return marketInterface.parseTransaction({ data: transaction.input }).name
  } catch {
    return transaction.input.slice(0, 10)
  }
}

const transactionMethod = (
  market: MarketMetadata,
  transaction: JsonRpcTransaction,
) => {
  const method = methodName(transaction)
  const target = transaction.to?.toLowerCase()
  return target && target !== market.address
    ? `${method} (via ${target})`
    : method
}

async function fetchTransactionContext(rpc: ExportRpc, hashes: string[]) {
  const [transactions, receipts] = await Promise.all([
    rpc.batch<JsonRpcTransaction | null>(
      hashes.map((hash) => ({
        method: "eth_getTransactionByHash",
        params: [hash],
      })),
    ),
    rpc.batch<JsonRpcReceipt | null>(
      hashes.map((hash) => ({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })),
    ),
  ])
  hashes.forEach((hash, index) => {
    assertRpcTransaction(transactions[index], hash)
    assertRpcReceipt(receipts[index], hash)
    if (
      transactions[index]!.blockNumber !== receipts[index]!.blockNumber ||
      transactions[index]!.blockHash.toLowerCase() !==
        receipts[index]!.blockHash.toLowerCase() ||
      transactions[index]!.transactionIndex !==
        receipts[index]!.transactionIndex ||
      transactions[index]!.from.toLowerCase() !==
        receipts[index]!.from.toLowerCase() ||
      transactions[index]!.to?.toLowerCase() !==
        receipts[index]!.to?.toLowerCase()
    ) {
      throw new Error(`RPC transaction/receipt mismatch ${hash}`)
    }
  })
  return new Map(
    hashes.map((hash, index) => [
      hash.toLowerCase(),
      { transaction: transactions[index]!, receipt: receipts[index]! },
    ]),
  )
}

const fixedHex = (value: unknown, bytes: number) =>
  typeof value === "string" &&
  new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`, "i").test(value)

function assertRpcTransaction(
  value: JsonRpcTransaction | null,
  expectedHash: string,
): asserts value is JsonRpcTransaction {
  if (
    !value ||
    value.hash.toLowerCase() !== expectedHash.toLowerCase() ||
    !fixedHex(value.hash, 32) ||
    !fixedHex(value.blockHash, 32) ||
    !fixedHex(value.from, 20) ||
    (value.to !== null && !fixedHex(value.to, 20)) ||
    !/^0x(?:[0-9a-f]{2})*$/i.test(value.input)
  ) {
    throw new Error(`Invalid RPC transaction ${expectedHash}`)
  }
  fromHex(value.blockNumber)
  fromHex(value.transactionIndex)
  fromHexBigInt(value.value)
}

function assertRpcReceipt(
  value: JsonRpcReceipt | null,
  expectedHash: string,
): asserts value is JsonRpcReceipt {
  if (
    !value ||
    value.transactionHash.toLowerCase() !== expectedHash.toLowerCase() ||
    !fixedHex(value.transactionHash, 32) ||
    !fixedHex(value.blockHash, 32) ||
    !fixedHex(value.from, 20) ||
    (value.to !== null && !fixedHex(value.to, 20)) ||
    !Array.isArray(value.logs) ||
    !["0x0", "0x1"].includes(value.status)
  ) {
    throw new Error(`Invalid RPC receipt ${expectedHash}`)
  }
  fromHex(value.blockNumber)
  fromHex(value.transactionIndex)
  fromHexBigInt(value.gasUsed)
  if (value.effectiveGasPrice) fromHexBigInt(value.effectiveGasPrice)
}

async function fetchTimestamps(rpc: ExportRpc, blocks: number[]) {
  const unique = [...new Set(blocks)].sort((a, b) => a - b)
  const values = await rpc.batch<unknown>(
    unique.map((block) => ({
      method: "eth_getBlockByNumber",
      params: [toBlockHex(block), false],
    })),
  )
  return new Map(
    unique.map((block, index) => [
      block,
      fromHex(normalizeRpcBlock(values[index], block).timestamp),
    ]),
  )
}

export function classifyTransfersMentioningMarket(
  logs: JsonRpcLog[],
  market: Pick<MarketMetadata, "address" | "assetAddress">,
) {
  const deduped = new Map<string, JsonRpcLog>()
  for (const log of logs) {
    deduped.set(`${log.transactionHash}:${log.logIndex}`, log)
  }
  const related = [...deduped.values()].sort(
    (a, b) =>
      fromHex(a.blockNumber) - fromHex(b.blockNumber) ||
      fromHex(a.logIndex) - fromHex(b.logIndex),
  )
  const assetAddress = market.assetAddress.toLowerCase()
  const allowed = new Set([market.address.toLowerCase(), assetAddress])
  return {
    assetLogs: related.filter(
      (log) => log.address.toLowerCase() === assetAddress,
    ),
    excludedLogs: related.filter(
      (log) => !allowed.has(log.address.toLowerCase()),
    ),
  }
}

export async function verifyTransferCandidates(
  rpc: ExportRpc,
  candidates: EtherscanLog[],
  market: MarketMetadata,
  snapshotBlock: number,
) {
  const hashes = [
    ...new Set(candidates.map((log) => log.transactionHash.toLowerCase())),
  ]
  const receipts = await rpc.batch<JsonRpcReceipt | null>(
    hashes.map((hash) => ({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })),
  )
  const receiptLogs = new Map<string, JsonRpcLog>()
  receipts.forEach((receipt, index) => {
    const hash = hashes[index]
    assertRpcReceipt(receipt, hash)
    const block = fromHex(receipt.blockNumber)
    if (block < market.deploymentBlock || block > snapshotBlock) {
      throw new Error(`Transfer candidate outside export snapshot ${hash}`)
    }
    receipt.logs.map(normalizeRpcLog).forEach((log) => {
      receiptLogs.set(`${log.transactionHash}:${fromHex(log.logIndex)}`, log)
    })
  })
  const verified = candidates.map((candidate) => {
    const identity = `${candidate.transactionHash.toLowerCase()}:${fromHex(
      candidate.logIndex,
    )}`
    const log = receiptLogs.get(identity)
    if (!log) {
      throw new Error(`Transfer candidate missing from RPC receipt ${identity}`)
    }
    return log
  })
  compareMarketLogSources(
    `transfer candidates for ${market.address}`,
    verified,
    candidates,
  )
  return classifyTransfersMentioningMarket(verified, market)
}

const parseChainNumber = (value: string) => {
  if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value)) {
    throw new Error(`Invalid log quantity ${value}`)
  }
  return value.startsWith("0x")
    ? Number.parseInt(value, 16)
    : Number.parseInt(value, 10)
}

const logIdentity = (log: {
  blockNumber: string
  logIndex: string
  transactionHash: string
}) =>
  `${parseChainNumber(log.blockNumber)}:${parseChainNumber(
    log.logIndex,
  )}:${log.transactionHash.toLowerCase()}`

type ComparableLog = {
  address: string
  blockHash: string
  blockNumber: string
  data: string
  logIndex: string
  topics: string[]
  transactionHash: string
  transactionIndex: string
  removed?: boolean
}

const canonicalLogPayload = (log: ComparableLog) =>
  JSON.stringify({
    address: log.address.toLowerCase(),
    blockHash: log.blockHash.toLowerCase(),
    blockNumber: parseChainNumber(log.blockNumber),
    transactionHash: log.transactionHash.toLowerCase(),
    transactionIndex: parseChainNumber(log.transactionIndex),
    logIndex: parseChainNumber(log.logIndex),
    topics: log.topics.map((topic) => topic.toLowerCase()),
    data: log.data.toLowerCase(),
  })

const canonicalLogMap = (source: string, logs: ComparableLog[]) => {
  const result = new Map<string, string>()
  for (const log of logs) {
    if (log.removed) throw new Error(`${source} returned a removed log`)
    const identity = logIdentity(log)
    if (result.has(identity)) {
      throw new Error(`${source} returned duplicate log ${identity}`)
    }
    result.set(identity, canonicalLogPayload(log))
  }
  return result
}

export function compareMarketLogSources(
  market: string,
  rpcLogs: ComparableLog[],
  explorerLogs: ComparableLog[],
) {
  const rpc = canonicalLogMap("RPC", rpcLogs)
  const explorer = canonicalLogMap("Etherscan", explorerLogs)
  const rpcOnly = [...rpc.keys()].filter((identity) => !explorer.has(identity))
  const explorerOnly = [...explorer.keys()].filter(
    (identity) => !rpc.has(identity),
  )
  const payloadMismatches = [...rpc.keys()].filter(
    (identity) =>
      explorer.has(identity) && rpc.get(identity) !== explorer.get(identity),
  )
  if (
    rpcOnly.length > 0 ||
    explorerOnly.length > 0 ||
    payloadMismatches.length > 0
  ) {
    throw new Error(
      `Independent log check failed for ${market}: RPC ${rpc.size}, Etherscan ${
        explorer.size
      }; RPC-only ${rpcOnly.length}${
        rpcOnly[0] ? ` (first ${rpcOnly[0]})` : ""
      }; Etherscan-only ${explorerOnly.length}${
        explorerOnly[0] ? ` (first ${explorerOnly[0]})` : ""
      }; payload mismatches ${payloadMismatches.length}${
        payloadMismatches[0] ? ` (first ${payloadMismatches[0]})` : ""
      }`,
    )
  }
  return { rpcCount: rpc.size, explorerCount: explorer.size }
}

function decodeEvents(
  market: MarketMetadata,
  logs: JsonRpcLog[],
  timestamps: Map<number, number>,
  context: Map<
    string,
    { transaction: JsonRpcTransaction; receipt: JsonRpcReceipt }
  >,
) {
  return logs.map<DecodedMarketEvent>((log) => {
    const topic = log.topics[0]?.toLowerCase()
    if (!supportedMarketTopics.has(topic)) {
      throw new Error(
        `Unknown event topic ${topic} at ${log.transactionHash}:${fromHex(
          log.logIndex,
        )}`,
      )
    }
    const decoded = marketInterface.parseLog(log)
    const txContext = context.get(log.transactionHash.toLowerCase())
    if (!txContext)
      throw new Error(`Missing transaction context ${log.transactionHash}`)
    const parties = eventParties(decoded.name, decoded.args)
    let { participant } = parties
    const { counterparty } = parties
    if (decoded.name === "Borrow") participant = market.borrower
    if (decoded.name === "FeesCollected") participant = market.feeRecipient
    const expiry = decoded.args.expiry
      ? Number(BigNumber.from(decoded.args.expiry).toString())
      : undefined
    const amountRaw = eventAmount(decoded.name, decoded.args)
    const isMarketToken =
      decoded.name === "Transfer" || decoded.name === "Approval"
    const tokenAddress = isMarketToken
      ? market.address
      : amountRaw !== undefined
        ? market.assetAddress
        : undefined
    const tokenSymbol = isMarketToken
      ? market.symbol
      : amountRaw !== undefined
        ? market.assetSymbol
        : undefined
    return {
      marketAddress: market.address,
      marketSymbol: market.symbol,
      timestamp: timestamps.get(fromHex(log.blockNumber))!,
      blockNumber: fromHex(log.blockNumber),
      transactionHash: log.transactionHash.toLowerCase(),
      transactionIndex: fromHex(log.transactionIndex),
      logIndex: fromHex(log.logIndex),
      name: decoded.name,
      args: namedArgs(decoded.args),
      participant,
      counterparty,
      tokenAddress,
      tokenSymbol,
      amountRaw,
      scaledAmountRaw: eventScaledAmount(decoded.name, decoded.args),
      expiry,
      transactionFrom: txContext.transaction.from.toLowerCase(),
      transactionTo: txContext.transaction.to?.toLowerCase() ?? null,
      method: transactionMethod(market, txContext.transaction),
      transactionStatus:
        txContext.receipt.status === "0x1" ? "success" : "failed",
    }
  })
}

const emptyTransaction = (
  market: MarketMetadata,
  transaction: JsonRpcTransaction,
  receipt: JsonRpcReceipt,
  timestamp: number,
): TransactionLedgerRow => ({
  marketAddress: market.address,
  marketSymbol: market.symbol,
  timestamp,
  blockNumber: fromHex(transaction.blockNumber),
  transactionHash: transaction.hash.toLowerCase(),
  transactionIndex: fromHex(transaction.transactionIndex),
  transactionFrom: transaction.from.toLowerCase(),
  transactionTo: transaction.to?.toLowerCase() ?? null,
  method: transactionMethod(market, transaction),
  status: receipt.status === "0x1" ? "success" : "failed",
  assetAddress: market.assetAddress,
  assetSymbol: market.assetSymbol,
  depositedRaw: 0n,
  borrowedRaw: 0n,
  repaidRaw: 0n,
  withdrawalQueuedRaw: 0n,
  withdrawalExecutedRaw: 0n,
  feesCollectedRaw: 0n,
  escrowedOutRaw: 0n,
  untrackedAssetInRaw: 0n,
  untrackedAssetOutRaw: 0n,
  marketTokensTransferredRaw: 0n,
  gasUsed: fromHexBigInt(receipt.gasUsed),
  gasPriceWei: receipt.effectiveGasPrice
    ? fromHexBigInt(receipt.effectiveGasPrice)
    : 0n,
  events: [],
  summary: "",
})

export const addEventToTransaction = (
  row: TransactionLedgerRow,
  event: DecodedMarketEvent,
) => {
  const amount = event.amountRaw ?? 0n
  if (event.name === "Deposit") row.depositedRaw += amount
  if (event.name === "Borrow") row.borrowedRaw += amount
  if (event.name === "DebtRepaid") row.repaidRaw += amount
  if (event.name === "WithdrawalQueued") row.withdrawalQueuedRaw += amount
  // Sanction companion events describe the ordinary queue/execute flow and do
  // not represent an additional movement of assets.
  if (event.name === "WithdrawalExecuted" || event.name === "ForceBuyBack") {
    row.withdrawalExecutedRaw += amount
  }
  if (event.name === "FeesCollected") row.feesCollectedRaw += amount
  if (event.name === "SanctionedAccountAssetsSentToEscrow") {
    row.escrowedOutRaw += amount
  }
  if (
    event.name === "Transfer" &&
    event.participant !== zeroAddress &&
    event.counterparty !== zeroAddress
  ) {
    row.marketTokensTransferredRaw += amount
  }
  row.events.push(event.name)
}

const transactionSummary = (row: TransactionLedgerRow, decimals: number) => {
  const parts: string[] = []
  const amount = (label: string, value: bigint) => {
    if (value !== 0n)
      parts.push(`${label} ${formatUnits(value, decimals)} ${row.assetSymbol}`)
  }
  amount("Deposited", row.depositedRaw)
  amount("Borrowed", row.borrowedRaw)
  amount("Repaid", row.repaidRaw)
  amount("Queued withdrawal", row.withdrawalQueuedRaw)
  amount("Executed withdrawal", row.withdrawalExecutedRaw)
  amount("Collected fees", row.feesCollectedRaw)
  amount("Untracked asset in", row.untrackedAssetInRaw)
  amount("Untracked asset out", row.untrackedAssetOutRaw)
  if (row.status === "failed") parts.push("Direct market call reverted")
  return parts.join("; ") || [...new Set(row.events)].join("; ")
}

export function buildInterestAccruals(
  market: MarketMetadata,
  events: DecodedMarketEvent[],
  delinquencyFeeBips: number,
  initialState: { protocolFeeBips: number; isDelinquent: boolean },
) {
  let scaledSupply = 0n
  let scaleFactor = RAY
  let { protocolFeeBips, isDelinquent } = initialState
  const rows: InterestAccrualRow[] = []
  for (const event of events) {
    scaledSupply = applyScaledSupplyEvent(scaledSupply, event)
    if (event.name === "ProtocolFeeBipsUpdated") {
      protocolFeeBips = Number(event.args.protocolFeeBips)
    }
    if (event.name === "StateUpdated") {
      isDelinquent = event.args.isDelinquent === true
    }
    if (event.name !== "InterestAndFeesAccrued") continue
    const baseInterestRay = BigInt(String(event.args.baseInterestRay))
    const delinquencyFeeRay = BigInt(String(event.args.delinquencyFeeRay))
    const nextScaleFactor = BigInt(String(event.args.scaleFactor))
    const expectedScaleFactor =
      scaleFactor + rayMul(scaleFactor, baseInterestRay + delinquencyFeeRay)
    if (nextScaleFactor !== expectedScaleFactor) {
      throw new Error(
        `Scale-factor walk failed at ${event.transactionHash}:${event.logIndex}`,
      )
    }
    const periodStart = Number(event.args.fromTimestamp)
    const periodEnd = Number(event.args.toTimestamp)
    const periodSeconds = periodEnd - periodStart
    const annualInterestBips =
      periodSeconds > 0
        ? Number(
            (baseInterestRay * SECONDS_PER_YEAR * BIPS +
              (BigInt(periodSeconds) * RAY) / 2n) /
              (BigInt(periodSeconds) * RAY),
          )
        : 0
    rows.push({
      marketAddress: market.address,
      marketSymbol: market.symbol,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
      periodStart,
      periodEnd,
      baseInterestRay,
      delinquencyFeeRay,
      protocolFeesRaw: BigInt(String(event.args.protocolFees)),
      scaleFactorBeforeRay: scaleFactor,
      scaleFactorAfterRay: nextScaleFactor,
      baseInterestAssetsRaw: rayMul(
        scaledSupply,
        rayMul(scaleFactor, baseInterestRay),
      ),
      penaltyInterestAssetsRaw: rayMul(
        scaledSupply,
        rayMul(scaleFactor, delinquencyFeeRay),
      ),
      scaledTotalSupplyRaw: scaledSupply,
      isDelinquent,
      annualInterestBips,
      delinquencyFeeBips,
      protocolFeeBips,
    })
    scaleFactor = nextScaleFactor
  }
  return rows
}

export function applyScaledSupplyEvent(
  current: bigint,
  event: DecodedMarketEvent,
) {
  let next = current
  if (event.name === "Deposit") {
    next += BigInt(String(event.args.scaledAmount))
  }
  if (event.name === "WithdrawalBatchPayment") {
    next -= BigInt(String(event.args.scaledAmountBurned))
  }
  if (event.name === "ForceBuyBack") {
    next -= BigInt(String(event.args.scaledAmount))
  }
  if (next < 0n) {
    throw new Error(
      `Scaled-supply walk underflow at ${event.transactionHash}:${event.logIndex}`,
    )
  }
  return next
}

export const proportionalPrincipalReturned = (
  originalPrincipal: bigint,
  cumulativeExecuted: bigint,
  currentEntitlement: bigint,
) =>
  currentEntitlement > 0n
    ? (originalPrincipal * cumulativeExecuted) / currentEntitlement
    : 0n

const isoDate = (timestamp: number) =>
  new Date(timestamp * 1000).toISOString().slice(0, 10)
const isoTime = (timestamp: number) => new Date(timestamp * 1000).toISOString()

export function buildDelinquencyEpisodes(
  events: DecodedMarketEvent[],
  accruals: InterestAccrualRow[],
  gracePeriod: number,
  delinquencyFeeBips: number,
  snapshotTimestamp: number,
  initialReserveRatioBips: number,
  initialTimerState: {
    timestamp: number
    isDelinquent: boolean
    timeDelinquent: number
  },
): DelinquencyEpisode[] {
  const transitions: {
    start: DecodedMarketEvent
    onsetTimeDelinquent: number
    reserveRatioBips: number
    cure?: DecodedMarketEvent
    cureTimeDelinquent?: number
  }[] = []
  let onset: DecodedMarketEvent | undefined
  let onsetTimeDelinquent = 0
  let reserveRatioBips = initialReserveRatioBips
  let onsetReserveRatioBips = 0
  const timerState = {
    ...initialTimerState,
    annualInterestBips: 0,
    protocolFeeBips: 0,
  }
  for (const event of events) {
    if (event.name === "ReserveRatioBipsUpdated") {
      reserveRatioBips = Number(event.args.reserveRatioBipsUpdated)
    }
    if (event.name !== "StateUpdated") continue
    advanceRateState(
      timerState,
      event.timestamp,
      delinquencyFeeBips,
      gracePeriod,
    )
    const delinquent = event.args.isDelinquent === true
    if (delinquent && !onset) {
      onset = event
      onsetTimeDelinquent = timerState.timeDelinquent
      onsetReserveRatioBips = reserveRatioBips
    }
    if (!delinquent && onset) {
      transitions.push({
        start: onset,
        onsetTimeDelinquent,
        reserveRatioBips: onsetReserveRatioBips,
        cure: event,
        cureTimeDelinquent: timerState.timeDelinquent,
      })
      onset = undefined
    }
    timerState.isDelinquent = delinquent
  }
  if (onset) {
    transitions.push({
      start: onset,
      onsetTimeDelinquent,
      reserveRatioBips: onsetReserveRatioBips,
    })
  }
  return transitions.map(
    (
      {
        start,
        onsetTimeDelinquent: timeAtOnset,
        reserveRatioBips: reserve,
        cure,
        cureTimeDelinquent,
      },
      index,
    ) => {
      const end = cure?.timestamp ?? snapshotTimestamp
      const nextOnset = transitions[index + 1]?.start.timestamp
      const penaltyAccruals = accruals.filter(
        (row) =>
          row.delinquencyFeeRay > 0n &&
          row.periodEnd >= start.timestamp &&
          (nextOnset === undefined || row.periodEnd < nextOnset),
      )
      const penaltyInterestAssetsRaw = penaltyAccruals.reduce(
        (sum, row) => sum + row.penaltyInterestAssetsRaw,
        0n,
      )
      const durationSeconds = Math.max(0, end - start.timestamp)
      const projectedPenaltyEnd = cure
        ? cure.timestamp + Math.max(0, (cureTimeDelinquent ?? 0) - gracePeriod)
        : undefined
      const penaltyEndTimestamp =
        projectedPenaltyEnd !== undefined &&
        cure !== undefined &&
        projectedPenaltyEnd > cure.timestamp &&
        projectedPenaltyEnd <= snapshotTimestamp &&
        (nextOnset === undefined || projectedPenaltyEnd <= nextOnset)
          ? projectedPenaltyEnd
          : undefined
      return {
        onsetTimestamp: start.timestamp,
        onsetBlock: start.blockNumber,
        onsetTransactionHash: start.transactionHash,
        ...(cure
          ? {
              cureTimestamp: cure.timestamp,
              cureBlock: cure.blockNumber,
              cureTransactionHash: cure.transactionHash,
            }
          : {}),
        ...(penaltyEndTimestamp && penaltyEndTimestamp > end
          ? { penaltyEndTimestamp }
          : {}),
        durationSeconds,
        gracePeriodSeconds: gracePeriod,
        penaltyTriggered:
          timeAtOnset + durationSeconds > gracePeriod ||
          penaltyInterestAssetsRaw > 0n,
        penaltyInterestAssetsRaw,
        reserveRatioBips: reserve,
        isOpen: !cure,
      }
    },
  )
}

export const sanitizeTokenSymbol = (value: string) => {
  const symbol = value
    .normalize("NFKC")
    // Token symbols are untrusted display data. Keep their shape visible while
    // removing controls and Unicode lookalikes from a field consumers may show.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?")
    .trim()
  if (
    /(?:https?:\/\/|www\.)/i.test(symbol) ||
    /[a-z0-9-]+\s*\.\s*(?:com|org|net|io|finance|xyz)\b/i.test(symbol) ||
    /\b(?:visit|website|claim|reward|airdrop)\b/i.test(symbol)
  ) {
    return "[unsafe symbol removed]"
  }
  return symbol.slice(0, 64) || "unreadable"
}

export const foreignTransferKind = (log: JsonRpcLog) => {
  if (log.topics.length === 3 && /^0x[0-9a-f]{64}$/i.test(log.data)) {
    return "erc20" as const
  }
  if (log.topics.length === 4 && log.data === "0x") {
    return "erc721" as const
  }
  return "unknown" as const
}

async function foreignTokenMetadata(
  rpc: ExportRpc,
  token: string,
  snapshotBlock: number,
) {
  try {
    const [symbol, decimals] = await Promise.all([
      erc20Read<string>(
        rpc,
        erc20Interface,
        token,
        "symbol",
        [],
        snapshotBlock,
      ),
      erc20Read<number>(
        rpc,
        erc20Interface,
        token,
        "decimals",
        [],
        snapshotBlock,
      ),
    ])
    const numericDecimals = Number(decimals)
    if (
      !Number.isInteger(numericDecimals) ||
      numericDecimals < 0 ||
      numericDecimals > 255
    ) {
      throw new Error("Invalid foreign-token decimals")
    }
    return {
      symbol: sanitizeTokenSymbol(String(symbol)),
      decimals: numericDecimals,
    }
  } catch {
    return { symbol: "unreadable", decimals: 0 }
  }
}

async function buildDailySeries(
  rpc: ExportRpc,
  market: MarketMetadata,
  snapshotBlock: number,
  snapshotTimestamp: number,
  transactions: TransactionLedgerRow[],
  accruals: InterestAccrualRow[],
  deploymentState: CurrentState,
  delinquencyFeeBips: number,
  gracePeriod: number,
  withdrawalCycle: number,
  checkpoint?: MarketDataset,
) {
  const deployment = await rpc.getBlock(market.deploymentBlock)
  const deploymentTimestamp = fromHex(deployment.timestamp)
  // A checkpoint's final date is partial by definition. Preserve earlier
  // complete dates and rebuild that final UTC date through the new snapshot.
  const preservedRows = checkpoint
    ? checkpoint.dailySeries.filter(
        (row) => row.date_utc < isoDate(checkpoint.snapshotTimestamp),
      )
    : []
  const startDate = checkpoint
    ? isoDate(checkpoint.snapshotTimestamp)
    : isoDate(deploymentTimestamp)
  const endDate = isoDate(snapshotTimestamp)
  const days: string[] = []
  for (
    let cursor = Date.parse(`${startDate}T00:00:00Z`);
    cursor <= Date.parse(`${endDate}T00:00:00Z`);
    cursor += 86_400_000
  ) {
    days.push(new Date(cursor).toISOString().slice(0, 10))
  }

  const daySpecs = days
    .map((day) => {
      const dayStart = Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000)
      const targetEnd = dayStart + 86_399
      return {
        day,
        dayStart,
        targetEnd,
        periodEnd: Math.min(targetEnd, snapshotTimestamp),
      }
    })
    .filter(({ periodEnd }) => periodEnd >= deploymentTimestamp)
  const dayEndBlocks = await rpc.findBlocksAtOrBefore(
    daySpecs.map(({ periodEnd }) => periodEnd),
    snapshotBlock,
  )
  const dayEndBlockData = await rpc.batch<{ timestamp: string }>(
    dayEndBlocks.map((block) => ({
      method: "eth_getBlockByNumber",
      params: [toBlockHex(block), false],
    })),
  )
  const stateReads = await contractReadMany<CurrentState | BigNumber>(
    rpc,
    market.address,
    dayEndBlocks.flatMap((block) => [
      { functionName: "currentState", args: [], block },
      { functionName: "totalAssets", args: [], block },
      { functionName: "totalDebts", args: [], block },
      { functionName: "totalSupply", args: [], block },
    ]),
  )

  let previousRateState = {
    timestamp: deploymentTimestamp,
    annualInterestBips: asNumber(deploymentState.annualInterestBips),
    protocolFeeBips: asNumber(deploymentState.protocolFeeBips),
    isDelinquent: deploymentState.isDelinquent,
    timeDelinquent: asNumber(deploymentState.timeDelinquent),
  }
  let cumulativeBorrowed = 0n
  let cumulativeRepaid = 0n
  let previousTimestamp = deploymentTimestamp
  let previousScaleFactor = RAY
  if (preservedRows.length > 0) {
    const previousRow = preservedRows[preservedRows.length - 1]
    const previousBlock = Number(previousRow.snapshot_block)
    const previousState = await contractRead<CurrentState>(
      rpc,
      market.address,
      "currentState",
      [],
      previousBlock,
    )
    previousTimestamp = Math.floor(
      Date.parse(previousRow.snapshot_timestamp_utc) / 1_000,
    )
    previousScaleFactor = asBigInt(previousState.scaleFactor)
    cumulativeBorrowed = BigInt(previousRow.cumulative_borrowed_raw)
    cumulativeRepaid = BigInt(previousRow.cumulative_repaid_raw)
    previousRateState = {
      timestamp: previousTimestamp,
      annualInterestBips: asNumber(previousState.annualInterestBips),
      protocolFeeBips: asNumber(previousState.protocolFeeBips),
      isDelinquent: previousState.isDelinquent,
      timeDelinquent: asNumber(previousState.timeDelinquent),
    }
  }
  const rows: Record<string, string>[] = []
  for (const [
    index,
    { day, dayStart, targetEnd, periodEnd },
  ] of daySpecs.entries()) {
    const offset = index * 4
    const state = stateReads[offset] as CurrentState
    const totalAssetsValue = stateReads[offset + 1]
    const totalDebtsValue = stateReads[offset + 2]
    const totalSupplyValue = stateReads[offset + 3]
    const totalAssets = asBigInt(totalAssetsValue)
    const totalDebts = asBigInt(totalDebtsValue)
    const totalSupply = asBigInt(totalSupplyValue)
    const dailyTransactions = transactions.filter(
      (transaction) => isoDate(transaction.timestamp) === day,
    )
    const borrowed = dailyTransactions.reduce(
      (sum, row) => sum + row.borrowedRaw,
      0n,
    )
    const repaid = dailyTransactions.reduce(
      (sum, row) => sum + row.repaidRaw,
      0n,
    )
    cumulativeBorrowed += borrowed
    cumulativeRepaid += repaid
    const rowTimestamp = fromHex(dayEndBlockData[index].timestamp)
    const elapsed = Math.max(1, rowTimestamp - previousTimestamp)
    const fallbackState = { ...previousRateState }
    const fallbackRates = percentagesFromRateSeconds(
      advanceRateState(
        fallbackState,
        rowTimestamp,
        delinquencyFeeBips,
        gracePeriod,
      ),
      elapsed,
    )
    const dailyAccruals = aggregateAccrualsForDay(accruals, day)
    const baseApr =
      dailyAccruals.seconds > 0
        ? percentFromRay(dailyAccruals.baseRay, dailyAccruals.seconds)
        : fallbackRates.baseApr
    const penaltyApr =
      dailyAccruals.seconds > 0
        ? percentFromRay(dailyAccruals.penaltyRay, dailyAccruals.seconds)
        : fallbackRates.penaltyApr
    const protocolFeeApr =
      dailyAccruals.seconds > 0
        ? percentFromRay(dailyAccruals.protocolRay, dailyAccruals.seconds)
        : fallbackRates.protocolFeeApr
    const effectiveApr = addPercentages(baseApr, penaltyApr)
    const annualBips = asNumber(state.annualInterestBips)
    const protocolBips = asNumber(state.protocolFeeBips)
    if (
      dailyAccruals.events === 0 &&
      (fallbackState.annualInterestBips !== annualBips ||
        fallbackState.protocolFeeBips !== protocolBips ||
        fallbackState.isDelinquent !== state.isDelinquent ||
        fallbackState.timeDelinquent !== asNumber(state.timeDelinquent))
    ) {
      throw new Error(
        `Daily rate-state reconciliation failed for ${market.address} at block ${dayEndBlocks[index]}`,
      )
    }
    previousRateState = {
      timestamp: rowTimestamp,
      annualInterestBips: annualBips,
      protocolFeeBips: protocolBips,
      isDelinquent: state.isDelinquent,
      timeDelinquent: asNumber(state.timeDelinquent),
    }
    const scaleFactor = asBigInt(state.scaleFactor)
    if (scaleFactor < previousScaleFactor) {
      throw new Error(
        `Daily scale factor decreased at block ${dayEndBlocks[index]}`,
      )
    }
    const recomputedSupply = rayMul(
      asBigInt(state.scaledTotalSupply),
      scaleFactor,
    )
    if (recomputedSupply !== totalSupply) {
      throw new Error(
        `Daily total-supply identity failed at block ${dayEndBlocks[index]}`,
      )
    }
    const recomputedDebt =
      totalSupply +
      asBigInt(state.normalizedUnclaimedWithdrawals) +
      asBigInt(state.accruedProtocolFees)
    if (recomputedDebt !== totalDebts) {
      throw new Error(
        `Daily total-debt identity failed at block ${dayEndBlocks[index]}`,
      )
    }
    const realisedScaleApr = percentFromScaleFactors(
      previousScaleFactor,
      scaleFactor,
      elapsed,
    )
    const borrowedOutstanding = totalSupply - totalAssets
    const loanBalance = totalDebts > totalAssets ? totalDebts - totalAssets : 0n
    const amount = (value: bigint) => formatUnits(value, market.assetDecimals)
    const timeDelinquent = asNumber(state.timeDelinquent)
    const penaltyActive = timeDelinquent > gracePeriod
    rows.push({
      market_address: market.address,
      market_symbol: market.symbol,
      market_name: market.name,
      chain_id: String(market.chainId),
      asset_address: market.assetAddress,
      asset_symbol: market.assetSymbol,
      asset_decimals: String(market.assetDecimals),
      date_utc: day,
      snapshot_block: String(dayEndBlocks[index]),
      snapshot_timestamp_utc: isoTime(rowTimestamp),
      period_start_timestamp_utc: isoTime(previousTimestamp),
      period_elapsed_seconds: String(elapsed),
      is_partial_day: String(
        periodEnd !== targetEnd || deploymentTimestamp > dayStart,
      ),
      outstanding_principal: amount(totalSupply),
      outstanding_principal_raw: String(totalSupply),
      total_debt_obligation: amount(totalDebts),
      total_debt_obligation_raw: String(totalDebts),
      total_assets_held: amount(totalAssets),
      total_assets_held_raw: String(totalAssets),
      borrowed_outstanding: amount(borrowedOutstanding),
      borrowed_outstanding_raw: String(borrowedOutstanding),
      outstanding_loan_balance: amount(loanBalance),
      outstanding_loan_balance_raw: String(loanBalance),
      capacity: amount(asBigInt(state.maxTotalSupply)),
      capacity_raw: String(asBigInt(state.maxTotalSupply)),
      borrowed_during_day: amount(borrowed),
      borrowed_during_day_raw: String(borrowed),
      repaid_during_day: amount(repaid),
      repaid_during_day_raw: String(repaid),
      cumulative_borrowed: amount(cumulativeBorrowed),
      cumulative_borrowed_raw: String(cumulativeBorrowed),
      cumulative_repaid: amount(cumulativeRepaid),
      cumulative_repaid_raw: String(cumulativeRepaid),
      base_apr_bips_eod: String(annualBips),
      base_apr_pct_eod: percentFromBips(annualBips),
      base_apr_pct_time_weighted: baseApr,
      effective_apr_bips_eod: String(
        annualBips + (penaltyActive ? delinquencyFeeBips : 0),
      ),
      effective_apr_pct_eod: percentFromBips(
        annualBips + (penaltyActive ? delinquencyFeeBips : 0),
      ),
      penalty_apr_bips_nominal: String(delinquencyFeeBips),
      penalty_apr_pct_nominal: percentFromBips(delinquencyFeeBips),
      penalty_apr_pct_realised: penaltyApr,
      effective_lender_apr_pct_realised: effectiveApr,
      realized_lender_apr_pct_period: realisedScaleApr,
      protocol_fee_apr_pct: protocolFeeApr,
      borrower_all_in_apr_pct: addPercentages(effectiveApr, protocolFeeApr),
      protocol_fee_bips_eod: String(protocolBips),
      reserve_ratio_bips_eod: String(asNumber(state.reserveRatioBips)),
      is_delinquent_eod: String(state.isDelinquent),
      penalty_active_eod: String(penaltyActive),
      time_delinquent_seconds_eod: String(state.timeDelinquent),
      grace_period_seconds: String(gracePeriod),
      grace_period_hours: String(gracePeriod / 3600),
      withdrawal_cycle_seconds: String(withdrawalCycle),
      withdrawal_cycle_hours: String(withdrawalCycle / 3600),
      market_closed_eod: String(state.isClosed),
      accrual_events: String(dailyAccruals.events),
    })
    previousTimestamp = rowTimestamp
    previousScaleFactor = scaleFactor
  }
  return [...preservedRows, ...rows]
}

export async function buildPositionSummaries(
  rpc: ExportRpc,
  market: MarketMetadata,
  snapshotBlock: number,
  snapshotTimestamp: number,
  events: DecodedMarketEvent[],
  addresses: string[],
): Promise<Record<string, PositionSummary>> {
  const normalized = [
    ...new Set(addresses.map((address) => address.toLowerCase())),
  ]
  if (normalized.length === 0) return {}
  const batchScaledRemaining = new Map<number, bigint>()
  const batchNormalizedPaid = new Map<number, bigint>()
  for (const event of events) {
    if (event.name === "WithdrawalQueued") {
      const expiry = Number(event.args.expiry)
      batchScaledRemaining.set(
        expiry,
        (batchScaledRemaining.get(expiry) ?? 0n) +
          BigInt(String(event.args.scaledAmount)),
      )
    }
    if (event.name === "WithdrawalBatchPayment") {
      const expiry = Number(event.args.expiry)
      batchNormalizedPaid.set(
        expiry,
        (batchNormalizedPaid.get(expiry) ?? 0n) +
          BigInt(String(event.args.normalizedAmountPaid)),
      )
    }
  }
  const result: Record<string, PositionSummary> = {}
  for (const address of normalized) {
    let deposits = 0n
    let acquired = 0n
    let returned = 0n
    let transferredOut = 0n
    let transferValueOut = 0n
    let payouts = 0n
    let principal = 0n
    let scaledBalance = 0n
    let scaleFactor = RAY
    const queuedPrincipal = new Map<number, bigint>()
    const queuedScaled = new Map<number, bigint>()
    const queuedInitialScaled = new Map<number, bigint>()
    const executedByBatch = new Map<number, bigint>()
    const remainingByBatch = new Map<number, bigint>()
    const annualEarnings: Record<string, bigint> = {}
    for (const event of events) {
      if (event.name === "InterestAndFeesAccrued") {
        const baseRay = BigInt(String(event.args.baseInterestRay))
        const penaltyRay = BigInt(String(event.args.delinquencyFeeRay))
        const scaleDelta = rayMul(scaleFactor, baseRay + penaltyRay)
        const scaledEarningBalance =
          scaledBalance +
          [...queuedScaled.values()].reduce((sum, value) => sum + value, 0n)
        const earned = rayMul(scaledEarningBalance, scaleDelta)
        const year = new Date(
          Number(event.args.toTimestamp) * 1_000,
        ).getUTCFullYear()
        annualEarnings[String(year)] =
          (annualEarnings[String(year)] ?? 0n) + earned
        scaleFactor = BigInt(String(event.args.scaleFactor))
      } else if (event.name === "StateUpdated") {
        scaleFactor = BigInt(String(event.args.scaleFactor))
      }
      if (event.name === "WithdrawalQueued") {
        const expiry = Number(event.args.expiry)
        remainingByBatch.set(
          expiry,
          (remainingByBatch.get(expiry) ?? 0n) +
            BigInt(String(event.args.scaledAmount)),
        )
      }
      if (event.name === "Deposit" && event.participant === address) {
        const value = event.amountRaw ?? 0n
        deposits += value
        principal += value
        scaledBalance += BigInt(String(event.args.scaledAmount))
      }
      if (event.name === "Transfer") {
        const scaled = rayDiv(event.amountRaw ?? 0n, scaleFactor)
        if (
          event.participant === address &&
          event.counterparty !== zeroAddress &&
          event.counterparty !== market.address
        ) {
          const principalMoved =
            scaledBalance > 0n ? (principal * scaled) / scaledBalance : 0n
          principal -= principalMoved
          scaledBalance -= scaled
          transferredOut += principalMoved
          transferValueOut += event.amountRaw ?? 0n
        } else if (
          event.counterparty === address &&
          event.participant !== zeroAddress &&
          event.participant !== market.address
        ) {
          scaledBalance += scaled
          principal += event.amountRaw ?? 0n
          acquired += event.amountRaw ?? 0n
        }
      }
      if (event.name === "WithdrawalQueued" && event.participant === address) {
        const scaled = BigInt(String(event.args.scaledAmount))
        const principalMoved =
          scaledBalance > 0n ? (principal * scaled) / scaledBalance : 0n
        principal -= principalMoved
        scaledBalance -= scaled
        const expiry = Number(event.args.expiry)
        queuedPrincipal.set(
          expiry,
          (queuedPrincipal.get(expiry) ?? 0n) + principalMoved,
        )
        queuedScaled.set(expiry, (queuedScaled.get(expiry) ?? 0n) + scaled)
        queuedInitialScaled.set(
          expiry,
          (queuedInitialScaled.get(expiry) ?? 0n) + scaled,
        )
      }
      if (event.name === "WithdrawalBatchPayment") {
        const expiry = Number(event.args.expiry)
        const totalRemaining = remainingByBatch.get(expiry) ?? 0n
        const burned = BigInt(String(event.args.scaledAmountBurned))
        const holderRemaining = queuedScaled.get(expiry) ?? 0n
        if (totalRemaining > 0n && holderRemaining > 0n) {
          const holderBurned =
            burned === totalRemaining
              ? holderRemaining
              : (burned * holderRemaining) / totalRemaining
          queuedScaled.set(expiry, holderRemaining - holderBurned)
        }
        remainingByBatch.set(expiry, totalRemaining - burned)
      }
      if (
        event.name === "WithdrawalExecuted" &&
        event.participant === address
      ) {
        const value = event.amountRaw ?? 0n
        payouts += value
        const expiry = Number(event.args.expiry)
        executedByBatch.set(expiry, (executedByBatch.get(expiry) ?? 0n) + value)
      }
      if (event.name === "ForceBuyBack" && event.participant === address) {
        const scaled = BigInt(String(event.args.scaledAmount))
        const principalMoved =
          scaledBalance > 0n ? (principal * scaled) / scaledBalance : 0n
        principal -= principalMoved
        scaledBalance -= scaled
        returned += principalMoved
        payouts += event.amountRaw ?? 0n
      }
    }
    const [balance, onchainScaledBalance, snapshotState] = await Promise.all([
      contractRead<BigNumber>(
        rpc,
        market.address,
        "balanceOf",
        [address],
        snapshotBlock,
      ),
      contractRead<BigNumber>(
        rpc,
        market.address,
        "scaledBalanceOf",
        [address],
        snapshotBlock,
      ),
      contractRead<CurrentState>(
        rpc,
        market.address,
        "currentState",
        [],
        snapshotBlock,
      ),
    ])
    const currentValue = asBigInt(balance)
    const currentScaledBalance = asBigInt(onchainScaledBalance)
    const snapshotScaleFactor = asBigInt(snapshotState.scaleFactor)
    const recomputedValue = rayMul(currentScaledBalance, snapshotScaleFactor)
    if (recomputedValue !== currentValue) {
      throw new Error(
        `Position balance reconciliation failed for ${address} in ${market.address}`,
      )
    }
    if (currentScaledBalance !== scaledBalance) {
      throw new Error(
        `Position scaled-balance walk failed for ${address} in ${market.address}`,
      )
    }
    let pendingWithdrawalPrincipal = 0n
    let pendingWithdrawalValue = 0n
    for (const [expiry, originalPrincipal] of queuedPrincipal) {
      const totalScaled = batchScaledRemaining.get(expiry) ?? 0n
      const holderInitialScaled = queuedInitialScaled.get(expiry) ?? 0n
      const holderRemainingScaled = queuedScaled.get(expiry) ?? 0n
      const entitlement =
        totalScaled > 0n
          ? ((batchNormalizedPaid.get(expiry) ?? 0n) * holderInitialScaled) /
            totalScaled
          : 0n
      const holderBurnedScaled = holderInitialScaled - holderRemainingScaled
      const fundedPrincipal =
        holderInitialScaled > 0n
          ? (originalPrincipal * holderBurnedScaled) / holderInitialScaled
          : 0n
      const totalExecuted = executedByBatch.get(expiry) ?? 0n
      const executed = totalExecuted > entitlement ? entitlement : totalExecuted
      const principalReturned = proportionalPrincipalReturned(
        fundedPrincipal,
        executed,
        entitlement,
      )
      returned += principalReturned
      pendingWithdrawalPrincipal += originalPrincipal - principalReturned
      pendingWithdrawalValue +=
        entitlement > executed ? entitlement - executed : 0n
      pendingWithdrawalValue += rayMul(
        holderRemainingScaled,
        snapshotScaleFactor,
      )
    }
    const totalPositionValue = currentValue + pendingWithdrawalValue
    const earnings =
      totalPositionValue + payouts + transferValueOut - deposits - acquired
    const allocatedEarnings = Object.values(annualEarnings).reduce(
      (sum, value) => sum + value,
      0n,
    )
    const currentYear = new Date(snapshotTimestamp * 1000)
      .getUTCFullYear()
      .toString()
    annualEarnings[currentYear] =
      (annualEarnings[currentYear] ?? 0n) + earnings - allocatedEarnings
    const principalStillInvested = principal + pendingWithdrawalPrincipal
    const splitEarnings =
      payouts -
      returned +
      (transferValueOut - transferredOut) +
      (currentValue - principal) +
      (pendingWithdrawalValue - pendingWithdrawalPrincipal)
    if (earnings !== splitEarnings) {
      throw new Error(
        `Position earnings reconciliation failed for ${address} in ${market.address}`,
      )
    }
    if (
      deposits + acquired !==
      principalStillInvested + returned + transferredOut
    ) {
      throw new Error(
        `Position principal reconciliation failed for ${address} in ${market.address}`,
      )
    }
    result[address] = {
      address,
      depositsRaw: deposits,
      principalAcquiredByTransferRaw: acquired,
      activePrincipalRaw: principal,
      pendingWithdrawalPrincipalRaw: pendingWithdrawalPrincipal,
      principalStillInvestedRaw: principalStillInvested,
      principalReturnedRaw: returned,
      principalTransferredOutRaw: transferredOut,
      marketTokensTransferredOutRaw: transferValueOut,
      currentValueRaw: currentValue,
      pendingWithdrawalValueRaw: pendingWithdrawalValue,
      totalPositionValueRaw: totalPositionValue,
      payoutsRaw: payouts,
      earningsRaw: earnings,
      scaledBalanceRaw: currentScaledBalance,
      annualEarnings,
    }
  }
  return result
}

export type MarketDatasetBuildStage =
  | "reading_history"
  | "building_transactions"
  | "building_daily_history"
  | "checking_balances"
  | "finalizing_market_data"

const checkpointMarketFields: (keyof MarketMetadata)[] = [
  "chainId",
  "address",
  "controller",
  "removedAtBlock",
  "version",
  "borrower",
  "feeRecipient",
  "name",
  "symbol",
  "assetAddress",
  "assetName",
  "assetSymbol",
  "assetDecimals",
  "deploymentBlock",
]

export const isCompatibleMarketDatasetCheckpoint = (
  checkpoint: MarketDataset,
  market: MarketMetadata,
  targetBlock: number,
) =>
  checkpoint.pipelineVersion === EXPORT_PIPELINE_VERSION &&
  checkpoint.snapshotBlock < targetBlock &&
  checkpointMarketFields.every((field) => {
    const checkpointValue = checkpoint.market[field]
    const marketValue = market[field]
    return typeof checkpointValue === "string" &&
      typeof marketValue === "string"
      ? checkpointValue.toLowerCase() === marketValue.toLowerCase()
      : checkpointValue === marketValue
  })

export async function buildMarketDataset(
  rpc: ExportRpc,
  market: MarketMetadata,
  snapshotBlock: number,
  snapshotBlockHash: string,
  snapshotTimestamp: number,
  positionAddresses: string[],
  explorer?: ExportExplorer,
  onProgress?: (
    stage: MarketDatasetBuildStage,
    stageProgress?: number,
  ) => Promise<void>,
  checkpoint?: MarketDataset,
): Promise<MarketDataset> {
  const marketExplorer = explorer ?? etherscanExplorer
  const verifySnapshotBlock = async () => {
    const block = await rpc.getBlock(snapshotBlock)
    if (block.hash.toLowerCase() !== snapshotBlockHash.toLowerCase()) {
      throw new Error(
        `Snapshot block ${snapshotBlock} changed: expected ${snapshotBlockHash}, received ${block.hash}`,
      )
    }
  }
  const verifyCheckpointBlock = async () => {
    if (!checkpoint) return
    const block = await rpc.getBlock(checkpoint.snapshotBlock)
    if (
      block.hash.toLowerCase() !== checkpoint.snapshotBlockHash.toLowerCase() ||
      fromHex(block.timestamp) !== checkpoint.snapshotTimestamp
    ) {
      throw new Error(
        `Market-data checkpoint block ${checkpoint.snapshotBlock} is no longer canonical`,
      )
    }
  }
  if (checkpoint) {
    if (
      !isCompatibleMarketDatasetCheckpoint(checkpoint, market, snapshotBlock)
    ) {
      throw new Error(`Invalid market-data checkpoint for ${market.address}`)
    }
  }
  await Promise.all([verifyCheckpointBlock(), verifySnapshotBlock()])
  await onProgress?.("reading_history")
  const historyProgress = [0, 0, 0]
  let lastHistoryStep = 0
  let historyProgressUpdates = Promise.resolve()
  const reportHistoryProgress = (
    source: number,
    completed: number,
    total: number,
  ) => {
    historyProgress[source] = total === 0 ? 1 : completed / total
    const combined =
      historyProgress[0] * 0.7 +
      historyProgress[1] * 0.15 +
      historyProgress[2] * 0.15
    const step = Math.floor(combined * 20 + 1e-9)
    if (step <= lastHistoryStep) return historyProgressUpdates
    lastHistoryStep = step
    historyProgressUpdates = historyProgressUpdates.then(
      () => onProgress?.("reading_history", Math.min(step / 20, 1)),
    )
    return historyProgressUpdates
  }
  const historyFromBlock = checkpoint
    ? checkpoint.snapshotBlock + 1
    : market.deploymentBlock
  const [marketLogs, transfers, etherscanLogs] = await Promise.all([
    rpc.getLogs(
      {
        address: market.address,
        fromBlock: historyFromBlock,
        toBlock: snapshotBlock,
      },
      (completed, total) => reportHistoryProgress(0, completed, total),
    ),
    marketExplorer
      .getTransferLogsMentioningAddress(
        market.chainId,
        market.address,
        historyFromBlock,
        snapshotBlock,
      )
      .then((logs) =>
        verifyTransferCandidates(rpc, logs, market, snapshotBlock),
      )
      .then(async (result) => {
        await reportHistoryProgress(1, 1, 1)
        return result
      }),
    marketExplorer
      .getMarketLogs(
        market.chainId,
        market.address,
        historyFromBlock,
        snapshotBlock,
      )
      .then(async (logs) => {
        await reportHistoryProgress(2, 1, 1)
        return logs
      }),
  ])
  await historyProgressUpdates
  const { assetLogs, excludedLogs } = transfers
  const logComparison = compareMarketLogSources(
    market.address,
    marketLogs,
    etherscanLogs,
  )
  await onProgress?.("building_transactions")
  const allHashes = [
    ...new Set(
      [...marketLogs, ...assetLogs].map((log) =>
        log.transactionHash.toLowerCase(),
      ),
    ),
  ]
  const context = await fetchTransactionContext(rpc, allHashes)
  const timestamps = await fetchTimestamps(
    rpc,
    [...marketLogs, ...assetLogs, ...excludedLogs].map((log) =>
      fromHex(log.blockNumber),
    ),
  )
  const newEvents = decodeEvents(market, marketLogs, timestamps, context)
  const events = [...(checkpoint?.events ?? []), ...newEvents].sort(
    (a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex,
  )

  const rows = new Map<string, TransactionLedgerRow>()
  for (const hash of allHashes) {
    const item = context.get(hash)!
    rows.set(
      hash,
      emptyTransaction(
        market,
        item.transaction,
        item.receipt,
        timestamps.get(fromHex(item.transaction.blockNumber))!,
      ),
    )
  }
  for (const event of newEvents)
    addEventToTransaction(rows.get(event.transactionHash)!, event)

  const actualAssetFlow = new Map<
    string,
    { incoming: bigint; outgoing: bigint }
  >()
  for (const log of assetLogs) {
    const transfer = erc20Interface.parseLog(log)
    const hash = log.transactionHash.toLowerCase()
    const flow = actualAssetFlow.get(hash) ?? { incoming: 0n, outgoing: 0n }
    const from = asAddress(transfer.args.from)
    const to = asAddress(transfer.args.to)
    const value = asBigInt(transfer.args.value)
    if (to === market.address) flow.incoming += value
    if (from === market.address) flow.outgoing += value
    actualAssetFlow.set(hash, flow)
  }
  for (const [hash, flow] of actualAssetFlow) {
    const row = rows.get(hash)!
    const expectedIn = row.depositedRaw + row.repaidRaw
    const expectedOut =
      row.borrowedRaw +
      row.withdrawalExecutedRaw +
      row.feesCollectedRaw +
      row.escrowedOutRaw
    if (flow.incoming > expectedIn)
      row.untrackedAssetInRaw = flow.incoming - expectedIn
    if (flow.outgoing > expectedOut)
      row.untrackedAssetOutRaw = flow.outgoing - expectedOut
    if (row.events.length === 0) row.status = "success_asset_transfer_only"
  }

  const failedHashes = await marketExplorer.getDirectFailedTransactionHashes(
    market.chainId,
    market.address,
    historyFromBlock,
    snapshotBlock,
  )
  const [failedTransactions, failedReceipts] = await Promise.all([
    rpc.batch<JsonRpcTransaction | null>(
      failedHashes.map((hash) => ({
        method: "eth_getTransactionByHash",
        params: [hash],
      })),
    ),
    rpc.batch<JsonRpcReceipt | null>(
      failedHashes.map((hash) => ({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })),
    ),
  ])
  failedTransactions.forEach((transaction, index) => {
    const receipt = failedReceipts[index]
    const hash = failedHashes[index]
    if (
      !transaction ||
      !receipt ||
      transaction.hash.toLowerCase() !== hash ||
      receipt.transactionHash.toLowerCase() !== hash ||
      transaction.to?.toLowerCase() !== market.address ||
      receipt.status !== "0x0" ||
      transaction.blockNumber !== receipt.blockNumber ||
      transaction.transactionIndex !== receipt.transactionIndex ||
      fromHex(transaction.blockNumber) > snapshotBlock
    ) {
      throw new Error(`Invalid failed-transaction candidate ${hash}`)
    }
  })
  const failedTimestamps = await fetchTimestamps(
    rpc,
    failedTransactions.map((transaction) => fromHex(transaction!.blockNumber)),
  )
  for (let index = 0; index < failedHashes.length; index += 1) {
    const transaction = failedTransactions[index]!
    const receipt = failedReceipts[index]!
    const hash = transaction.hash.toLowerCase()
    if (rows.has(hash)) continue
    rows.set(hash, {
      ...emptyTransaction(
        market,
        transaction,
        receipt,
        failedTimestamps.get(fromHex(transaction.blockNumber))!,
      ),
      status: "failed",
      summary: "Direct market call reverted",
    })
  }

  const transactions = [...(checkpoint?.transactions ?? []), ...rows.values()]
    .map((row) => ({
      ...row,
      events: [...new Set(row.events)].map((event) => {
        const count = row.events.filter(
          (candidate) => candidate === event,
        ).length
        return count > 1 ? `${event} x ${count}` : event
      }),
      summary: row.summary || transactionSummary(row, market.assetDecimals),
    }))
    .sort(
      (a, b) =>
        a.blockNumber - b.blockNumber ||
        a.transactionIndex - b.transactionIndex,
    )

  const [
    delinquencyFeeValue,
    gracePeriodValue,
    withdrawalCycleValue,
    deploymentState,
  ] = await Promise.all([
    contractRead<BigNumber>(
      rpc,
      market.address,
      "delinquencyFeeBips",
      [],
      snapshotBlock,
    ),
    contractRead<BigNumber>(
      rpc,
      market.address,
      "delinquencyGracePeriod",
      [],
      snapshotBlock,
    ),
    contractRead<BigNumber>(
      rpc,
      market.address,
      "withdrawalBatchDuration",
      [],
      snapshotBlock,
    ),
    contractRead<CurrentState>(
      rpc,
      market.address,
      "currentState",
      [],
      market.deploymentBlock,
    ),
  ])
  await onProgress?.("building_daily_history")
  const delinquencyFeeBips = Number(delinquencyFeeValue)
  const gracePeriod = Number(gracePeriodValue)
  const withdrawalCycle = Number(withdrawalCycleValue)
  const interestAccruals = buildInterestAccruals(
    market,
    events,
    delinquencyFeeBips,
    {
      protocolFeeBips: asNumber(deploymentState.protocolFeeBips),
      isDelinquent: deploymentState.isDelinquent,
    },
  )
  const [
    dailySeries,
    positions,
    balanceValue,
    snapshotState,
    totalSupplyValue,
    totalDebtsValue,
  ] = await Promise.all([
    buildDailySeries(
      rpc,
      market,
      snapshotBlock,
      snapshotTimestamp,
      transactions,
      interestAccruals,
      deploymentState,
      delinquencyFeeBips,
      gracePeriod,
      withdrawalCycle,
      checkpoint,
    ),
    buildPositionSummaries(
      rpc,
      market,
      snapshotBlock,
      snapshotTimestamp,
      events,
      positionAddresses,
    ),
    erc20Read<BigNumber>(
      rpc,
      erc20Interface,
      market.assetAddress,
      "balanceOf",
      [market.address],
      snapshotBlock,
    ),
    contractRead<CurrentState>(
      rpc,
      market.address,
      "currentState",
      [],
      snapshotBlock,
    ),
    contractRead<BigNumber>(
      rpc,
      market.address,
      "totalSupply",
      [],
      snapshotBlock,
    ),
    contractRead<BigNumber>(
      rpc,
      market.address,
      "totalDebts",
      [],
      snapshotBlock,
    ),
  ])

  await onProgress?.("checking_balances")

  const expectedBalance = transactions.reduce(
    (sum, row) =>
      sum +
      row.depositedRaw +
      row.repaidRaw +
      row.untrackedAssetInRaw -
      row.borrowedRaw -
      row.withdrawalExecutedRaw -
      row.feesCollectedRaw -
      row.escrowedOutRaw -
      row.untrackedAssetOutRaw,
    0n,
  )
  const actualBalance = asBigInt(balanceValue)
  const difference = expectedBalance - actualBalance
  if (difference !== 0n) {
    throw new Error(
      `Asset-flow reconciliation failed for ${market.address}: ${difference} base units`,
    )
  }

  const walkedScaledSupply = events.reduce(applyScaledSupplyEvent, 0n)
  const onchainScaledSupply = asBigInt(snapshotState.scaledTotalSupply)
  if (walkedScaledSupply !== onchainScaledSupply) {
    throw new Error(
      `Scaled-supply reconciliation failed for ${market.address}: ${
        walkedScaledSupply - onchainScaledSupply
      } base units`,
    )
  }
  const computedTotalSupply = rayMul(
    walkedScaledSupply,
    asBigInt(snapshotState.scaleFactor),
  )
  const onchainTotalSupply = asBigInt(totalSupplyValue)
  if (computedTotalSupply !== onchainTotalSupply) {
    throw new Error(
      `Total-supply reconciliation failed for ${market.address}: ${
        computedTotalSupply - onchainTotalSupply
      } base units`,
    )
  }
  const computedTotalDebts =
    computedTotalSupply +
    asBigInt(snapshotState.normalizedUnclaimedWithdrawals) +
    asBigInt(snapshotState.accruedProtocolFees)
  const onchainTotalDebts = asBigInt(totalDebtsValue)
  if (computedTotalDebts !== onchainTotalDebts) {
    throw new Error(
      `Total-debt reconciliation failed for ${market.address}: ${
        computedTotalDebts - onchainTotalDebts
      } base units`,
    )
  }
  const marketClosedEvents = events.filter(
    (event) => event.name === "MarketClosed",
  )
  if (
    (snapshotState.isClosed && marketClosedEvents.length !== 1) ||
    (!snapshotState.isClosed && marketClosedEvents.length !== 0)
  ) {
    throw new Error(
      `MarketClosed provenance failed for ${market.address}: state=${String(
        snapshotState.isClosed,
      )}, events=${marketClosedEvents.length}`,
    )
  }

  await onProgress?.("finalizing_market_data")

  const priorExcludedTransfers = checkpoint?.manifest.excludedTransfers ?? []
  const foreignErc20Logs = excludedLogs.filter(
    (log) => foreignTransferKind(log) === "erc20",
  )
  const foreignTokens = [
    ...new Set([
      ...foreignErc20Logs.map((log) => log.address.toLowerCase()),
      ...priorExcludedTransfers
        .filter((transfer) => transfer.transfer_standard === "erc20")
        .map((transfer) => String(transfer.token_contract).toLowerCase()),
    ]),
  ]
  const foreignMetadata = new Map(
    await Promise.all(
      foreignTokens.map(
        async (token) =>
          [
            token,
            await foreignTokenMetadata(rpc, token, snapshotBlock),
          ] as const,
      ),
    ),
  )
  const newExcludedTransfers = excludedLogs.map((log) => {
    const token = log.address.toLowerCase()
    const kind = foreignTransferKind(log)
    const common = {
      market_address: market.address,
      market_symbol: market.symbol,
      timestamp_utc: isoTime(timestamps.get(fromHex(log.blockNumber))!),
      block_number: fromHex(log.blockNumber),
      tx_hash: log.transactionHash.toLowerCase(),
      log_index: fromHex(log.logIndex),
      token_contract: token,
      topics: log.topics,
      data: log.data,
      note: "Foreign token transfer; excluded from every market figure",
    }
    if (kind === "erc20") {
      const transfer = erc20Interface.parseLog(log)
      const metadata = foreignMetadata.get(token)!
      const raw = asBigInt(transfer.args.value)
      return {
        ...common,
        transfer_standard: "erc20",
        token_symbol_sanitized: metadata.symbol,
        from: asAddress(transfer.args.from),
        to: asAddress(transfer.args.to),
        claimed_amount: formatUnits(raw, metadata.decimals),
        claimed_amount_raw: String(raw),
        exclusion_reason:
          metadata.symbol.toLowerCase() === market.assetSymbol.toLowerCase()
            ? "spoofed_token"
            : "airdrop_spam",
      }
    }
    if (kind === "erc721") {
      return {
        ...common,
        transfer_standard: "erc721",
        from: asAddress(`0x${log.topics[1].slice(-40)}`),
        to: asAddress(`0x${log.topics[2].slice(-40)}`),
        token_id: String(BigInt(log.topics[3])),
        exclusion_reason: "nft_airdrop_spam",
      }
    }
    return {
      ...common,
      transfer_standard: "unknown",
      exclusion_reason: "malformed_transfer_event",
    }
  })
  const excludedTransfers = [
    ...priorExcludedTransfers,
    ...newExcludedTransfers,
  ].map((transfer) => {
    if (transfer.transfer_standard !== "erc20") return transfer
    const record = transfer as Record<string, unknown>
    const token = String(record.token_contract).toLowerCase()
    const metadata = foreignMetadata.get(token)!
    const raw = BigInt(String(record.claimed_amount_raw))
    return {
      ...transfer,
      token_symbol_sanitized: metadata.symbol,
      claimed_amount: formatUnits(raw, metadata.decimals),
      exclusion_reason:
        metadata.symbol.toLowerCase() === market.assetSymbol.toLowerCase()
          ? "spoofed_token"
          : "airdrop_spam",
    }
  })
  const delinquencyEpisodes = buildDelinquencyEpisodes(
    events,
    interestAccruals,
    gracePeriod,
    delinquencyFeeBips,
    snapshotTimestamp,
    asNumber(deploymentState.reserveRatioBips),
    {
      timestamp: asNumber(deploymentState.lastInterestAccruedTimestamp),
      isDelinquent: deploymentState.isDelinquent,
      timeDelinquent: asNumber(deploymentState.timeDelinquent),
    },
  )
  const protocolFeesByYearRaw = Object.fromEntries(
    [
      ...new Set(
        interestAccruals.map((row) =>
          String(new Date(row.periodEnd * 1_000).getUTCFullYear()),
        ),
      ),
    ]
      .sort()
      .map((year) => [
        year,
        String(
          interestAccruals
            .filter(
              (row) =>
                String(new Date(row.periodEnd * 1_000).getUTCFullYear()) ===
                year,
            )
            .reduce((sum, row) => sum + row.protocolFeesRaw, 0n),
        ),
      ]),
  )
  const totalDeposits = transactions.reduce(
    (sum, row) => sum + row.depositedRaw,
    0n,
  )
  const totalWithdrawals = transactions.reduce(
    (sum, row) => sum + row.withdrawalExecutedRaw,
    0n,
  )

  await Promise.all([verifyCheckpointBlock(), verifySnapshotBlock()])
  return {
    pipelineVersion: EXPORT_PIPELINE_VERSION,
    snapshotBlock,
    snapshotBlockHash: snapshotBlockHash.toLowerCase(),
    snapshotTimestamp,
    market,
    events,
    transactions,
    interestAccruals,
    dailySeries,
    positions,
    manifest: {
      reconciliation: {
        expectedAssetBalanceRaw: String(expectedBalance),
        actualAssetBalanceRaw: String(actualBalance),
        differenceRaw: "0",
        walkedScaledSupplyRaw: String(walkedScaledSupply),
        onchainScaledSupplyRaw: String(onchainScaledSupply),
        computedTotalSupplyRaw: String(computedTotalSupply),
        onchainTotalSupplyRaw: String(onchainTotalSupply),
        computedTotalDebtsRaw: String(computedTotalDebts),
        onchainTotalDebtsRaw: String(onchainTotalDebts),
        snapshotScaleFactorRay: String(snapshotState.scaleFactor),
      },
      excludedTransfers,
      delinquencyEpisodes,
      protocolFeesByYearRaw,
      netLenderFlowRaw: String(totalDeposits - totalWithdrawals),
      openWithdrawalClaimsRaw: String(
        snapshotState.normalizedUnclaimedWithdrawals,
      ),
      revertedTransactionCoverage: "direct_only",
      rpcProviders: [
        ...new Set([
          ...(checkpoint?.manifest.rpcProviders ?? []),
          ...rpc.usedProviderHosts,
        ]),
      ].sort(),
      crossChecks: {
        etherscanLogCount:
          (checkpoint?.manifest.crossChecks.etherscanLogCount ?? 0) +
          logComparison.explorerCount,
        rpcLogCount:
          (checkpoint?.manifest.crossChecks.rpcLogCount ?? 0) +
          logComparison.rpcCount,
        logSetsEqual: true,
        marketClosedEventCount: marketClosedEvents.length,
        ...(marketClosedEvents[0]
          ? { marketClosedBlock: marketClosedEvents[0].blockNumber }
          : {}),
      },
    },
  }
}
/* eslint-disable no-await-in-loop, no-continue, no-restricted-syntax */
