import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { loadEnvConfig } from "@next/env"
import { Deployments } from "@wildcatfi/wildcat-sdk"
import { utils } from "ethers"

import { buildMarketDataset } from "../src/lib/export/ledger/buildMarketDataset"
import { serializeDataset } from "../src/lib/export/serialize/dataset"
import { discoverMarketUniverse } from "../src/lib/export/sources/discovery"
import {
  ExportRpcClient,
  fromHex,
  toBlockHex,
} from "../src/lib/export/sources/rpc"
import {
  GLASS_DOOR_REFERENCE_BLOCK,
  GLASS_DOOR_REFERENCE_BORROWER,
  GLASS_DOOR_REFERENCE_CHAIN_ID,
} from "../src/lib/glassdoor/reference/product908"

const OUTPUT_DIRECTORY = "src/lib/glassdoor/__fixtures__"
const registry = new utils.Interface([
  "function getRegisteredMarkets(uint256 start, uint256 end) view returns (address[])",
  "function borrower() view returns (address)",
])

async function registeredMarkets(rpc: ExportRpcClient, archController: string) {
  const markets: string[] = []
  for (let start = 0; ; start += 100) {
    const raw = await rpc.call<string>("eth_call", [
      {
        to: archController,
        data: registry.encodeFunctionData("getRegisteredMarkets", [
          start,
          start + 100,
        ]),
      },
      toBlockHex(GLASS_DOOR_REFERENCE_BLOCK),
    ])
    const page = registry.decodeFunctionResult(
      "getRegisteredMarkets",
      raw,
    )[0] as string[]
    markets.push(...page.map((address) => address.toLowerCase()))
    if (page.length < 100) return markets
  }
}

// The registry also lists V1 markets, which export discovery rejects, so pick
// the reference borrower's markets before discovery validates them.
async function borrowerMarkets(rpc: ExportRpcClient, markets: string[]) {
  const borrowers = await rpc.batch<string>(
    markets.map((market) => ({
      method: "eth_call",
      params: [
        { to: market, data: registry.encodeFunctionData("borrower") },
        toBlockHex(GLASS_DOOR_REFERENCE_BLOCK),
      ],
    })),
  )
  return markets.filter(
    (_, index) =>
      String(
        registry.decodeFunctionResult("borrower", borrowers[index])[0],
      ).toLowerCase() === GLASS_DOOR_REFERENCE_BORROWER,
  )
}

async function main() {
  loadEnvConfig(process.cwd())
  const chainId = GLASS_DOOR_REFERENCE_CHAIN_ID
  const rpc = new ExportRpcClient(chainId)
  const snapshot = await rpc.getBlock(GLASS_DOOR_REFERENCE_BLOCK)
  const archController =
    Deployments[chainId].WildcatArchController.toLowerCase()
  const { markets } = await discoverMarketUniverse(
    rpc,
    chainId,
    GLASS_DOOR_REFERENCE_BLOCK,
    await borrowerMarkets(rpc, await registeredMarkets(rpc, archController)),
  )
  if (markets.length === 0)
    throw new Error("Reference borrower has no V2 markets")
  await mkdir(OUTPUT_DIRECTORY, { recursive: true })
  for (const market of markets) {
    const started = Date.now()
    const dataset = await buildMarketDataset(
      rpc,
      market,
      GLASS_DOOR_REFERENCE_BLOCK,
      snapshot.hash,
      fromHex(snapshot.timestamp),
      [],
    )
    const file = path.join(
      OUTPUT_DIRECTORY,
      `reference-${GLASS_DOOR_REFERENCE_BLOCK}-${market.address}.json.gz`,
    )
    await writeFile(file, serializeDataset(dataset))
    process.stdout.write(
      `${market.address} ${dataset.events.length} events in ${Math.round(
        (Date.now() - started) / 1000,
      )}s -> ${file}\n`,
    )
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  )
  process.exitCode = 1
})
