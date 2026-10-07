import { z } from "zod"

import { toHuman } from "@/lib/protocol-stats/format"
import { querySubgraph } from "@/lib/protocol-stats/subgraph"

import type { MorphoMarketParams } from "./chain"
import {
  MAX_DATA_AGE_SEC,
  MIN_AVAILABLE_LIQUIDITY_USD,
  MIN_CURATED_SHARE,
  MIN_CURATED_SUPPLY_USD,
  MORPHO_API_URL,
  MORPHO_APP_CHAIN_SLUG,
  THIN_LIQUIDITY_USD,
  UPSTREAM_TIMEOUT_MS,
} from "../constants"
import type { DestinationNotice } from "../types"

const PAGE_SIZE = 50
const MAX_PAGES = 10

const MARKETS_QUERY = `
query Destinations($collaterals: [String!]!, $chainIds: [Int!]!, $first: Int!, $skip: Int!) {
  markets(first: $first, skip: $skip, where: { listed: true, collateralAssetAddress_in: $collaterals, chainId_in: $chainIds }) {
    pageInfo { countTotal }
    items {
      marketId
      listed
      lltv
      collateralAsset { address symbol }
      loanAsset { address symbol decimals price { usd } }
      warnings { type level }
      state { timestamp supplyAssets supplyAssetsUsd liquidityAssets liquidityAssetsUsd avgBorrowApy }
      supplyingVaults {
        name
        listed
        state {
          owner
          curator
          curators { name addresses { address } }
          allocation { market { marketId } supplyAssets }
        }
      }
      supplyingVaultV2s {
        name
        listed
        owner { address }
        curator { address }
        curators { items { name addresses { address } } }
        caps(first: 100) {
          items {
            allocation
            data { kind: __typename ... on MarketV1CapData { market { marketId } } }
          }
        }
      }
    }
  }
}`

const bigintish = z.union([z.number(), z.string()])

const curatorSchema = z.object({
  name: z.string().nullish(),
  addresses: z.array(z.object({ address: z.string() })).nullish(),
})

const marketSchema = z.object({
  marketId: z.string(),
  listed: z.boolean(),
  lltv: bigintish,
  collateralAsset: z.object({ address: z.string(), symbol: z.string() }),
  loanAsset: z.object({
    address: z.string(),
    symbol: z.string(),
    decimals: z.number(),
    price: z.object({ usd: z.number().nullish() }).nullish(),
  }),
  warnings: z
    .array(z.object({ type: z.string(), level: z.string() }))
    .nullish(),
  state: z
    .object({
      timestamp: bigintish,
      supplyAssets: bigintish,
      supplyAssetsUsd: z.number().nullish(),
      liquidityAssets: bigintish,
      liquidityAssetsUsd: z.number().nullish(),
      avgBorrowApy: z.number().nullish(),
    })
    .nullish(),
  supplyingVaults: z
    .array(
      z.object({
        name: z.string().nullish(),
        listed: z.boolean(),
        state: z
          .object({
            owner: z.string().nullish(),
            curator: z.string().nullish(),
            curators: z.array(curatorSchema).nullish(),
            allocation: z
              .array(
                z.object({
                  market: z.object({ marketId: z.string() }),
                  supplyAssets: bigintish,
                }),
              )
              .nullish(),
          })
          .nullish(),
      }),
    )
    .nullish(),
  supplyingVaultV2s: z
    .array(
      z.object({
        name: z.string().nullish(),
        listed: z.boolean(),
        owner: z.object({ address: z.string() }).nullish(),
        curator: z.object({ address: z.string() }).nullish(),
        curators: z.object({ items: z.array(curatorSchema) }).nullish(),
        caps: z
          .object({
            items: z.array(
              z.object({
                allocation: bigintish,
                data: z
                  .object({
                    kind: z.string(),
                    market: z.object({ marketId: z.string() }).nullish(),
                  })
                  .nullish(),
              }),
            ),
          })
          .nullish(),
      }),
    )
    .nullish(),
})

const pageSchema = z.object({
  markets: z.object({
    pageInfo: z.object({ countTotal: z.number() }),
    items: z.array(z.unknown()),
  }),
})

export type MorphoMarket = z.infer<typeof marketSchema>

const toBigInt = (value: number | string): bigint | null => {
  try {
    return typeof value === "string" ? BigInt(value) : BigInt(Math.trunc(value))
  } catch {
    return null
  }
}

const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export const fetchMorphoMarkets = async (
  chainId: number,
  collaterals: string[],
): Promise<MorphoMarket[]> => {
  const markets = new Map<string, MorphoMarket>()

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { items, pageInfo } = pageSchema.parse(
      // eslint-disable-next-line no-await-in-loop
      await querySubgraph(MORPHO_API_URL, MARKETS_QUERY, {
        variables: {
          collaterals,
          chainIds: [chainId],
          first: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: "no-store",
      }),
    ).markets
    items.forEach((item) => {
      const market = marketSchema.safeParse(item)
      if (market.success)
        markets.set(market.data.marketId.toLowerCase(), market.data)
    })
    if (
      items.length < PAGE_SIZE ||
      (page + 1) * PAGE_SIZE >= pageInfo.countTotal
    ) {
      return Array.from(markets.values())
    }
  }

  throw new Error(
    `Morpho API returned more than ${PAGE_SIZE * MAX_PAGES} markets`,
  )
}

export type CuratedVault = {
  name: string | null
  share: number
  curators: string[]
  addresses: string[]
}

export type MorphoCandidate = {
  marketId: string
  url: string
  venueName: string
  collateral: { address: string; symbol: string }
  loanAsset: { address: string; symbol: string }
  lltv: number
  borrowApy: number | null
  availableLiquidity: number
  availableLiquidityUsd: number
  asOf: number
  notices: DestinationNotice[]
  curators: string[]
  vaults: CuratedVault[]
  leadVaultName: string | null
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, "")

