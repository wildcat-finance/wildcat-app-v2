/* eslint-disable no-restricted-syntax */

import { createHash } from "node:crypto"

import ExcelJS from "exceljs"
import {
  PDFDocument,
  PDFFont,
  PDFHexString,
  PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib"

import { formatFixed, formatUnits, RAY, rayDiv } from "../bigint"
import {
  CanonicalExportRequest,
  MarketDataset,
  PositionSummary,
} from "../types"

export type StatementBlock =
  | { type: "paragraph"; text: string; emphasis?: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }

export type StatementModel = {
  title: string
  metadata: [string, string][]
  lead: string
  sections: { title: string; blocks: StatementBlock[] }[]
  definitions: [string, string][]
}

const amount = (dataset: MarketDataset, value: bigint) =>
  `${formatUnits(value, dataset.market.assetDecimals)} ${
    dataset.market.assetSymbol
  }`

const transactionTotal = (
  transactions: MarketDataset["transactions"],
  field: keyof MarketDataset["transactions"][number],
) =>
  transactions.reduce((sum, row) => {
    const value = row[field]
    return sum + (typeof value === "bigint" ? value : 0n)
  }, 0n)

const latestDaily = (dataset: MarketDataset) =>
  dataset.dailySeries[dataset.dailySeries.length - 1] ?? {}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp * 1_000))

const formatDateTime = (timestamp: number) =>
  `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(timestamp * 1_000))} UTC`

const isoDate = (timestamp: number) =>
  new Date(timestamp * 1_000).toISOString().slice(0, 10)

type ReportingPeriod = {
  startDate: string
  endDate: string
  label: string
  isFullHistory: boolean
}

const reportingPeriod = (
  dataset: MarketDataset,
  request: CanonicalExportRequest,
): ReportingPeriod => {
  const deploymentDate =
    dataset.dailySeries[0]?.date_utc ??
    isoDate(dataset.events[0]?.timestamp ?? dataset.snapshotTimestamp)
  const snapshotDate = isoDate(dataset.snapshotTimestamp)
  const startDate = [request.dateFrom ?? deploymentDate, deploymentDate]
    .sort()
    .at(-1)!
  const endDate = [request.dateTo ?? snapshotDate, snapshotDate].sort()[0]
  const isFullHistory = !request.dateFrom && !request.dateTo
  const requestedCalendarYear = request.dateFrom?.match(/^(\d{4})-01-01$/)?.[1]
  const isYearToDate =
    requestedCalendarYear !== undefined &&
    request.dateTo === `${requestedCalendarYear}-12-31` &&
    snapshotDate.startsWith(`${requestedCalendarYear}-`) &&
    request.dateTo > snapshotDate

  return {
    startDate,
    endDate,
    isFullHistory,
    label: isFullHistory
      ? "Full history"
      : `${startDate} to ${endDate}${isYearToDate ? " (year to date)" : ""}`,
  }
}

const timestampInPeriod = (timestamp: number, period: ReportingPeriod) => {
  const date = isoDate(timestamp)
  return date >= period.startDate && date <= period.endDate
}

const completeYearInPeriod = (
  dataset: MarketDataset,
  year: string,
  period: ReportingPeriod,
) => {
  const datasetStart =
    dataset.dailySeries[0]?.date_utc ??
    isoDate(dataset.events[0]?.timestamp ?? dataset.snapshotTimestamp)
  const availableStart = [datasetStart, `${year}-01-01`].sort().at(-1)!
  const availableEnd = [
    isoDate(dataset.snapshotTimestamp),
    `${year}-12-31`,
  ].sort()[0]
  return period.startDate <= availableStart && period.endDate >= availableEnd
}

const episodeInPeriod = (
  episode: MarketDataset["manifest"]["delinquencyEpisodes"][number],
  period: ReportingPeriod,
) =>
  isoDate(episode.onsetTimestamp) <= period.endDate &&
  (!episode.cureTimestamp || isoDate(episode.cureTimestamp) >= period.startDate)

const formatHours = (seconds: number) =>
  `${formatFixed((BigInt(seconds) * 10n + 1_800n) / 3_600n, 1)} hours`

const interestTotal = (accruals: MarketDataset["interestAccruals"]) =>
  accruals.reduce(
    (sum, row) =>
      sum + row.baseInterestAssetsRaw + row.penaltyInterestAssetsRaw,
    0n,
  )

