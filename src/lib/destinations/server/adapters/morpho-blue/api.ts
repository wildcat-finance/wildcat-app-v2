import type { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { z } from "zod"

import { querySubgraph } from "@/lib/protocol-stats/subgraph"

import { MORPHO_API_URL } from "./constants"
import { UPSTREAM_TIMEOUT_MS } from "../../../constants"

const PAGE_SIZE = 50
const MAX_PAGES = 10

const MARKETS_QUERY = `
query Destinations($collaterals: [String!]!, $chainIds: [Int!]!, $first: Int!, $skip: Int!) {
  markets(first: $first, skip: $skip, where: { listed: true, collateralAssetAddress_in: $collaterals, chainId_in: $chainIds }) {
    pageInfo { countTotal }
    items {
      marketId
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
export type MorphoCurator = z.infer<typeof curatorSchema>

export const fetchMorphoMarkets = async (
  chainId: SupportedChainId,
  collaterals: string[],
): Promise<MorphoMarket[]> => {
  const markets = new Map<string, MorphoMarket>()
  let received = 0
  let invalid = 0

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
    const results = items.map((item) => marketSchema.safeParse(item))
    received += results.length
    results.forEach((result) => {
      if (result.success) {
        markets.set(result.data.marketId.toLowerCase(), result.data)
      }
    })
    invalid += results.filter((result) => !result.success).length
    if (
      items.length < PAGE_SIZE ||
      (page + 1) * PAGE_SIZE >= pageInfo.countTotal
    ) {
      // A schema change upstream must not be cached as "no destinations".
      if (received > 0 && invalid === received) {
        throw new Error(`Morpho API: all ${received} markets failed validation`)
      }
      if (invalid > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Destinations] Morpho API: ${invalid} of ${received} markets failed validation`,
        )
      }
      return Array.from(markets.values())
    }
  }

  throw new Error(
    `Morpho API returned more than ${PAGE_SIZE * MAX_PAGES} markets`,
  )
}
