/** @jest-environment node */

import { readFile } from "node:fs/promises"
import path from "node:path"

import { buildMarketDataset } from "./ledger/buildMarketDataset"
import { discoverMarketUniverse } from "./sources/discovery"
import { decodeRecording } from "./sources/recording"
import { fromHex } from "./sources/rpc"

const REFERENCE_MARKET_C = "0xeafa12cc0905baabed8618584f0796f5d19da3c4"
const SNAPSHOT = 25_632_396

describe("recorded reference market C", () => {
  it("covers rate changes, closure, and the untracked close refund", async () => {
    const recording = decodeRecording(
      await readFile(
        path.join(
          process.cwd(),
          "src/lib/export/__fixtures__/reference-market-c-25632396.json.gz",
        ),
      ),
    )
    const universe = await discoverMarketUniverse(recording.rpc, 1, SNAPSHOT, [
      REFERENCE_MARKET_C,
    ])
    const snapshot = await recording.rpc.getBlock(SNAPSHOT)
    const dataset = await buildMarketDataset(
      recording.rpc,
      universe.markets[0],
      SNAPSHOT,
      snapshot.hash,
      fromHex(snapshot.timestamp),
      [],
      recording.explorer,
    )
    expect(dataset.events).toHaveLength(1_333)
    expect(dataset.interestAccruals).toHaveLength(307)
    expect(dataset.manifest.protocolFeesByYearRaw).toEqual({
      "2025": "14022253909",
      "2026": "9005928044",
    })
    expect(dataset.manifest.crossChecks.marketClosedEventCount).toBe(1)
    expect(dataset.dailySeries.at(-1)?.market_closed_eod).toBe("true")
    expect(dataset.dailySeries.at(-1)?.base_apr_bips_eod).toBe("0")
    expect(
      dataset.transactions.reduce(
        (sum, row) => sum + row.untrackedAssetOutRaw,
        0n,
      ),
    ).toBe(10_545_184n)
    expect(
      Number(
        dataset.dailySeries.find((row) => row.date_utc === "2025-10-15")
          ?.base_apr_pct_time_weighted,
      ).toFixed(1),
    ).toBe("16.0")
    expect(dataset.manifest.reconciliation.differenceRaw).toBe("0")
    expect(dataset.manifest.reconciliation.computedTotalSupplyRaw).toBe(
      dataset.manifest.reconciliation.onchainTotalSupplyRaw,
    )
  }, 120_000)
})
