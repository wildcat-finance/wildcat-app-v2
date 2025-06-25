import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  getCollateralLensContract,
  Market,
  SignerOrProvider,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import {
  getCollateralContractsForMarketFromSubgraph,
  MarketCollateralV1,
} from "@wildcatfi/wildcat-sdk/dist/collateral"
import { BigNumber } from "ethers"
import { useAccount } from "wagmi"

import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthersSigner"

export const GET_COLLATERAL_CONTRACTS_QUERY_KEY = "get-collateral-contracts"

export function useGetCollateralContracts(market: Market) {
  const { provider } = useEthersProvider()
  return useQuery({
    queryKey: [GET_COLLATERAL_CONTRACTS_QUERY_KEY, market.address],
    enabled: !!provider,
    refetchInterval: POLLING_INTERVAL,
    queryFn: () =>
      getCollateralContractsForMarketFromSubgraph(
        SubgraphClient,
        TargetChainId,
        provider as SignerOrProvider,
        market,
      ),
  })
}

export const GET_UPDATED_COLLATERAL_CONTRACT_QUERY_KEY =
  "get-updated-collateral-contract"

export type CollateralDepositor = {
  allowanceCollateralAsset: TokenAmount
  balanceCollateralAsset: TokenAmount
  lastFullLiquidationIndex: number
  shares: BigNumber
  sharesValue: TokenAmount
}

export function useUpdatedCollateralContract(collateral: MarketCollateralV1) {
  const signer = useEthersSigner()
  const { address } = useAccount()
  async function updateCollateralContract(): Promise<{
    collateral: MarketCollateralV1
    depositor?: CollateralDepositor
  }> {
    const lens = getCollateralLensContract(
      collateral.market.chainId,
      collateral.provider,
    )
    if (address && signer) {
      const [collateralData, depositorData] =
        await lens.getCollateralContractWithDepositor(
          collateral.address,
          address,
        )
      collateral.updateWith(collateralData)
      collateral.provider = signer
      const sharesValue = collateral.availableCollateral.mulDiv(
        depositorData.shares,
        collateralData.totalShares,
      )
      const depositor = {
        allowanceCollateralAsset: collateral.collateralAsset.getAmount(
          depositorData.allowanceCollateralAsset,
        ),
        balanceCollateralAsset: collateral.collateralAsset.getAmount(
          depositorData.balanceCollateralAsset,
        ),
        lastFullLiquidationIndex:
          depositorData.lastFullLiquidationIndex.toNumber(),
        shares: depositorData.shares,
        sharesValue,
      }
      return { collateral, depositor }
    }
    const update = await lens.getCollateralContract(collateral.address)
    collateral.updateWith(update)
    return { collateral }
  }

  const { data, ...result } = useQuery({
    queryKey: [GET_UPDATED_COLLATERAL_CONTRACT_QUERY_KEY, collateral?.address],
    queryFn: updateCollateralContract,
    enabled: !!collateral,
    refetchInterval: POLLING_INTERVAL,
    placeholderData: keepPreviousData,
  })

  return {
    ...result,
    collateral: data?.collateral ?? collateral,
    depositor: data?.depositor,
  }
}
