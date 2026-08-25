/** @jest-environment node */

import { compareMarketLogSources } from "./buildMarketDataset"
import { JsonRpcLog } from "../types"

const log = (overrides: Partial<JsonRpcLog> = {}): JsonRpcLog => ({
  address: `0x${"1".repeat(40)}`,
  blockHash: `0x${"2".repeat(64)}`,
  blockNumber: "0x10",
  data: "0x1234",
  logIndex: "0x0",
  removed: false,
  topics: [`0x${"3".repeat(64)}`],
  transactionHash: `0x${"4".repeat(64)}`,
  transactionIndex: "0x1",
  ...overrides,
})

describe("independent market-log comparison", () => {
  it("compares the complete canonical log payload", () => {
    expect(compareMarketLogSources("0xmarket", [log()], [log()])).toEqual({
      rpcCount: 1,
      explorerCount: 1,
    })
    expect(() =>
      compareMarketLogSources("0xmarket", [log()], [log({ data: "0xabcd" })]),
    ).toThrow("payload mismatches 1")
  })

  it("rejects duplicate and removed logs", () => {
    expect(() =>
      compareMarketLogSources("0xmarket", [log(), log()], [log()]),
    ).toThrow("duplicate log")
    expect(() =>
      compareMarketLogSources("0xmarket", [log({ removed: true })], [log()]),
    ).toThrow("removed log")
  })
})
