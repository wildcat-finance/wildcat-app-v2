/** @jest-environment node */
/* eslint-disable no-await-in-loop, no-restricted-syntax */

import { readFile } from "node:fs/promises"
import path from "node:path"

import ExcelJS from "exceljs"
import JSZip from "jszip"
import { PDFDocument } from "pdf-lib"

import { buildExportBundle } from "./bundle"
import {
  buildMarketDataset,
  buildPositionSummaries,
} from "./ledger/buildMarketDataset"
import { discoverMarketUniverse } from "./sources/discovery"
import { decodeRecording } from "./sources/recording"
import { fromHex } from "./sources/rpc"
import {
  borrowerStatement,
  marketConditionStatement,
  positionStatement,
  renderPdf,
} from "./statements/render"
import { CanonicalExportRequest, MarketDataset } from "./types"

const REFERENCE_MARKET_A = "0x14da929b9d44b74ce5937fb2527ba6abe5872b89"
const POSITION = "0x0daf132c5554fd7d5eb422585426af557d8847e0"
const TRANSFER_POSITIONS = [
  "0x29e1fc14ddef309b808cc2c870ef3691c2aa07c8",
  "0x9d969dc2f872a80edead0b5e08b2a5d737ddc4f6",
]
const SNAPSHOT = 25_632_396
const fixturePath = path.join(
  process.cwd(),
  "src/lib/export/__fixtures__/reference-market-a-25632396.json.gz",
)

const request: CanonicalExportRequest = {
  chainId: 1,
  markets: [REFERENCE_MARKET_A],
  statements: ["market_condition", "position", "borrower"],
  addresses: [POSITION, ...TRANSFER_POSITIONS],
  format: "xlsx",
  snapshotBlock: String(SNAPSHOT),
  snapshotBlockHash:
    "0x3f39ec342220571200ace68f8ecb3fdca6bb309d81df9a3857a93428cc39c09c",
}

const worksheetText = async (value: Buffer) => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(value)
  const values: string[] = []
  workbook.worksheets[0].eachRow((row) => {
    row.eachCell((cell) => values.push(String(cell.value ?? "")))
  })
  return values.join("\n")
}

