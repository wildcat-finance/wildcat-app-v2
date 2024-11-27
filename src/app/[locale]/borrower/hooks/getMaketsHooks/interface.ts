import { SignerOrProvider, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { SubgraphGetMarketsWithEventsQueryVariables } from "@wildcatfi/wildcat-sdk/dist/gql/graphql"

export type GetMarketsProps = {
  provider: SignerOrProvider | undefined
  chainId: SupportedChainId | undefined
  enabled: boolean
} & Omit<SubgraphGetMarketsWithEventsQueryVariables, "borrower">