const lenderSummary = (dataset: MarketDataset) => {
  const balances = new Map<string, bigint>()
  const depositors = new Set<string>()
  let scaleFactor = RAY
  for (const event of dataset.events) {
    if (
      event.name === "InterestAndFeesAccrued" ||
      event.name === "StateUpdated"
    ) {
      if (event.args.scaleFactor)
        scaleFactor = BigInt(String(event.args.scaleFactor))
    }
    if (event.name === "Deposit" && event.participant) {
      depositors.add(event.participant)
      balances.set(
        event.participant,
        (balances.get(event.participant) ?? 0n) +
          BigInt(String(event.args.scaledAmount)),
      )
    }
    if (event.name === "WithdrawalQueued" && event.participant) {
      balances.set(
        event.participant,
        (balances.get(event.participant) ?? 0n) -
          BigInt(String(event.args.scaledAmount)),
      )
    }
    if (event.name === "ForceBuyBack" && event.participant) {
      balances.set(
        event.participant,
        (balances.get(event.participant) ?? 0n) -
          BigInt(String(event.args.scaledAmount)),
      )
    }
    if (
      event.name === "Transfer" &&
      event.participant &&
      event.counterparty &&
      !event.participant.endsWith("0000000000000000000000000000000000000000") &&
      !event.counterparty.endsWith(
        "0000000000000000000000000000000000000000",
      ) &&
      event.participant !== dataset.market.address &&
      event.counterparty !== dataset.market.address
    ) {
      const scaled = rayDiv(event.amountRaw ?? 0n, scaleFactor)
      balances.set(
        event.participant,
        (balances.get(event.participant) ?? 0n) - scaled,
      )
      balances.set(
        event.counterparty,
        (balances.get(event.counterparty) ?? 0n) + scaled,
      )
    }
  }
  const active = [...balances.values()].filter((value) => value > 0n)
  const totalScaled = active.reduce((sum, value) => sum + value, 0n)
  const largest = active.reduce(
    (maximum, value) => (value > maximum ? value : maximum),
    0n,
  )
  const largestShare =
    totalScaled === 0n
      ? "0.0"
      : formatFixed((largest * 1_000n + totalScaled / 2n) / totalScaled, 1)
  return {
    active: active.length,
    holders: balances.size,
    depositors: depositors.size,
    largestShare,
  }
}

const commonMetadata = (dataset: MarketDataset): [string, string][] => [
  ["Market", `${dataset.market.name} (${dataset.market.symbol})`],
  [
    "Data as of",
    `${formatDateTime(dataset.snapshotTimestamp)} (block ${
      dataset.snapshotBlock
    })`,
  ],
]

const commonDefinitions: [string, string][] = [
  ["Owed to lenders", "The current total value of lender market tokens."],
  [
    "Liquid reserves",
    "Underlying assets held by the market and available for withdrawals.",
  ],
  [
    "APR",
    "An annualised percentage rate; realised period rates are weighted by elapsed seconds.",
  ],
  ["Position value", "The current on-chain value of market tokens."],
  [
    "Pending withdrawal value",
    "The funded claim plus the current value of market tokens still waiting in a withdrawal batch.",
  ],
  [
    "Principal",
    "Deposited value before earned interest, allocated proportionally when money leaves.",
  ],
  [
    "Interest",
    "The increase in lender debt produced by the market scale factor.",
  ],
  ["Delinquent", "Liquid reserves are below the required reserve ratio."],
  [
    "Penalty rate",
    "Extra lender interest applied after delinquency exceeds the grace period.",
  ],
  [
    "Grace period",
    "How long delinquency can continue before the penalty rate starts.",
  ],
  [
    "Capacity",
    "The maximum total lender debt the borrower permits; zero blocks new deposits.",
  ],
  [
    "Withdrawal batch",
    "Withdrawal requests grouped within one cycle and paid proportionally if reserves are short.",
  ],
  [
    "Open withdrawal claims",
    "Paid batch assets that lenders have not yet collected.",
  ],
  [
    "Deposit",
    "Underlying assets supplied to the market in exchange for market tokens.",
  ],
  ["Withdrawal", "A request to redeem market tokens for underlying assets."],
  [
    "Earnings",
    "Current value and payouts above acquired principal under the stated convention.",
  ],
  ["Depositor", "An address that supplied underlying assets directly."],
  [
    "Position holder",
    "An address that held market tokens, whether by deposit or transfer.",
  ],
]