describe("recorded reference market A", () => {
  let dataset: MarketDataset
  const progressStages: string[] = []

  beforeAll(async () => {
    const recording = decodeRecording(await readFile(fixturePath))
    const universe = await discoverMarketUniverse(recording.rpc, 1, SNAPSHOT, [
      REFERENCE_MARKET_A,
    ])
    const snapshot = await recording.rpc.getBlock(SNAPSHOT)
    request.snapshotBlockHash = snapshot.hash
    dataset = await buildMarketDataset(
      recording.rpc,
      universe.markets[0],
      SNAPSHOT,
      snapshot.hash,
      fromHex(snapshot.timestamp),
      [],
      recording.explorer,
      async (stage) => {
        progressStages.push(stage)
      },
    )
    dataset.positions = await buildPositionSummaries(
      recording.rpc,
      dataset.market,
      SNAPSHOT,
      dataset.snapshotTimestamp,
      dataset.events,
      [POSITION, ...TRANSFER_POSITIONS],
    )
  }, 120_000)

  it("matches the reference ledger, accrual, fee, APR, and quarantine checks", () => {
    expect(progressStages).toEqual([
      "reading_history",
      "building_transactions",
      "building_daily_history",
      "checking_balances",
      "finalizing_market_data",
    ])
    expect(dataset.transactions).toHaveLength(200)
    expect(dataset.events).toHaveLength(888)
    expect(dataset.interestAccruals).toHaveLength(219)
    expect(Object.keys(dataset.dailySeries[0])).toHaveLength(56)
    expect(dataset.manifest.protocolFeesByYearRaw).toEqual({
      "2025": "33729528171",
      "2026": "34682959349",
    })
    expect(
      Number(
        dataset.dailySeries.find((row) => row.date_utc === "2026-07-20")
          ?.penalty_apr_pct_realised,
      ).toFixed(2),
    ).toBe("14.77")
    const accrualDays = dataset.dailySeries.filter(
      (row) => Number(row.accrual_events) > 0,
    )
    expect(accrualDays).not.toHaveLength(0)
    expect(new Set(accrualDays.map((row) => row.protocol_fee_apr_pct))).toEqual(
      new Set(["0.900000"]),
    )
    accrualDays.forEach((row) => {
      expect(Number(row.borrower_all_in_apr_pct)).toBeCloseTo(
        Number(row.effective_lender_apr_pct_realised) + 0.9,
        6,
      )
    })
    expect(dataset.manifest.reconciliation.differenceRaw).toBe("0")
    expect(dataset.manifest.reconciliation.walkedScaledSupplyRaw).toBe(
      dataset.manifest.reconciliation.onchainScaledSupplyRaw,
    )
    expect(
      dataset.transactions.filter((row) => row.status === "failed"),
    ).toHaveLength(1)
    expect(dataset.manifest.excludedTransfers).toHaveLength(7)
    expect(dataset.manifest.delinquencyEpisodes).toHaveLength(7)
    TRANSFER_POSITIONS.forEach((address) => {
      const position = dataset.positions[address]
      expect(
        position.depositsRaw + position.principalAcquiredByTransferRaw,
      ).toBe(
        position.principalStillInvestedRaw +
          position.principalReturnedRaw +
          position.principalTransferredOutRaw,
      )
      expect(position.earningsRaw).toBe(
        position.totalPositionValueRaw +
          position.payoutsRaw +
          position.marketTokensTransferredOutRaw -
          position.depositsRaw -
          position.principalAcquiredByTransferRaw,
      )
      expect(position.principalStillInvestedRaw).toBe(
        position.activePrincipalRaw + position.pendingWithdrawalPrincipalRaw,
      )
      expect(position.totalPositionValueRaw).toBe(
        position.currentValueRaw + position.pendingWithdrawalValueRaw,
      )
      expect(position.earningsRaw).toBe(
        position.payoutsRaw -
          position.principalReturnedRaw +
          position.marketTokensTransferredOutRaw -
          position.principalTransferredOutRaw +
          position.currentValueRaw -
          position.activePrincipalRaw +
          position.pendingWithdrawalValueRaw -
          position.pendingWithdrawalPrincipalRaw,
      )
    })
  })

  it("produces deterministic entries and self-contained statement figures", async () => {
    const bundleProgress: string[] = []
    const [leftBuffer, rightBuffer] = await Promise.all([
      buildExportBundle(
        request,
        [dataset],
        [],
        "2026-08-01T00:00:00.000Z",
        async (stage) => {
          bundleProgress.push(stage)
        },
      ),
      buildExportBundle(request, [dataset], [], "2026-08-02T00:00:00.000Z"),
    ])
    expect(bundleProgress).toEqual(["creating_statements", "creating_zip"])
    const [left, right] = await Promise.all([
      JSZip.loadAsync(leftBuffer),
      JSZip.loadAsync(rightBuffer),
    ])
    const leftNames = Object.keys(left.files)
    const rightNames = Object.keys(right.files)
    expect(leftNames).toEqual(rightNames)
    for (const name of leftNames) {
      // ZIP's DOS timestamp format has two-second precision.
      expect(left.files[name].date.toISOString()).toBe(
        new Date(
          (dataset.snapshotTimestamp - (dataset.snapshotTimestamp % 2)) * 1_000,
        ).toISOString(),
      )
      const [leftEntry, rightEntry] = await Promise.all([
        left.files[name].async("nodebuffer"),
        right.files[name].async("nodebuffer"),
      ])
      if (name === "data/manifest.json") {
        const leftManifest = JSON.parse(leftEntry.toString("utf8"))
        const rightManifest = JSON.parse(rightEntry.toString("utf8"))
        leftManifest.generated_at_utc = null
        rightManifest.generated_at_utc = null
        expect(leftManifest).toEqual(rightManifest)

        const position = leftManifest.position_summaries[0]
        const market = leftManifest.markets[0]
        const statementEntries = leftNames.filter((entry) =>
          entry.endsWith(".xlsx"),
        )
        const statementText = (
          await Promise.all(
            statementEntries.map(async (entry) =>
              worksheetText(await left.files[entry].async("nodebuffer")),
            ),
          )
        ).join("\n")
        ;[
          market.aggregates.lender_deposits,
          market.aggregates.borrowed,
          market.aggregates.repaid,
          market.aggregates.lender_withdrawals,
          position.current_value,
          position.principal_still_invested,
          position.earnings,
        ].forEach((figure) => expect(statementText).toContain(String(figure)))
        expect(statementText).not.toMatch(/0x[0-9a-f]{64}/i)
        expect(statementText).not.toMatch(/\b\d{20,}\b/)
        expect(statementText).toContain("accompanying data/ files")
        expect(statementText).toContain(
          "Wildcat does not provide tax, accounting, or investment advice",
        )
        ;[
          "Owed to lenders",
          "Liquid reserves",
          "APR",
          "Principal",
          "Grace period",
          "Withdrawal batch",
          "Proportional convention",
          "Time-weighted APR",
        ].forEach((term) => expect(statementText).toContain(term))
      } else {
        expect(leftEntry).toEqual(rightEntry)
      }
    }
  }, 120_000)

  it("applies a calendar-year reporting period consistently", () => {
    const yearToDateRequest: CanonicalExportRequest = {
      ...request,
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    }
    const borrower = borrowerStatement(dataset, yearToDateRequest)
    const condition = marketConditionStatement(dataset, yearToDateRequest)
    const position = positionStatement(
      dataset,
      dataset.positions[POSITION],
      yearToDateRequest,
    )
    const periodLabel = "2026-01-01 to 2026-07-28 (year to date)"

    expect(borrower.metadata).toContainEqual(["Period", periodLabel])
    expect(condition.metadata).toContainEqual(["Reporting period", periodLabel])
    expect(position.metadata).toContainEqual(["Reporting period", periodLabel])

    const borrowerActivity = borrower.sections.find(
      (section) => section.title === "Activity in the reporting period",
    )
    const borrowerActivityRows = borrowerActivity?.blocks.flatMap((block) =>
      block.type === "table" ? block.rows : [],
    )
    expect(borrowerActivityRows).toContainEqual(["Loans drawn", "2800000 USDC"])

    const borrowerAnnual = borrower.sections.find(
      (section) => section.title === "Obligations in the reporting period",
    )
    const borrowerAnnualRows = borrowerAnnual?.blocks.flatMap((block) =>
      block.type === "table" ? block.rows : [],
    )
    expect(borrowerAnnualRows).toHaveLength(1)
    expect(borrowerAnnualRows?.[0]?.[0]).toBe("2026")

    const borrowerNotes = borrower.sections.find(
      (section) => section.title === "Things worth knowing",
    )
    expect(
      borrowerNotes?.blocks.find((block) => block.type === "paragraph"),
    ).toMatchObject({
      text: expect.stringContaining(
        "3 delinquency episode(s) overlapped the reporting period",
      ),
    })

    const conditionHistory = condition.sections.find(
      (section) => section.title === "History in the reporting period",
    )
    const conditionRows = conditionHistory?.blocks.flatMap((block) =>
      block.type === "table" ? block.rows : [],
    )
    expect(conditionRows).toContainEqual(["Drawn by borrower", "2800000 USDC"])

    const positionAnnual = position.sections
      .find((section) => section.title === "What you have earned")
      ?.blocks.flatMap((block) => (block.type === "table" ? block.rows : []))
      .filter((row) => /^20\d{2}$/.test(row[0]))
    expect(positionAnnual?.map(([year]) => year)).toEqual(["2026"])
  })

  it("renders the same PDF model to identical bytes twice", async () => {
    const model = marketConditionStatement(dataset, request)
    const first = await renderPdf(model, dataset.snapshotTimestamp)
    const second = await renderPdf(model, dataset.snapshotTimestamp)
    expect(first).toEqual(second)
    expect((await PDFDocument.load(first)).getPageCount()).toBe(1)

    const borrower = await renderPdf(
      borrowerStatement(dataset, request),
      dataset.snapshotTimestamp,
    )
    expect(
      (await PDFDocument.load(borrower)).getPageCount(),
    ).toBeLessThanOrEqual(2)
  }, 120_000)

  it("assembles PDF statements without a browser", async () => {
    const bundle = await buildExportBundle(
      {
        ...request,
        statements: ["market_condition", "borrower"],
        addresses: [],
        format: "pdf",
      },
      [dataset],
      [],
      "2026-08-01T00:00:00.000Z",
    )
    const zip = await JSZip.loadAsync(bundle)
    const statements = Object.values(zip.files).filter(
      (entry) => !entry.dir && entry.name.endsWith(".pdf"),
    )
    expect(statements).toHaveLength(2)
    for (const statement of statements) {
      const pdf = await PDFDocument.load(await statement.async("nodebuffer"))
      expect(pdf.getPageCount()).toBeGreaterThan(0)
      expect(pdf.getPageCount()).toBeLessThanOrEqual(
        statement.name.includes("market_condition") ? 1 : 2,
      )
    }
  }, 120_000)
})
