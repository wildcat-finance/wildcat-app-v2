/** @jest-environment node */

import {
  borrowerGateProblems,
  CommittedRange,
  coverageGaps,
  marketGateProblems,
} from "./gates"

const market = {
  H01: 864_000,
  H02: 86_400,
  H08: 3_600,
  M05: 10,
  M18: 90,
  M20: 3,
  M23: 12,
  M30: 4,
  M31: 3,
  M49: 7,
  M67: "",
  M69: 1,
  M70: 1,
  M71: 1,
  M72: 0,
  M77: "Open",
  M86: 140,
  D17: 1,
}

describe("market gates", () => {
  it("passes sound values, including capacity above 100% and an empty window", () => {
    expect(marketGateProblems(market)).toEqual([])
  })

  it("catches values out of bounds, non-finite numbers and broken relations", () => {
    expect(
      marketGateProblems({
        ...market,
        M18: 100.5,
        M20: -1,
        M49: 2.5,
        M67: Infinity,
      }),
    ).toEqual([
      "M18 = 100.5 is above 100",
      "M20 = -1 is below 0",
      "M49 = 2.5 is not a whole number",
      "M67 is not a finite number",
      "M69 + M70 + M71 + M72 = M20",
    ])
    expect(marketGateProblems({ ...market, H02: 900_000 })).toEqual([
      "H02 ≤ H01",
    ])
  })

  it("lets a closed market record time past its closure", () => {
    const closed = { ...market, M77: "Closed", H01: 2_000_000 }
    expect(marketGateProblems(closed)).toEqual([])
    expect(marketGateProblems({ ...closed, M77: "Open" })).toEqual([
      "H01 ≤ M05",
    ])
  })

  it("rejects a lifetime counter that fell since the last publication", () => {
    expect(marketGateProblems(market, { M20: 4, M49: 7, M18: 99 })).toEqual([
      "M20 fell from 4 to 3",
    ])
  })
})

describe("borrower gates", () => {
  it("accepts no data for borrowers without funded markets or exits", () => {
    expect(
      borrowerGateProblems({
        S01: 0,
        S06: "",
        S07: "",
        S14: 0,
        S15: 0,
        S17: "",
      }),
    ).toEqual([])
  })

  it("rejects counts that fell and extremes out of order", () => {
    expect(
      borrowerGateProblems(
        { S06: 95, S07: 90, S14: 5, S15: 6, S37: 10 },
        { S37: 12 },
      ),
    ).toEqual(["S15 ≤ S14", "S06 ≤ S07", "S37 fell from 12 to 10"])
  })
})

describe("coverageGaps", () => {
  const address = `0x${"a".repeat(40)}`
  const range = (
    filter: CommittedRange["filter"],
    fromBlock: number,
    toBlock: number,
    addresses = [address],
  ): CommittedRange => ({ filter, fromBlock, toBlock, addresses })

  it("needs market logs from deployment and transfers after the dataset", () => {
    const ranges = [
      range("MarketLogs", 100, 500),
      range("MarketLogs", 501, 1_000),
      range("TransfersIn", 801, 1_000),
      range("TransfersOut", 801, 1_000),
    ]
    expect(
      coverageGaps(
        ranges,
        { address, deploymentBlock: 100, datasetBlock: 800 },
        1_000,
      ),
    ).toEqual([])
  })

  it("reports blocks no range covered, ignoring ranges for other markets", () => {
    const ranges = [
      range("MarketLogs", 100, 500),
      range("MarketLogs", 501, 1_000, [`0x${"b".repeat(40)}`]),
      range("TransfersIn", 801, 1_000),
    ]
    expect(
      coverageGaps(
        ranges,
        { address, deploymentBlock: 100, datasetBlock: 800 },
        1_000,
      ),
    ).toEqual(["MarketLogs 501-1000", "TransfersOut 801-1000"])
  })

  it("needs no transfer scan for a market rebuilt at the cut", () => {
    expect(
      coverageGaps(
        [range("MarketLogs", 100, 1_000)],
        { address, deploymentBlock: 100, datasetBlock: 1_000 },
        1_000,
      ),
    ).toEqual([])
  })
})