export function marketConditionStatement(
  dataset: MarketDataset,
  request: CanonicalExportRequest,
): StatementModel {
  const period = reportingPeriod(dataset, request)
  const transactions = dataset.transactions.filter((transaction) =>
    timestampInPeriod(transaction.timestamp, period),
  )
  const accruals = dataset.interestAccruals.filter((accrual) =>
    timestampInPeriod(accrual.periodEnd, period),
  )
  const daily = latestDaily(dataset)
  const episodes = dataset.manifest.delinquencyEpisodes.filter((episode) =>
    episodeInPeriod(episode, period),
  )
  const exceededGrace = episodes.filter(
    (episode) => episode.durationSeconds > episode.gracePeriodSeconds,
  )
  const withPenaltyInterest = episodes.filter(
    (episode) => episode.penaltyInterestAssetsRaw > 0n,
  )
  const curedWithinGrace = episodes.filter(
    (episode) =>
      !episode.isOpen && episode.durationSeconds <= episode.gracePeriodSeconds,
  )
  const openWithinGrace = episodes.filter(
    (episode) =>
      episode.isOpen && episode.durationSeconds <= episode.gracePeriodSeconds,
  )
  const lenders = lenderSummary(dataset)
  const requested = transactionTotal(transactions, "withdrawalQueuedRaw")
  const paid = transactionTotal(transactions, "withdrawalExecutedRaw")
  const reserves = BigInt(daily.total_assets_held_raw ?? "0")
  const owed = BigInt(daily.outstanding_principal_raw ?? "0")
  const reservePercent =
    owed === 0n
      ? "0.00"
      : formatFixed((reserves * 10_000n + owed / 2n) / owed, 2)
  const capacityZero = daily.capacity_raw === "0"
  const capacityChanges = dataset.events.filter(
    (event) => event.name === "MaxTotalSupplyUpdated",
  ).length
  const servicingRepayment = transactions
    .filter((transaction) =>
      transaction.events.some((event) =>
        event.startsWith("WithdrawalBatchPayment"),
      ),
    )
    .reduce(
      (maximum, transaction) =>
        transaction.repaidRaw > maximum ? transaction.repaidRaw : maximum,
      0n,
    )
  let penaltyStatus = "Not active"
  if (daily.penalty_active_eod === "true") {
    penaltyStatus =
      daily.is_delinquent_eod === "true"
        ? "Active"
        : "Active while the cured delinquency timer unwinds"
  }
  return {
    title: "Market Condition Statement",
    metadata: [...commonMetadata(dataset), ["Reporting period", period.label]],
    lead: `The market owes lenders ${daily.outstanding_principal} ${dataset.market.assetSymbol} and holds ${daily.total_assets_held} ${dataset.market.assetSymbol} in liquid reserves (${reservePercent}% of the amount owed).`,
    sections: [
      {
        title: "Condition at a glance",
        blocks: [
          {
            type: "table",
            headers: ["Measure", "Reading"],
            rows: [
              ["Current lender rate", `${daily.effective_apr_pct_eod}% APR`],
              [
                "Delinquency status",
                daily.is_delinquent_eod === "true"
                  ? "Delinquent"
                  : "Not delinquent",
              ],
              ["Penalty status", penaltyStatus],
              ["Capacity", `${daily.capacity} ${dataset.market.assetSymbol}`],
              [
                "Open withdrawal claims",
                amount(
                  dataset,
                  BigInt(dataset.manifest.openWithdrawalClaimsRaw),
                ),
              ],
              [
                "Lenders",
                `${lenders.active} active; ${lenders.holders} addresses held a position and ${lenders.depositors} deposited directly; largest active position ${lenders.largestShare}%`,
              ],
            ],
          },
          {
            type: "paragraph",
            emphasis: true,
            text: capacityZero
              ? `This reads as a market in wind-down: capacity is zero after ${capacityChanges} on-chain capacity change(s), so new deposits are closed.`
              : "This market remains open to deposits within its stated capacity.",
          },
        ],
      },
      {
        title: period.isFullHistory
          ? "History that matters"
          : "History in the reporting period",
        blocks: [
          {
            type: "paragraph",
            text: `Delinquency: ${episodes.length} episode(s)${
              period.isFullHistory ? "." : " overlapped the reporting period."
            } ${curedWithinGrace.length} cured within the ${
              daily.grace_period_hours
            }-hour grace period; ${
              exceededGrace.length
            } ran longer than the grace period; ${
              withPenaltyInterest.length
            } included ${daily.penalty_apr_pct_nominal}% penalty-rate accrual${
              withPenaltyInterest.length
                ? ` (${withPenaltyInterest
                    .map((episode) => formatHours(episode.durationSeconds))
                    .join(", ")})`
                : ""
            }.${
              openWithinGrace.length
                ? ` ${openWithinGrace.length} remained open within the grace period at the snapshot.`
                : ""
            }`,
          },
          {
            type: "paragraph",
            text: `Withdrawals${
              period.isFullHistory ? "" : " during the reporting period"
            }: lenders requested ${amount(
              dataset,
              requested,
            )} and were paid ${amount(dataset, paid)}.${
              period.isFullHistory
                ? " The difference includes interest earned while requests waited and any still-unpaid requests."
                : " Period payments can settle earlier requests, and period requests can be paid later."
            }${
              servicingRepayment > 0n
                ? ` The largest repayment made while servicing a withdrawal batch was ${amount(
                    dataset,
                    servicingRepayment,
                  )}.`
                : ""
            }`,
          },
          {
            type: "table",
            headers: [
              period.isFullHistory ? "Lifetime flow" : "Reporting-period flow",
              dataset.market.assetSymbol,
            ],
            rows: [
              [
                "Deposits received",
                amount(dataset, transactionTotal(transactions, "depositedRaw")),
              ],
              [
                "Drawn by borrower",
                amount(dataset, transactionTotal(transactions, "borrowedRaw")),
              ],
              [
                "Repaid by borrower",
                amount(dataset, transactionTotal(transactions, "repaidRaw")),
              ],
              ["Paid to lenders", amount(dataset, paid)],
              [
                "Interest recorded at market updates",
                amount(dataset, interestTotal(accruals)),
              ],
            ],
          },
          {
            type: "paragraph",
            text: `${dataset.manifest.excludedTransfers.length} unrelated foreign-token transfer(s) across the complete market history were quarantined and excluded from every figure; data/manifest.json lists each one.`,
          },
        ],
      },
    ],
    definitions: commonDefinitions.filter(([term]) =>
      [
        "Owed to lenders",
        "Liquid reserves",
        "APR",
        "Position value",
        "Delinquent",
        "Penalty rate",
        "Grace period",
        "Capacity",
        "Withdrawal batch",
        "Open withdrawal claims",
        "Depositor",
        "Position holder",
      ].includes(term),
    ),
  }
}

