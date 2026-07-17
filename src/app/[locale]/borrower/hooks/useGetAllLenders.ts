import { useQuery } from "@tanstack/react-query"
import {
  getAllHooksDataForBorrower,
  getPolicyMarketsAndLenders,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  SubgraphClientType,
  useSubgraphClient,
} from "@/providers/SubgraphProvider"

export const GET_ALL_LENDERS = "GET_ALL_LENDERS"

export type AllLendersData = {
  addresses: string[]
  lenders: {
    [address: string]: {
      lender: string
      authorized: boolean
      markets: {
        marketIds: string[]
        markets: {
          [address: string]: {
            id: string
            name: string
          }
        }
      }
    }
  }
}

export const getAllLenders = async (
  subgraphClient: SubgraphClientType,
  address: string,
  chainId: SupportedChainId,
  signerOrProvider: SignerOrProvider,
) => {
  const { controller } = await getAllHooksDataForBorrower(subgraphClient, {
    borrower: address,
    chainId,
    signerOrProvider,
    fetchPolicy: "network-only",
  })

  const allLenders: AllLendersData = {
    addresses: [],
    lenders: {},
  }

  if (!controller) return allLenders

  const { lenders, markets } = await getPolicyMarketsAndLenders(
    subgraphClient,
    {
      contractAddress: controller.address.toLowerCase(),
      chainId,
      signerOrProvider,
      fetchPolicy: "network-only",
    },
  )
  const activeMarkets = markets.filter((market) => !market.isClosed)

  lenders.forEach((lender) => {
    const lenderAddress = lender.address.toLowerCase()
    // V1 lender authorization is controller-wide. `lender.activeMarkets`
    // describes positions, not the markets to which the authorization applies.
    const marketIds = activeMarkets.map((market) => market.address)
    allLenders.addresses.push(lenderAddress)
    allLenders.lenders[lenderAddress] = {
      lender: lender.address,
      authorized: lender.isAuthorizedOnController ?? false,
      markets: {
        marketIds,
        markets: Object.fromEntries(
          activeMarkets.map((market) => [
            market.address,
            { id: market.address, name: market.name },
          ]),
        ),
      },
    }
  })

  return allLenders
}

export const useGetAllLenders = () => {
  const { isWrongNetwork } = useCurrentNetwork()
  const { chainId } = useSelectedNetwork()
  const { address } = useAccount()
  const { provider, signer } = useEthersProvider({ chainId })
  const signerOrProvider = signer ?? provider
  const subgraphClient = useSubgraphClient()

  return useQuery({
    queryKey: [GET_ALL_LENDERS, chainId, address?.toLowerCase()],
    queryFn: () =>
      getAllLenders(
        subgraphClient,
        address!,
        chainId,
        signerOrProvider as SignerOrProvider,
      ),
    refetchInterval: POLLING_INTERVAL,
    enabled: !!address && !!signerOrProvider && !isWrongNetwork,
  })
}