export const evaluateMorphoMarket = ({
  chainId,
  market,
  wrapper,
  asset,
  onchain,
  nowSec,
}: {
  chainId: number
  market: MorphoMarket
  wrapper: string
  asset: string
  onchain: MorphoMarketParams | undefined
  nowSec: number
}): MorphoCandidate | null => {
  const { state, loanAsset, collateralAsset } = market
  const chainSlug = MORPHO_APP_CHAIN_SLUG[chainId]
  if (!chainSlug || !market.listed || !state) return null
  if (market.warnings?.some((warning) => warning.level === "RED")) return null

  const asOf = Number(toBigInt(state.timestamp) ?? 0)
  if (nowSec - asOf > MAX_DATA_AGE_SEC) return null

  const apiLltv = toBigInt(market.lltv)
  if (
    !onchain ||
    apiLltv === null ||
    !sameId(onchain.collateralToken, wrapper) ||
    !sameId(collateralAsset.address, wrapper) ||
    !sameId(onchain.loanToken, asset) ||
    !sameId(loanAsset.address, asset) ||
    Math.abs(Number(onchain.lltv) - Number(apiLltv)) > 1e3
  ) {
    return null
  }

  const supplyRaw = toBigInt(state.supplyAssets) ?? BigInt(0)
  const liquidityRaw = toBigInt(state.liquidityAssets) ?? BigInt(0)
  if (supplyRaw <= BigInt(0)) return null

  const shareOfSupply = (raw: bigint) =>
    Math.min(1, Number((raw * BigInt(10_000)) / supplyRaw) / 10_000)

  let curatedRaw = BigInt(0)
  const vaults: CuratedVault[] = []
  const addVault = (
    name: string | null | undefined,
    supplied: bigint,
    curatorEntries: z.infer<typeof curatorSchema>[] | null | undefined,
    ownAddresses: (string | null | undefined)[],
  ) => {
    curatedRaw += supplied
    const addresses = [
      ...ownAddresses,
      ...(curatorEntries ?? []).flatMap(
        (curator) => curator.addresses?.map(({ address }) => address) ?? [],
      ),
    ].flatMap((address) => (address ? [address.toLowerCase()] : []))
    vaults.push({
      name: name || null,
      share: shareOfSupply(supplied),
      curators: (curatorEntries ?? []).flatMap((curator) =>
        curator.name ? [curator.name] : [],
      ),
      addresses: Array.from(new Set(addresses)),
    })
  }

  market.supplyingVaults?.forEach((vault) => {
    if (!vault.listed || !vault.state) return
    const allocation = vault.state.allocation?.find((entry) =>
      sameId(entry.market.marketId, market.marketId),
    )
    const supplied = allocation ? toBigInt(allocation.supplyAssets) : null
    if (!supplied || supplied <= BigInt(0)) return
    addVault(vault.name, supplied, vault.state.curators, [
      vault.state.owner,
      vault.state.curator,
    ])
  })

  market.supplyingVaultV2s?.forEach((vault) => {
    if (!vault.listed) return
    const supplied = (vault.caps?.items ?? []).reduce((sum, cap) => {
      const capMarket = cap.data?.market?.marketId
      if (
        cap.data?.kind !== "MarketV1CapData" ||
        !capMarket ||
        !sameId(capMarket, market.marketId)
      ) {
        return sum
      }
      return sum + (toBigInt(cap.allocation) ?? BigInt(0))
    }, BigInt(0))
    if (supplied <= BigInt(0)) return
    addVault(vault.name, supplied, vault.curators?.items, [
      vault.owner?.address,
      vault.curator?.address,
    ])
  })

  const curatedShare = shareOfSupply(curatedRaw)
  const price = loanAsset.price?.usd ?? null
  const supplyUsd =
    state.supplyAssetsUsd ??
    (price !== null ? toHuman(supplyRaw, loanAsset.decimals) * price : null)
  const availableLiquidity = toHuman(liquidityRaw, loanAsset.decimals)
  const availableLiquidityUsd =
    state.liquidityAssetsUsd ??
    (price !== null ? availableLiquidity * price : null)

  if (supplyUsd === null || availableLiquidityUsd === null) return null
  if (curatedShare < MIN_CURATED_SHARE) return null
  if (supplyUsd * curatedShare < MIN_CURATED_SUPPLY_USD) return null
  if (availableLiquidityUsd < MIN_AVAILABLE_LIQUIDITY_USD) return null

  const notices: DestinationNotice[] = []
  if (availableLiquidityUsd < THIN_LIQUIDITY_USD) {
    notices.push("THIN_LIQUIDITY")
  }

  return {
    marketId: market.marketId,
    url: `https://app.morpho.org/${chainSlug}/variable/${market.marketId.toLowerCase()}/${slug(
      loanAsset.symbol,
    )}-${slug(collateralAsset.symbol)}`,
    venueName: `${collateralAsset.symbol} / ${loanAsset.symbol}`,
    collateral: {
      address: collateralAsset.address,
      symbol: collateralAsset.symbol,
    },
    loanAsset: { address: loanAsset.address, symbol: loanAsset.symbol },
    lltv: Number(onchain.lltv) / 1e18,
    borrowApy: state.avgBorrowApy ?? null,
    availableLiquidity,
    availableLiquidityUsd,
    asOf,
    notices,
    curators: Array.from(new Set(vaults.flatMap((vault) => vault.curators))),
    vaults,
    leadVaultName:
      [...vaults].sort((a, b) => b.share - a.share).find((vault) => vault.name)
        ?.name ?? null,
  }
}