const monthKey = (timestamp: number) =>
  new Date(timestamp * 1_000).toISOString().slice(0, 7)

const percentageMillionths = (value: string) => {
  const [whole, fraction = ""] = value.split(".")
  return (
    BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0").slice(0, 6))
  )
}

const weightedDailyPercentage = (
  dataset: MarketDataset,
  period: ReportingPeriod,
  month: string,
  field: string,
) => {
  const rows = dataset.dailySeries.filter(
    (row) =>
      row.date_utc.startsWith(month) &&
      row.date_utc >= period.startDate &&
      row.date_utc <= period.endDate,
  )
  const seconds = rows.reduce(
    (sum, row) => sum + BigInt(row.period_elapsed_seconds),
    0n,
  )
  if (seconds === 0n) return "0.000000"
  const weighted = rows.reduce(
    (sum, row) =>
      sum +
      percentageMillionths(row[field]) * BigInt(row.period_elapsed_seconds),
    0n,
  )
  return formatFixed((weighted + seconds / 2n) / seconds, 6)
}

function borrowerMonthlyRows(dataset: MarketDataset, period: ReportingPeriod) {
  const first = period.startDate.slice(0, 7)
  const last = period.endDate.slice(0, 7)
  const months: string[] = []
  const cursor = new Date(`${first}-01T00:00:00Z`)
  const end = new Date(`${last}-01T00:00:00Z`)
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 7))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months.map((month) => {
    const transactions = dataset.transactions.filter(
      (row) =>
        monthKey(row.timestamp) === month &&
        timestampInPeriod(row.timestamp, period),
    )
    const accruals = dataset.interestAccruals.filter(
      (row) =>
        monthKey(row.periodEnd) === month &&
        timestampInPeriod(row.periodEnd, period),
    )
    const flow = (field: keyof MarketDataset["transactions"][number]) =>
      transactions.reduce((sum, row) => {
        const value = row[field]
        return sum + (typeof value === "bigint" ? value : 0n)
      }, 0n)
    const interest = accruals.reduce(
      (sum, row) =>
        sum + row.baseInterestAssetsRaw + row.penaltyInterestAssetsRaw,
      0n,
    )
    return [
      month,
      amount(dataset, flow("borrowedRaw")),
      amount(dataset, flow("repaidRaw")),
      amount(dataset, flow("depositedRaw")),
      amount(dataset, flow("withdrawalExecutedRaw")),
      amount(dataset, interest),
      `${weightedDailyPercentage(
        dataset,
        period,
        month,
        "base_apr_pct_time_weighted",
      )}%`,
    ]
  })
}

const borrowerAnnualRows = (
  dataset: MarketDataset,
  period: ReportingPeriod,
) => {
  const periodAccruals = dataset.interestAccruals.filter((row) =>
    timestampInPeriod(row.periodEnd, period),
  )
  const years = [
    ...new Set(
      periodAccruals.map((row) =>
        String(new Date(row.periodEnd * 1_000).getUTCFullYear()),
      ),
    ),
  ].sort()
  return years.map((year) => {
    const accruals = periodAccruals.filter(
      (row) =>
        String(new Date(row.periodEnd * 1_000).getUTCFullYear()) === year,
    )
    return [
      year,
      amount(
        dataset,
        accruals.reduce(
          (sum, row) =>
            sum + row.baseInterestAssetsRaw + row.penaltyInterestAssetsRaw,
          0n,
        ),
      ),
      amount(
        dataset,
        accruals.reduce((sum, row) => sum + row.protocolFeesRaw, 0n),
      ),
    ]
  })
}

