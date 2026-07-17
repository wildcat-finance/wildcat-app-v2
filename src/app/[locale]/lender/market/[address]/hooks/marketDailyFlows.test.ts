import { toDailyFlows } from "./marketDailyFlows"

describe("toDailyFlows", () => {
  it("orders cursor-paged stats chronologically before accumulating flows", () => {
    const result = toDailyFlows(
      [
        {
          startTimestamp: 2,
          dayDeposited: "3000000",
          dayWithdrawalsRequested: "1000000",
          dayWithdrawalsExecuted: "0",
        },
        {
          startTimestamp: 1,
          dayDeposited: "2000000",
          dayWithdrawalsRequested: "0",
          dayWithdrawalsExecuted: "0",
        },
      ],
      6,
    )

    expect(result.map(({ timestamp }) => timestamp)).toEqual([1, 2])
    expect(result.map(({ netFlow }) => netFlow)).toEqual([2, 4])
  })
})
