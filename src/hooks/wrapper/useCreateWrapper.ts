import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Market,
  Signer,
  SupportedChainId,
  WrapperFactory,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { WRAPPER_TRANSFERS_DISABLED_ERROR } from "@/utils/createMarketDeploy"
import {
  assertTransactionSucceeded,
  waitForSafeTransactionExecution,
} from "@/utils/transactions"

type UseCreateWrapperParams = {
  market: Market | undefined
  hasFactory: boolean
  isDifferentChain: boolean
}

export const useCreateWrapper = ({
  market,
  hasFactory,
  isDifferentChain,
}: UseCreateWrapperParams) => {
  const { targetChainId } = useCurrentNetwork()
  const { signer } = useEthersProvider({ chainId: market?.chainId })
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const client = useQueryClient()

  const transfersDisabled = market?.hooksConfig?.transfersDisabled === true
  const canCreateWrapper =
    !!market &&
    hasFactory &&
    !transfersDisabled &&
    !!signer &&
    Signer.isSigner(signer) &&
    !isDifferentChain &&
    market.chainId === targetChainId

  const mutation = useMutation({
    mutationFn: async () => {
      if (!market || !signer) throw new Error("Missing market or signer")
      if (!hasFactory) {
        throw new Error("Wrapper factory is not available on this chain")
      }
      if (transfersDisabled) {
        throw new Error(WRAPPER_TRANSFERS_DISABLED_ERROR)
      }
      if (isDifferentChain || market.chainId !== targetChainId) {
        throw new Error(
          `Market chainId does not match target chainId:` +
            ` Market ${market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const chainId = market.chainId as SupportedChainId
      if (safeConnected) {
        if (!sdk) throw new Error("No Safe SDK")
        const tx = WrapperFactory.populateCreateWrapper(
          chainId,
          signer,
          market.address,
        )
        const { safeTxHash } = await sdk.txs.send({
          txs: [toSafeTransactionInput(tx)],
        })
        const transactionHash = await waitForSafeTransactionExecution(
          sdk,
          safeTxHash,
        )
        assertTransactionSucceeded(
          await sdk.eth.getTransactionReceipt([transactionHash]),
          transactionHash,
        )
        return transactionHash
      }

      const { result: createdWrapper } = await WrapperFactory.createWrapper(
        chainId,
        signer,
        market.address,
      )
      return createdWrapper
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_WRAPPER_FOR_MARKET(
          market?.chainId ?? 0,
          market?.address,
        ),
      })
    },
  })

  return {
    canCreateWrapper,
    transfersDisabled,
    createWrapper: mutation.mutateAsync,
    isCreatingWrapper: mutation.isPending,
  }
}