export function borrowerStatement(
  dataset: MarketDataset,
  request: CanonicalExportRequest,
): StatementModel {
  const period = reportingPeriod(dataset, request)
  const transactions = dataset.transactions.filter((transaction) =>
    timestampInPeriod(transaction.timestamp, period),
  )
  const accruals = dataset.interestAccruals.filter((accrual) =>
    timestampInPeriod(accrual.periodEnd, period),
  )
  const daily = latestDaily(dataset)
  const lenders = lenderSummary(dataset)
  const fees = accruals.reduce((sum, row) => sum + row.protocolFeesRaw, 0n)
  const episodes = dataset.manifest.delinquencyEpisodes.filter((episode) =>
    episodeInPeriod(episode, period),
  )
  const excludedTransfers = dataset.manifest.excludedTransfers.filter((row) => {
    const timestamp = row.timestamp_utc
    return (
      typeof timestamp === "string" &&
      timestamp.slice(0, 10) >= period.startDate &&
      timestamp.slice(0, 10) <= period.endDate
    )
  })
  const failedTransactions = transactions.filter(
    (row) => row.status === "failed",
  )
  return {
    title: "Borrower Market Statement",
    metadata: [
      ...commonMetadata(dataset),
      ["Prepared for", "Borrower"],
      ["Period", period.label],
    ],
    lead: `You currently owe lenders ${daily.outstanding_principal} ${dataset.market.assetSymbol}. The market holds ${daily.total_assets_held} ${dataset.market.assetSymbol} in liquid reserves.`,
    sections: [
      {
        title: period.isFullHistory
          ? "Activity since market creation"
          : "Activity in the reporting period",
        blocks: [
          {
            type: "table",
            headers: ["Measure", dataset.market.assetSymbol],
            rows: [
              [
                "Deposits received",
                amount(dataset, transactionTotal(transactions, "depositedRaw")),
              ],
              [
                "Loans drawn",
                amount(dataset, transactionTotal(transactions, "borrowedRaw")),
              ],
              [
                "Repayments",
                amount(dataset, transactionTotal(transactions, "repaidRaw")),
              ],
              [
                "Paid to lenders",
                amount(
                  dataset,
                  transactionTotal(transactions, "withdrawalExecutedRaw"),
                ),
              ],
              [
                "Interest recorded at market updates",
                amount(dataset, interestTotal(accruals)),
              ],
              ["Protocol fees recorded", amount(dataset, fees)],
            ],
          },
          ...(period.isFullHistory
            ? []
            : [
                {
                  type: "paragraph" as const,
                  text: "Complete-history totals remain available in data/manifest.json and the full-history CSV files.",
                },
              ]),
        ],
      },
      {
        title: "Month by month",
        blocks: [
          {
            type: "table",
            headers: [
              "Month",
              "Loans drawn",
              "Repaid",
              "Lender deposits",
              "Paid to lenders",
              "Interest recorded",
              "Time-weighted base APR",
            ],
            rows: borrowerMonthlyRows(dataset, period),
          },
        ],
      },
      {
        title: period.isFullHistory
          ? "Obligations by calendar year"
          : "Obligations in the reporting period",
        blocks: [
          {
            type: "table",
            headers: [
              "Year",
              "Lender interest recorded",
              "Protocol fees recorded",
            ],
            rows: borrowerAnnualRows(dataset, period),
          },
        ],
      },
      {
        title: "Things worth knowing",
        blocks: [
          {
            type: "paragraph",
            text: `${episodes.length} delinquency episode(s)${
              period.isFullHistory ? "" : " overlapped the reporting period"
            }; ${
              episodes.filter(
                (episode) =>
                  episode.durationSeconds > episode.gracePeriodSeconds,
              ).length
            } ran longer than the grace period and ${
              episodes.filter(
                (episode) => episode.penaltyInterestAssetsRaw > 0n,
              ).length
            } included penalty interest.`,
          },
          {
            type: "paragraph",
            text: `Across the market's complete history, ${lenders.depositors} addresses deposited directly and ${lenders.holders} addresses held a position through a deposit or transfer; ${lenders.active} currently hold market tokens.`,
          },
          {
            type: "paragraph",
            text: `${excludedTransfers.length} unrelated foreign-token transfer(s) in the reporting period were excluded. ${failedTransactions.length} reverted direct market call(s) in the reporting period remain visible with empty flow fields.`,
          },
          {
            type: "paragraph",
            text: "Repayments blend principal and interest on chain. This statement does not silently impose FIFO or LIFO accounting.",
          },
        ],
      },
    ],
    definitions: [
      ...commonDefinitions,
      [
        "Loans drawn",
        "Underlying assets moved out of the market by the borrower.",
      ],
      ["Repaid", "Underlying assets sent back into the market."],
      [
        "Paid to lenders",
        "Withdrawal assets actually transferred, including both principal and interest.",
      ],
      [
        "Protocol fees",
        "Fees accrued to the protocol fee recipient rather than lenders.",
      ],
      [
        "Recorded interest and fees",
        "Amounts emitted by market accrual events. The current amount owed also includes interest accumulated after the latest event through the statement snapshot.",
      ],
      [
        "Time-weighted APR",
        "The annualised rate weighted by the seconds each rate applied during the period.",
      ],
    ],
  }
}

