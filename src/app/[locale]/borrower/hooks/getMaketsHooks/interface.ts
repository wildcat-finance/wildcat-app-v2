import { SignerOrProvider, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { SubgraphGetMarketsWithEventsQueryVariables } from "@wildcatfi/wildcat-sdk/dist/gql/graphql"

export type GetMarketsProps = {
  borrowerAddress?: `0x${string}`
  provider: SignerOrProvider | undefined
  chainId: SupportedChainId | undefined
  enabled: boolean
} & Omit<SubgraphGetMarketsWithEventsQueryVariables, "borrower">
