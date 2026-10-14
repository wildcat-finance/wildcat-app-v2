/** @jest-environment node */

import { createExportExplorer } from "./explorer"
import { ExportRpcClient } from "./rpc"
import { compareMarketLogSources } from "../ledger/buildMarketDataset"
import { JsonRpcLog } from "../types"

// Keep real pacing without reserving provider slots in a database during this test.
jest.mock("../jobs/providerThrottle", () => {
  const actual = jest.requireActual("../jobs/providerThrottle")
  const nextRequests = new Map<string, number>()
  return {
    ...actual,
    waitForProviderSlot: async (key: string, interval: number) => {
      const now = Date.now()
      const at = Math.max(now, nextRequests.get(key) ?? 0)
      nextRequests.set(key, at + interval)
      await new Promise((resolve) => {
        setTimeout(resolve, at - now)
      })
    },
  }
})

// Opt-in read-only check against the five deployed Ink token templates.
const live =
  process.env.RUN_LIVE_EXPORT_TESTS === "1" ? describe : describe.skip

live("Ink Blockscout live compatibility", () => {
  const factory = "0x001d521c15db09bf52731aa27b3f2ba83d7499b9"
  const deployer = "0xca732651410e915090d7a7d889a1e44ef4575fce"
  const fromBlock = 63010503
  const toBlock = 63010606

  it("matches archive RPC market-style logs and transfer discovery", async () => {
    const rpc = new ExportRpcClient(763373)
    const explorer = createExportExplorer(763373)
    const [rpcLogs, explorerLogs] = await Promise.all([
      rpc.getLogs({ address: factory, fromBlock, toBlock }),
      explorer.getMarketLogs(763373, factory, fromBlock, toBlock),
    ])
    expect(explorerLogs).toHaveLength(5)
    expect(
      compareMarketLogSources(factory, rpcLogs, explorerLogs).rpcCount,
    ).toBe(5)

    const transfer =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    const topic = `0x${deployer.slice(2).padStart(64, "0")}`
    const [outgoing, incoming, explorerTransfers] = await Promise.all([
      rpc.getLogs({ fromBlock, toBlock, topics: [transfer, topic] }),
      rpc.getLogs({ fromBlock, toBlock, topics: [transfer, null, topic] }),
      explorer.getTransferLogsMentioningAddress(
        763373,
        deployer,
        fromBlock,
        toBlock,
      ),
    ])
    const unique = new Map<string, JsonRpcLog>()
    ;[...outgoing, ...incoming].forEach((log) =>
      unique.set(`${log.transactionHash}:${log.logIndex}`, log),
    )
    expect(explorerTransfers.length).toBeGreaterThanOrEqual(5)
    expect(
      compareMarketLogSources(deployer, [...unique.values()], explorerTransfers)
        .rpcCount,
    ).toBe(unique.size)
    expect(
      await explorer.getDirectFailedTransactionHashes(
        763373,
        factory,
        fromBlock,
        toBlock,
      ),
    ).toEqual([])
  }, 240_000)
})