export function positionStatement(
  dataset: MarketDataset,
  position: PositionSummary,
  request: CanonicalExportRequest,
): StatementModel {
  const period = reportingPeriod(dataset, request)
  const daily = latestDaily(dataset)
  const totalSupply = BigInt(daily.outstanding_principal_raw ?? "0")
  const share =
    totalSupply === 0n
      ? "0.0"
      : formatFixed(
          (position.currentValueRaw * 1_000n + totalSupply / 2n) / totalSupply,
          1,
        )
  const interestPaid = position.payoutsRaw - position.principalReturnedRaw
  const interestTransferred =
    position.marketTokensTransferredOutRaw - position.principalTransferredOutRaw
  const activeInterest = position.currentValueRaw - position.activePrincipalRaw
  const pendingInterest =
    position.pendingWithdrawalValueRaw - position.pendingWithdrawalPrincipalRaw
  const activities = dataset.events
    .filter(
      (event) =>
        (event.participant === position.address ||
          event.counterparty === position.address) &&
        timestampInPeriod(event.timestamp, period),
    )
    .filter((event) =>
      [
        "Deposit",
        "WithdrawalQueued",
        "WithdrawalExecuted",
        "ForceBuyBack",
        "Transfer",
        "AccountSanctioned",
        "SanctionedAccountAssetsSentToEscrow",
        "SanctionedAccountWithdrawalSentToEscrow",
      ].includes(event.name),
    )
    .filter(
      (event) =>
        event.name !== "Transfer" ||
        (event.participant !== "0x0000000000000000000000000000000000000000" &&
          event.counterparty !== "0x0000000000000000000000000000000000000000" &&
          event.participant !== dataset.market.address &&
          event.counterparty !== dataset.market.address),
    )
    .map((event) => [
      formatDate(event.timestamp),
      event.name,
      event.amountRaw === undefined ? "" : amount(dataset, event.amountRaw),
    ])
  const annual = Object.entries(position.annualEarnings)
    .filter(([year]) => completeYearInPeriod(dataset, year, period))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([year, value]) => [year, amount(dataset, value)])
  const principalIn =
    position.depositsRaw + position.principalAcquiredByTransferRaw
  const principalOut =
    position.principalStillInvestedRaw +
    position.principalReturnedRaw +
    position.principalTransferredOutRaw
  const requested = dataset.events
    .filter(
      (event) =>
        event.name === "WithdrawalQueued" &&
        event.participant === position.address,
    )
    .reduce((sum, event) => sum + (event.amountRaw ?? 0n), 0n)
  const payoutExcess = position.payoutsRaw - requested
  const opened = dataset.events.find(
    (event) =>
      event.participant === position.address ||
      event.counterparty === position.address,
  )
  return {
    title: "Position Statement",
    metadata: [
      ...commonMetadata(dataset),
      ["Position address", position.address],
      [
        "Position opened",
        opened ? formatDate(opened.timestamp) : "No activity",
      ],
      ["Reporting period", period.label],
    ],
    lead: `Your total position is currently worth ${amount(
      dataset,
      position.totalPositionValueRaw,
    )}: ${amount(
      dataset,
      position.currentValueRaw,
    )} in active market tokens and ${amount(
      dataset,
      position.pendingWithdrawalValueRaw,
    )} in pending withdrawal claims. Your active market tokens represent ${share}% of the current market-token supply.`,
    sections: [
      {
        title: "What you have earned",
        blocks: [
          {
            type: "paragraph",
            emphasis: true,
            text: `Total earnings since this address joined are ${amount(
              dataset,
              position.earningsRaw,
            )}.`,
          },
          {
            type: "table",
            headers: ["Calendar year", "Earnings"],
            rows: annual.length
              ? annual
              : [
                  [
                    "—",
                    period.isFullHistory
                      ? "No earnings activity"
                      : "No complete calendar year in this reporting period",
                  ],
                ],
          },
          {
            type: "table",
            headers: ["Earnings split", dataset.market.assetSymbol],
            rows: [
              ["Paid out in cash", amount(dataset, interestPaid)],
              [
                "Transferred with market tokens",
                amount(dataset, interestTransferred),
              ],
              [
                "Still in active market tokens",
                amount(dataset, activeInterest),
              ],
              [
                "In pending withdrawal claims",
                amount(dataset, pendingInterest),
              ],
            ],
          },
          {
            type: "table",
            headers: ["Principal status", dataset.market.assetSymbol],
            rows: [
              ["Active", amount(dataset, position.activePrincipalRaw)],
              [
                "Pending withdrawal",
                amount(dataset, position.pendingWithdrawalPrincipalRaw),
              ],
              [
                "Still invested in total",
                amount(dataset, position.principalStillInvestedRaw),
              ],
            ],
          },
        ],
      },
      {
        title: period.isFullHistory
          ? "Your activity"
          : "Your activity in the reporting period",
        blocks: [
          {
            type: "table",
            headers: ["Date", "What happened", "Amount"],
            rows: activities.length
              ? activities
              : [["—", "This address never touched this market", ""]],
          },
        ],
      },
      {
        title: "Checks",
        blocks: [
          {
            type: "paragraph",
            text: `${amount(dataset, principalIn)} acquired = ${amount(
              dataset,
              principalOut,
            )} still invested, returned, or transferred out.`,
          },
          ...(requested > 0n
            ? [
                {
                  type: "paragraph" as const,
                  text: `The difference between withdrawal payouts and requested amounts is ${amount(
                    dataset,
                    payoutExcess,
                  )}; a positive difference is interest earned while requests waited, while a negative difference remains unpaid at this snapshot.`,
                },
              ]
            : []),
          {
            type: "paragraph",
            text: "Withdrawal and transfer principal/interest splits use a proportional convention. Transfers do not imply the recipient's purchase price; another accounting policy may differ.",
          },
        ],
      },
    ],
    definitions: [
      ...commonDefinitions,
      [
        "Earnings paid out",
        "Withdrawal proceeds above the principal proportion allocated to that payout.",
      ],
      [
        "Earnings transferred",
        "Value above allocated principal embodied in market tokens sent to another address; it is not a cash payment.",
      ],
      [
        "Earnings still active",
        "Current active market-token value above the principal allocated to those tokens.",
      ],
      [
        "Earnings pending withdrawal",
        "Current pending claim value above the principal allocated to that claim.",
      ],
      [
        "Transfer",
        "A movement of market tokens between addresses, distinct from a deposit or withdrawal.",
      ],
      [
        "Proportional convention",
        "Principal and earnings leave in the same proportion as the position immediately before the movement.",
      ],
    ],
  }
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const PDF_MARGIN = 38
const PDF_FOOTER_HEIGHT = 18
const PDF_TEXT = rgb(0.09, 0.09, 0.11)
const PDF_MUTED = rgb(0.37, 0.39, 0.44)
const PDF_RULE = rgb(0.86, 0.87, 0.89)
const PDF_PANEL = rgb(0.96, 0.96, 0.97)

