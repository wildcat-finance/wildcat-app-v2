import { Deployments } from "@wildcatfi/wildcat-sdk"
import { utils } from "ethers"

import { metadataInterface } from "../../export/abi/registry"
import { discoverMarketUniverse } from "../../export/sources/discovery"
import { ExportRpc, toBlockHex } from "../../export/sources/rpc"
import { ExportChainId, MarketMetadata } from "../../export/types"

const registryInterface = new utils.Interface([
  "function getRegisteredMarkets(uint256 start, uint256 end) view returns (address[])",
])
const PAGE = 100

export const registryContracts = (chainId: ExportChainId) => {
  const deployment = Deployments[chainId as keyof typeof Deployments]
  return [deployment.WildcatArchController, deployment.HooksFactory]
    .filter(Boolean)
    .map((address) => address.toLowerCase())
}

async function registeredMarkets(
  rpc: ExportRpc,
  chainId: ExportChainId,
  block: number,
) {
  const [archController] = registryContracts(chainId)
  const markets: string[] = []
  for (let start = 0; ; start += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const raw = await rpc.call<string>("eth_call", [
      {
        to: archController,
        data: registryInterface.encodeFunctionData("getRegisteredMarkets", [
          start,
          start + PAGE,
        ]),
      },
      toBlockHex(block),
    ])
    const page = registryInterface.decodeFunctionResult(
      "getRegisteredMarkets",
      raw,
    )[0] as string[]
    markets.push(...page.map((address) => address.toLowerCase()))
    if (page.length < PAGE) return markets
  }
}

/**
 * Metadata for every V2 market registered at `block`, from the on-chain
 * registry, plus any `known` markets seen earlier: once seen, a market is
 * never dropped. Known markets carry their deployment block, which skips its
 * binary search, and markets in `stored` (known markets whose metadata the
 * caller already has) are skipped entirely. The registry also lists V1
 * markets, which export discovery rejects, so their version() is checked
 * first.
 *
 * A new market's deployment block takes a binary search, so at most `maxNew`
 * new markets are admitted per call, oldest registration first; `deferred`
 * counts the rest, which a later call picks up.
 */
export async function discoverV2Markets(
  rpc: ExportRpc,
  chainId: ExportChainId,
  block: number,
  {
    known = new Map(),
    stored = new Set(),
    maxNew = Number.POSITIVE_INFINITY,
  }: {
    known?: ReadonlyMap<string, number>
    stored?: ReadonlySet<string>
    maxNew?: number
  } = {},
): Promise<{ markets: MarketMetadata[]; deferred: number }> {
  const registered = [
    ...new Set([
      ...(await registeredMarkets(rpc, chainId, block)),
      ...known.keys(),
    ]),
  ].filter((market) => !stored.has(market))
  if (registered.length === 0) return { markets: [], deferred: 0 }
  const versions = await rpc.batch<string>(
    registered.map((market) => ({
      method: "eth_call",
      params: [
        { to: market, data: metadataInterface.encodeFunctionData("version") },
        toBlockHex(block),
      ],
    })),
  )
  const v2 = registered.filter((_, index) =>
    /^2(?:\.0)?$/.test(
      String(
        metadataInterface.decodeFunctionResult("version", versions[index])[0],
      ),
    ),
  )
  const unseen = v2.filter((market) => !known.has(market))
  const admitted = new Set(unseen.slice(0, maxNew))
  const selection = v2.filter(
    (market) => known.has(market) || admitted.has(market),
  )
  if (selection.length === 0) return { markets: [], deferred: unseen.length }
  const { markets } = await discoverMarketUniverse(
    rpc,
    chainId,
    block,
    selection,
    known,
  )
  return { markets, deferred: unseen.length - admitted.size }
}
