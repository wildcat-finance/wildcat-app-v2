import type { MarketRecord } from "@wildcatfi/wildcat-sdk"

import { buildMarketRecordsCsv, getRecordText } from "@/utils/marketRecords"

describe("market records", () => {
  it("formats periodic APR reduction proposal records", () => {
    const text = getRecordText(
      {
        __typename: "AnnualInterestBipsReductionProposed",
        annualInterestBips: 875,
        responseWindowStart: 1_000,
        responseWindowEnd: 2_000,
      } as MarketRecord,
      {},
      "Borrower",
      false,
      "Utilization APR",
    )

    expect(text).toContain("Utilization APR reduction proposed to 8.75%")
    expect(text).toContain("lender response window")
  })

  it("uses the market-specific APR name for applied changes", () => {
    const text = getRecordText(
      {
        __typename: "AnnualInterestBipsUpdated",
        oldAnnualInterestBips: 1_000,
        newAnnualInterestBips: 875,
      } as MarketRecord,
      {},
      "Borrower",
      false,
      "Utilization APR",
    )

    expect(text).toBe("Utilization APR changed from 10% to 8.75%")
  })

  it("formats periodic term closed records", () => {
    const text = getRecordText(
      {
        __typename: "PeriodicTermClosed",
      } as MarketRecord,
      {},
      "Borrower",
    )

    expect(text).toContain("Periodic term closed")
    expect(text).toContain("scheduled windows")
  })

  it("formats withdrawal executions separately from requests", () => {
    const record = {
      __typename: "WithdrawalExecution",
      address: "0x0000000000000000000000000000000000000001",
      normalizedAmount: {
        format: () => "100",
        decimals: 6,
        symbol: "USDC",
      },
    } as MarketRecord

    expect(getRecordText(record, {}, "Borrower", true)).toBe(
      "0x0000...0001 withdrew 100 USDC",
    )
  })

  it("exports stable CSV and neutralizes spreadsheet formulas", () => {
    const record = {
      __typename: "MarketClosed",
      eventIndex: 7,
      blockNumber: 10,
      blockTimestamp: 1_000,
      transactionHash: "=unsafe",
    } as MarketRecord

    const csv = buildMarketRecordsCsv([record], {}, "Borrower", "Base APR")

    expect(csv).toContain('"MarketClosed"')
    expect(csv).toContain('"\'=unsafe"')
    expect(csv).toContain('"Market closed"')
  })
})