const splitPdfWord = (
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) => {
  const chunks: string[] = []
  let chunk = ""
  for (const character of word) {
    const candidate = `${chunk}${character}`
    if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      chunks.push(chunk)
      chunk = character
    } else {
      chunk = candidate
    }
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

const wrapPdfText = (
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) =>
  text.split("\n").flatMap((paragraph) => {
    const lines: string[] = []
    let line = ""
    const words = paragraph
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((word) =>
        font.widthOfTextAtSize(word, size) > maxWidth
          ? splitPdfWord(word, font, size, maxWidth)
          : [word],
      )
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
    return lines
  })

export async function renderPdf(model: StatementModel, timestamp: number) {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const contentWidth = A4_WIDTH - PDF_MARGIN * 2
  const pageBottom = PDF_MARGIN + PDF_FOOTER_HEIGHT
  let page: PDFPage = document.addPage([A4_WIDTH, A4_HEIGHT])
  let y = A4_HEIGHT - PDF_MARGIN

  const addPage = () => {
    page = document.addPage([A4_WIDTH, A4_HEIGHT])
    y = A4_HEIGHT - PDF_MARGIN
  }
  const ensureSpace = (height: number) => {
    if (y - height < pageBottom) addPage()
  }
  const drawLines = (
    lines: string[],
    options: {
      font: PDFFont
      size: number
      lineHeight: number
      x?: number
      color?: ReturnType<typeof rgb>
      after?: number
    },
  ) => {
    for (const line of lines) {
      ensureSpace(options.lineHeight)
      page.drawText(line, {
        x: options.x ?? PDF_MARGIN,
        y: y - options.size,
        font: options.font,
        size: options.size,
        color: options.color ?? PDF_TEXT,
      })
      y -= options.lineHeight
    }
    y -= options.after ?? 0
  }
  const drawParagraph = (
    text: string,
    options: {
      font?: PDFFont
      size?: number
      lineHeight?: number
      width?: number
      x?: number
      color?: ReturnType<typeof rgb>
      after?: number
    } = {},
  ) => {
    const font = options.font ?? regular
    const size = options.size ?? 10
    const width = options.width ?? contentWidth
    drawLines(wrapPdfText(text, font, size, width), {
      font,
      size,
      lineHeight: options.lineHeight ?? size * 1.4,
      x: options.x,
      color: options.color,
      after: options.after,
    })
  }
  const drawHeading = (text: string) => {
    // Keep a heading with enough room for the first paragraph or table rows.
    ensureSpace(68)
    y -= 4
    drawParagraph(text, {
      font: bold,
      size: 14,
      lineHeight: 17,
      after: 3,
    })
  }
  const drawTable = (headers: string[], rows: string[][]) => {
    const columnWidth = contentWidth / headers.length
    let fontSize = 6.5
    if (headers.length <= 2) fontSize = 8.5
    else if (headers.length <= 4) fontSize = 7.5
    const headerSize = Math.max(6, fontSize - 0.5)
    const padding = 3
    const layoutRow = (cells: string[], header: boolean) => {
      const font = header ? bold : regular
      const size = header ? headerSize : fontSize
      const lineHeight = size * 1.35
      const lines = headers.map((_, index) =>
        wrapPdfText(cells[index] ?? "", font, size, columnWidth - padding * 2),
      )
      return {
        font,
        size,
        lineHeight,
        lines,
        height:
          Math.max(...lines.map((cellLines) => cellLines.length)) * lineHeight +
          padding * 2,
      }
    }
    const drawRow = (
      cells: string[],
      row: ReturnType<typeof layoutRow>,
      header: boolean,
    ) => {
      if (header) {
        page.drawRectangle({
          x: PDF_MARGIN,
          y: y - row.height,
          width: contentWidth,
          height: row.height,
          color: PDF_PANEL,
        })
      }
      row.lines.forEach((cellLines, index) => {
        cellLines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: PDF_MARGIN + index * columnWidth + padding,
            y: y - padding - row.size - lineIndex * row.lineHeight,
            font: row.font,
            size: row.size,
            color: header ? PDF_MUTED : PDF_TEXT,
          })
        })
      })
      page.drawLine({
        start: { x: PDF_MARGIN, y: y - row.height },
        end: { x: PDF_MARGIN + contentWidth, y: y - row.height },
        thickness: 0.5,
        color: PDF_RULE,
      })
      y -= row.height
    }

    const header = layoutRow(headers, true)
    ensureSpace(header.height)
    drawRow(headers, header, true)
    for (const cells of rows) {
      const row = layoutRow(cells, false)
      if (y - row.height < pageBottom) {
        addPage()
        drawRow(headers, header, true)
      }
      drawRow(cells, row, false)
    }
    y -= 4
  }

  drawParagraph(model.title, {
    font: bold,
    size: 20,
    lineHeight: 24,
    after: 5,
  })
  model.metadata.forEach(([label, value]) =>
    drawParagraph(`${label}: ${value}`, {
      size: 8.5,
      lineHeight: 10.5,
      color: PDF_MUTED,
    }),
  )
  y -= 6

  const leadLines = wrapPdfText(model.lead, regular, 10.5, contentWidth - 16)
  const leadHeight = leadLines.length * 14 + 14
  ensureSpace(leadHeight)
  page.drawRectangle({
    x: PDF_MARGIN,
    y: y - leadHeight,
    width: contentWidth,
    height: leadHeight,
    color: PDF_PANEL,
  })
  drawLines(leadLines, {
    font: regular,
    size: 10.5,
    lineHeight: 14,
    x: PDF_MARGIN + 8,
    after: 14,
  })

  model.sections.forEach((section) => {
    drawHeading(section.title)
    section.blocks.forEach((block) => {
      if (block.type === "paragraph") {
        drawParagraph(block.text, {
          font: block.emphasis ? bold : regular,
          size: block.emphasis ? 10.5 : 9.5,
          lineHeight: block.emphasis ? 13.5 : 12.5,
          after: 4,
        })
      } else {
        drawTable(block.headers, block.rows)
      }
    })
  })

  drawHeading("Definitions")
  model.definitions.forEach(([term, definition]) => {
    drawParagraph(`${term}: ${definition}`, {
      size: 7.8,
      lineHeight: 10,
      color: PDF_MUTED,
      after: 2,
    })
  })
  y -= 3
  drawParagraph(
    "Every figure uses the same ledger as the accompanying data/ files.",
    { size: 8.5, lineHeight: 11, after: 5 },
  )
  ensureSpace(28)
  page.drawLine({
    start: { x: PDF_MARGIN, y },
    end: { x: PDF_MARGIN + contentWidth, y },
    thickness: 0.5,
    color: PDF_RULE,
  })
  y -= 6
  drawParagraph(
    "This statement is an informational summary of public on-chain data. Wildcat does not provide tax, accounting, or investment advice; consult your own advisor.",
    { size: 7, lineHeight: 9, color: PDF_MUTED },
  )

  const pages = document.getPages()
  pages.forEach((pdfPage, index) => {
    const label = `Page ${index + 1} of ${pages.length}`
    pdfPage.drawText(label, {
      x: A4_WIDTH - PDF_MARGIN - regular.widthOfTextAtSize(label, 7.5),
      y: PDF_MARGIN - 5,
      font: regular,
      size: 7.5,
      color: PDF_MUTED,
    })
  })

  const pinned = new Date(timestamp * 1_000)
  document.setCreationDate(pinned)
  document.setModificationDate(pinned)
  document.setProducer("Wildcat Export")
  document.setCreator("Wildcat Export")
  const identifier = createHash("sha256")
    .update(JSON.stringify(model))
    .digest("hex")
    .slice(0, 32)
  document.context.trailerInfo.ID = document.context.obj([
    PDFHexString.of(identifier),
    PDFHexString.of(identifier),
  ])
  return Buffer.from(await document.save({ useObjectStreams: false }))
}

