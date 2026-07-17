import { toDelinquencyHistory } from "./useMarketDelinquencyHistory"

describe("toDelinquencyHistory", () => {
  it("reconstructs periods chronologically from cursor-paged events", () => {
    const result = toDelinquencyHistory(
      [
        {
          id: "close",
          isDelinquent: false,
          blockTimestamp: 7_200,
          transactionHash: "0xclose",
        },
        {
          id: "open",
          isDelinquent: true,
          blockTimestamp: 3_600,
          transactionHash: "0xopen",
        },
      ],
      1_800,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: "open",
      startTimestamp: 3_600,
      endTimestamp: 7_200,
      durationSeconds: 3_600,
      isPenalized: true,
    })
  })
})
