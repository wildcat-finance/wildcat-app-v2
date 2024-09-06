import { SignerOrProvider, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { SubgraphGetMarketsForBorrowerQueryVariables } from "@wildcatfi/wildcat-sdk/dist/gql/graphql"

export type GetMarketsProps = {
  provider: SignerOrProvider | undefined
  chainId: SupportedChainId | undefined
  enabled: boolean
} & Omit<SubgraphGetMarketsForBorrowerQueryVariables, "borrower">
