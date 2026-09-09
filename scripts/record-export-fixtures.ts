import { writeFile } from "node:fs/promises"
import path from "node:path"

import { loadEnvConfig } from "@next/env"

import { buildMarketDataset } from "../src/lib/export/ledger/buildMarketDataset"
import { discoverMarketUniverse } from "../src/lib/export/sources/discovery"
import { etherscanExplorer } from "../src/lib/export/sources/etherscan"
import {
  encodeRecording,
  RecordingRpc,
  recordingExplorer,
} from "../src/lib/export/sources/recording"
import { ExportRpcClient, fromHex } from "../src/lib/export/sources/rpc"
import { ExportChainId } from "../src/lib/export/types"

async function main() {
  loadEnvConfig(process.cwd())
  const [
    chainArgument,
    marketArgument,
    blockArgument,
    outputArgument,
    ...positionArguments
  ] = process.argv.slice(2)
  if (!chainArgument || !marketArgument || !blockArgument || !outputArgument) {
    throw new Error(
      "Usage: record-export-fixtures <chainId> <market> <snapshotBlock> <output.json.gz> [positionAddress ...]",
    )
  }

  const chainId = Number(chainArgument) as ExportChainId
  const snapshotBlock = Number(blockArgument)
  const sourceRpc = new ExportRpcClient(chainId)
  const rpc = new RecordingRpc(sourceRpc)
  const recordedExplorer = recordingExplorer(etherscanExplorer)
  const universe = await discoverMarketUniverse(rpc, chainId, snapshotBlock, [
    marketArgument,
  ])
  const market = universe.markets[0]
  if (!market) throw new Error("Requested address is not a supported V2 market")
  const snapshot = await rpc.getBlock(snapshotBlock)
  await buildMarketDataset(
    rpc,
    market,
    snapshotBlock,
    snapshot.hash,
    fromHex(snapshot.timestamp),
    positionArguments,
    recordedExplorer.explorer,
  )
  await writeFile(
    path.resolve(outputArgument),
    encodeRecording(rpc, recordedExplorer.responses),
  )
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  )
  process.exitCode = 1
})
