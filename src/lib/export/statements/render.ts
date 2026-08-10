/* eslint-disable no-restricted-syntax */

import { createHash } from "node:crypto"

import ExcelJS from "exceljs"
import { PDFDocument, PDFHexString } from "pdf-lib"
import { Browser } from "puppeteer"

import { launchPuppeteer } from "@/lib/puppeteer"

import {
  formatFixed,
  formatUnits,
  percentFromRay,
  RAY,
  rayDiv,
} from "../bigint"
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

const total = (
  dataset: MarketDataset,
  field: keyof MarketDataset["transactions"][number],
) =>
  dataset.transactions.reduce((sum, row) => {
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

const formatHours = (seconds: number) =>
  `${formatFixed((BigInt(seconds) * 10n + 1_800n) / 3_600n, 1)} hours`

const interestTotal = (dataset: MarketDataset) =>
  dataset.interestAccruals.reduce(
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
    allTime: depositors.size,
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
    "Principal",
    "Deposited value before earned interest, allocated proportionally when money leaves.",
  ],
  [
    "Interest accrued",
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
]

export function marketConditionStatement(
  dataset: MarketDataset,
): StatementModel {
  const daily = latestDaily(dataset)
  const episodes = dataset.manifest.delinquencyEpisodes
  const overGrace = episodes.filter((episode) => episode.penaltyTriggered)
  const withinGrace = episodes.length - overGrace.length
  const lenders = lenderSummary(dataset)
  const requested = total(dataset, "withdrawalQueuedRaw")
  const paid = total(dataset, "withdrawalExecutedRaw")
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
  const servicingRepayment = dataset.transactions
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
  return {
    title: "Market Condition Statement",
    metadata: commonMetadata(dataset),
    lead: `The market owes lenders ${daily.outstanding_principal} ${dataset.market.assetSymbol} and holds ${daily.total_assets_held} ${dataset.market.assetSymbol} in liquid reserves (${reservePercent}% of the amount owed).`,
    sections: [
      {
        title: "Condition at a glance",
        blocks: [
          {
            type: "table",
            headers: ["Measure", "Reading"],
            rows: [
              ["Interest rate", `${daily.effective_apr_pct_eod}% APR`],
              [
                "Delinquency status",
                daily.is_delinquent_eod === "true"
                  ? "Delinquent"
                  : "Not delinquent",
              ],
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
                `${lenders.active} active, ${lenders.allTime} all-time; largest position ${lenders.largestShare}%`,
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
        title: "History that matters",
        blocks: [
          {
            type: "paragraph",
            text: `Delinquency: ${
              episodes.length
            } episode(s). ${withinGrace} cured within the ${
              daily.grace_period_hours
            }-hour grace period; ${overGrace.length} activated the ${
              daily.penalty_apr_pct_nominal
            }% penalty rate${
              overGrace.length
                ? ` (${overGrace
                    .map((episode) => formatHours(episode.durationSeconds))
                    .join(", ")})`
                : ""
            }.`,
          },
          {
            type: "paragraph",
            text: `Withdrawals: lenders requested ${amount(
              dataset,
              requested,
            )} and were paid ${amount(
              dataset,
              paid,
            )}. The difference includes interest earned while requests waited and any still-unpaid requests.${
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
            headers: ["Lifetime flow", dataset.market.assetSymbol],
            rows: [
              [
                "Deposits received",
                amount(dataset, total(dataset, "depositedRaw")),
              ],
              [
                "Drawn by borrower",
                amount(dataset, total(dataset, "borrowedRaw")),
              ],
              [
                "Repaid by borrower",
                amount(dataset, total(dataset, "repaidRaw")),
              ],
              ["Paid to lenders", amount(dataset, paid)],
              [
                "Interest accrued to lenders",
                amount(dataset, interestTotal(dataset)),
              ],
            ],
          },
          {
            type: "paragraph",
            text: `${dataset.manifest.excludedTransfers.length} unrelated foreign-token transfer(s) were quarantined and excluded from every figure; data/manifest.json lists each one.`,
          },
        ],
      },
    ],
    definitions: commonDefinitions,
  }
}

const monthKey = (timestamp: number) =>
  new Date(timestamp * 1_000).toISOString().slice(0, 7)

function borrowerMonthlyRows(
  dataset: MarketDataset,
  request: CanonicalExportRequest,
) {
  const deploymentMonth = monthKey(
    dataset.events[0]?.timestamp ?? dataset.snapshotTimestamp,
  )
  const snapshotMonth = monthKey(dataset.snapshotTimestamp)
  const first = [
    request.dateFrom?.slice(0, 7) ?? deploymentMonth,
    deploymentMonth,
  ]
    .sort()
    .at(-1)!
  const last = [
    request.dateTo?.slice(0, 7) ?? snapshotMonth,
    snapshotMonth,
  ].sort()[0]
  const months: string[] = []
  const cursor = new Date(`${first}-01T00:00:00Z`)
  const end = new Date(`${last}-01T00:00:00Z`)
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 7))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months.map((month) => {
    const transactions = dataset.transactions.filter(
      (row) => monthKey(row.timestamp) === month,
    )
    const accruals = dataset.interestAccruals.filter(
      (row) => monthKey(row.periodEnd) === month,
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
    const ray = accruals.reduce((sum, row) => sum + row.baseInterestRay, 0n)
    const seconds = accruals.reduce(
      (sum, row) => sum + row.periodEnd - row.periodStart,
      0,
    )
    return [
      month,
      amount(dataset, flow("borrowedRaw")),
      amount(dataset, flow("repaidRaw")),
      amount(dataset, flow("depositedRaw")),
      amount(dataset, flow("withdrawalExecutedRaw")),
      amount(dataset, interest),
      `${seconds ? percentFromRay(ray, seconds) : "0.000000"}%`,
    ]
  })
}

const borrowerAnnualRows = (dataset: MarketDataset) => {
  const years = [
    ...new Set(
      dataset.interestAccruals.map((row) =>
        String(new Date(row.periodEnd * 1_000).getUTCFullYear()),
      ),
    ),
  ].sort()
  return years.map((year) => {
    const accruals = dataset.interestAccruals.filter(
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
  const daily = latestDaily(dataset)
  const lenders = lenderSummary(dataset)
  const fees = dataset.interestAccruals.reduce(
    (sum, row) => sum + row.protocolFeesRaw,
    0n,
  )
  const episodes = dataset.manifest.delinquencyEpisodes
  return {
    title: "Borrower Market Statement",
    metadata: [
      ...commonMetadata(dataset),
      ["Prepared for", "Borrower"],
      [
        "Period",
        request.dateFrom || request.dateTo
          ? `${request.dateFrom ?? "market creation"} to ${
              request.dateTo ?? formatDate(dataset.snapshotTimestamp)
            }`
          : "Full history",
      ],
    ],
    lead: `You currently owe lenders ${daily.outstanding_principal} ${dataset.market.assetSymbol}. The market holds ${daily.total_assets_held} ${dataset.market.assetSymbol} in liquid reserves.`,
    sections: [
      {
        title: "Activity since market creation",
        blocks: [
          {
            type: "table",
            headers: ["Measure", dataset.market.assetSymbol],
            rows: [
              [
                "Deposits received",
                amount(dataset, total(dataset, "depositedRaw")),
              ],
              ["Loans drawn", amount(dataset, total(dataset, "borrowedRaw"))],
              ["Repayments", amount(dataset, total(dataset, "repaidRaw"))],
              [
                "Paid to lenders",
                amount(dataset, total(dataset, "withdrawalExecutedRaw")),
              ],
              ["Interest accrued", amount(dataset, interestTotal(dataset))],
              ["Protocol fees accrued", amount(dataset, fees)],
            ],
          },
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
              "Interest accrued",
              "Time-weighted base APR",
            ],
            rows: borrowerMonthlyRows(dataset, request),
          },
        ],
      },
      {
        title: "Obligations by calendar year",
        blocks: [
          {
            type: "table",
            headers: [
              "Year",
              "Lender interest accrued",
              "Protocol fees accrued",
            ],
            rows: borrowerAnnualRows(dataset),
          },
        ],
      },
      {
        title: "Things worth knowing",
        blocks: [
          {
            type: "paragraph",
            text: `${episodes.length} delinquency episode(s); ${
              episodes.filter((episode) => episode.penaltyTriggered).length
            } exceeded the grace period and activated penalty interest.`,
          },
          {
            type: "paragraph",
            text: `${lenders.allTime} addresses deposited over the market's life and ${lenders.active} currently hold a position.`,
          },
          {
            type: "paragraph",
            text: `${
              dataset.manifest.excludedTransfers.length
            } unrelated foreign-token transfer(s) were excluded. ${
              dataset.transactions.filter((row) => row.status === "failed")
                .length
            } reverted direct market call(s) remain visible with empty flow fields.`,
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
  const interestInvested = position.earningsRaw - interestPaid
  const activities = dataset.events
    .filter(
      (event) =>
        (event.participant === position.address ||
          event.counterparty === position.address) &&
        (!request.dateFrom ||
          event.timestamp >=
            Date.parse(`${request.dateFrom}T00:00:00Z`) / 1_000) &&
        (!request.dateTo ||
          event.timestamp <= Date.parse(`${request.dateTo}T23:59:59Z`) / 1_000),
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
    .map((event) => [
      formatDate(event.timestamp),
      event.name,
      event.amountRaw === undefined ? "" : amount(dataset, event.amountRaw),
    ])
  const annual = Object.entries(position.annualEarnings)
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
    ],
    lead: `Your position is currently worth ${amount(
      dataset,
      position.currentValueRaw,
    )}: ${amount(
      dataset,
      position.principalStillInvestedRaw,
    )} of principal plus ${amount(
      dataset,
      interestInvested,
    )} of earnings still invested. You hold ${share}% of this market.`,
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
            rows: annual.length ? annual : [["—", "No earnings activity"]],
          },
          {
            type: "table",
            headers: ["Earnings split", dataset.market.assetSymbol],
            rows: [
              ["Already paid out", amount(dataset, interestPaid)],
              ["Still invested", amount(dataset, interestInvested)],
            ],
          },
        ],
      },
      {
        title: "Your activity",
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
        "Earnings still invested",
        "Total earnings less the earnings proportion already paid out.",
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

const escapeHtml = (value: unknown) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

export function renderStatementHtml(model: StatementModel) {
  const blockHtml = (block: StatementBlock) => {
    if (block.type === "paragraph") {
      return `<p${block.emphasis ? ' class="emphasis"' : ""}>${escapeHtml(
        block.text,
      )}</p>`
    }
    return `<table><thead><tr>${block.headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("")}</tr></thead><tbody>${block.rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${escapeHtml(cell)}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</tbody></table>`
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size:A4; margin:17mm; } body { color:#17171b; font:12px/1.45 Arial,sans-serif; }
h1 { font-size:23px; margin:0 0 8px; } h2 { font-size:16px; margin:21px 0 7px; }
.meta { color:#5f6370; margin-bottom:16px; } .lead { font-size:15px; padding:13px; background:#f4f5f7; border-radius:8px; }
.emphasis { font-size:14px; font-weight:bold; } table { border-collapse:collapse; width:100%; margin:9px 0; }
th,td { border-bottom:1px solid #ddd; padding:6px 5px; text-align:left; vertical-align:top; }
th { font-size:10px; color:#5f6370; text-transform:uppercase; } .definitions { font-size:10px; color:#4d515c; }
.disclaimer { border-top:1px solid #bbb; margin-top:22px; padding-top:9px; font-size:9px; color:#666; }
</style><title>${escapeHtml(model.title)}</title></head><body><h1>${escapeHtml(
    model.title,
  )}</h1>
<div class="meta">${model.metadata
    .map(
      ([label, value]) =>
        `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}<br>`,
    )
    .join("")}</div>
<p class="lead">${escapeHtml(model.lead)}</p>${model.sections
    .map(
      (section) =>
        `<h2>${escapeHtml(section.title)}</h2>${section.blocks
          .map(blockHtml)
          .join("")}`,
    )
    .join("")}
<h2>Definitions</h2><div class="definitions">${model.definitions
    .map(
      ([term, definition]) =>
        `<p><strong>${escapeHtml(term)}:</strong> ${escapeHtml(
          definition,
        )}</p>`,
    )
    .join("")}</div>
<p>Every figure uses the same ledger as the accompanying <code>data/</code> files.</p>
<p class="disclaimer">This statement is an informational summary of public on-chain data. Wildcat does not provide tax, accounting, or investment advice; consult your own advisor.</p></body></html>`
}

export async function renderPdf(
  model: StatementModel,
  timestamp: number,
  sharedBrowser?: Browser,
) {
  const html = renderStatementHtml(model)
  const browser = sharedBrowser ?? (await launchPuppeteer())
  try {
    const page = await browser.newPage()
    try {
      await page.setContent(html, { waitUntil: "networkidle0" })
      const generated = await page.pdf({ format: "A4", printBackground: true })
      const document = await PDFDocument.load(generated)
      const pinned = new Date(timestamp * 1_000)
      document.setCreationDate(pinned)
      document.setModificationDate(pinned)
      document.setProducer("Wildcat Export")
      document.setCreator("Wildcat Export")
      const identifier = createHash("sha256")
        .update(html)
        .digest("hex")
        .slice(0, 32)
      document.context.trailerInfo.ID = document.context.obj([
        PDFHexString.of(identifier),
        PDFHexString.of(identifier),
      ])
      return Buffer.from(await document.save({ useObjectStreams: false }))
    } finally {
      await page.close()
    }
  } finally {
    if (!sharedBrowser) await browser.close()
  }
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
