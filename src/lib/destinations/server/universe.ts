import {
  ApolloClient,
  from,
  gql,
  HttpLink,
  InMemoryCache,
} from "@apollo/client"
import { RetryLink } from "@apollo/client/link/retry"
import {
  type GetWrappedMarketsPageOptions,
  getDeploymentAddress,
  getWrappedMarketsPage,
  hasDeploymentAddress,
  SubgraphUrls,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { type Address, getAddress } from "viem"

import { UPSTREAM_TIMEOUT_MS } from "../constants"
import type { DestinationTokenForm } from "../types"

// The SDK's wrapper discovery page has no asset or borrower, so they are read
// for the same markets at the block that page was indexed at.
const WRAPPED_MARKET_CONTEXT = gql`
  query WrappedMarketContext($ids: [ID!]!, $block: Block_height!) {
    markets(first: 1000, where: { id_in: $ids }, block: $block) {
      id
      borrower
      asset {
        address
      }
    }
  }
`

type WrappedMarketContext = {
  markets: { id: string; borrower: string; asset: { address: string } }[]
}

/** A Wildcat market and the tokens of it that platforms can take. */
export type WildcatToken = {
  market: Address
  asset: Address
  borrower: Address
  wrapper: Address
}

export const tokenAddressOf: Record<
  DestinationTokenForm,
  (token: WildcatToken) => Address
> = {
  wrapper: (token) => token.wrapper,
}

// The inventory is fatal to the whole response, so each request gets one
// retry and every attempt its own timeout.
const createSubgraphClient = (chainId: SupportedChainId) =>
  new ApolloClient({
    cache: new InMemoryCache(),
    link: from([
      new RetryLink({ attempts: { max: 2 } }),
      new HttpLink({
        uri: SubgraphUrls[chainId],
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
          }),
      }),
    ]),
  })

/** Registered markets that have a Wildcat 4626 wrapper, read from the subgraph. */
export const getWildcatTokens = async (
  chainId: SupportedChainId,
): Promise<WildcatToken[]> => {
  if (!hasDeploymentAddress(chainId, "Wildcat4626WrapperFactory")) return []

  const factory = getDeploymentAddress(
    chainId,
    "Wildcat4626WrapperFactory",
  ).toLowerCase()
  const client = createSubgraphClient(chainId)
  const tokens: WildcatToken[] = []
  let after: GetWrappedMarketsPageOptions["after"]

  do {
    // eslint-disable-next-line no-await-in-loop
    const page = await getWrappedMarketsPage(client, { after })
    // Only wrappers deployed by this chain's Wildcat factory count.
    const wrapped = page.items.filter(
      ({ tokenWrapper }) =>
        tokenWrapper.factory.address.toLowerCase() === factory,
    )

    if (wrapped.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await client.query<WrappedMarketContext>({
        query: WRAPPED_MARKET_CONTEXT,
        variables: {
          ids: wrapped.map(({ id }) => id),
          block: { number: page.indexedAt.blockNumber },
        },
        fetchPolicy: "no-cache",
      })
      const contextById = new Map(
        data.markets.map((market) => [market.id.toLowerCase(), market]),
      )

      wrapped.forEach(({ id, tokenWrapper }) => {
        const context = contextById.get(id.toLowerCase())
        if (!context) {
          throw new Error(`Subgraph has no asset or borrower for market ${id}`)
        }
        tokens.push({
          market: getAddress(id),
          wrapper: getAddress(tokenWrapper.address),
          asset: getAddress(context.asset.address),
          borrower: getAddress(context.borrower),
        })
      })
    }

    after = page.pageInfo.nextCursor
  } while (after)

  return tokens
}