export async function renderXlsx(
  model: StatementModel,
  dataset: MarketDataset,
) {
  const workbook = new ExcelJS.Workbook()
  const pinned = new Date(dataset.snapshotTimestamp * 1_000)
  workbook.creator = "Wildcat Export"
  workbook.created = pinned
  workbook.modified = pinned
  const sheet = workbook.addWorksheet("Statement")
  sheet.columns = [
    { width: 34 },
    { width: 34 },
    { width: 34 },
    { width: 26 },
    { width: 26 },
    { width: 26 },
    { width: 26 },
  ]
  const title = sheet.addRow([model.title])
  title.font = { bold: true, size: 18 }
  model.metadata.forEach(([label, value]) => sheet.addRow([label, value]))
  sheet.addRow([])
  const lead = sheet.addRow([model.lead])
  lead.font = { bold: true }
  model.sections.forEach((section) => {
    sheet.addRow([])
    const heading = sheet.addRow([section.title])
    heading.font = { bold: true, size: 14 }
    section.blocks.forEach((block) => {
      if (block.type === "paragraph") {
        const row = sheet.addRow([block.text])
        if (block.emphasis) row.font = { bold: true }
      } else {
        const header = sheet.addRow(block.headers)
        header.font = { bold: true }
        block.rows.forEach((row) => sheet.addRow(row))
      }
    })
  })
  sheet.addRow([])
  const definitions = sheet.addRow(["Definitions"])
  definitions.font = { bold: true, size: 14 }
  model.definitions.forEach(([term, definition]) =>
    sheet.addRow([term, definition]),
  )
  sheet.addRow([])
  sheet.addRow([
    "Every figure uses the same ledger as the accompanying data/ files.",
  ])
  sheet.addRow([
    "This statement is informational. Wildcat does not provide tax, accounting, or investment advice; consult your own advisor.",
  ])
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true }
  })
  sheet.views = [{ state: "frozen", ySplit: model.metadata.length + 1 }]
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
