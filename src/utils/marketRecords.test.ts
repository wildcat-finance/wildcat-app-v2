import type { MarketRecord } from "@wildcatfi/wildcat-sdk"

import { getRecordText } from "@/utils/marketRecords"

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
    )

    expect(text).toContain("APR reduction proposed to 8.75%")
    expect(text).toContain("lender response window")
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
})
