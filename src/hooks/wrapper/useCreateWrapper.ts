import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  Market,
  Signer,
  SupportedChainId,
  WrapperFactory,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

const WRAPPER_TRANSFERS_DISABLED_ERROR =
  "A wrapper cannot be deployed when market transfers are disabled"

type SafeTransactionDetails = {
  txStatus?:
    | "AWAITING_CONFIRMATIONS"
    | "AWAITING_EXECUTION"
    | "CANCELLED"
    | "FAILED"
    | "SUCCESS"
  txHash?: string | null
}

type SafeSdkLike = {
  txs: {
    getBySafeTxHash: (
      safeTxHash: string,
    ) => Promise<SafeTransactionDetails | null | undefined>
  }
}

// Resolves with the executed tx hash; rejects if the Safe tx is cancelled or
// fails, so the deploy toast and pending state do not hang forever.
const waitForSafeTransactionExecution = async (
  sdk: SafeSdkLike,
  safeTxHash: string,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const transaction = await sdk.txs.getBySafeTxHash(safeTxHash)
        if (
          transaction?.txStatus === "CANCELLED" ||
          transaction?.txStatus === "FAILED"
        ) {
          reject(
            new Error(`Safe transaction ${transaction.txStatus.toLowerCase()}`),
          )
          return
        }
        if (transaction?.txHash) {
          resolve(transaction.txHash)
          return
        }
        setTimeout(check, 1000)
      } catch (error) {
        reject(error)
      }
    }
    check()
  })

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

  // Keyed per market so a deploy still in flight keeps the button locked when
  // the deployment view remounts (a failed wrapper lookup or a section switch
  // unmounts it); a fresh observer alone would report the mutation as idle.
  const mutationKey = [
    "createWrapper",
    market?.chainId,
    market?.address.toLowerCase(),
  ]
  const deploysInFlight = useIsMutating({ mutationKey })

  const mutation = useMutation({
    mutationKey,
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
        const { safeTxHash } = await sdk.txs.send({ txs: [tx] })
        const transactionHash = await waitForSafeTransactionExecution(
          sdk,
          safeTxHash,
        )
        await sdk.eth.getTransactionReceipt([transactionHash])
        return transactionHash
      }

      const { wrapper: createdWrapper } = await WrapperFactory.createWrapper(
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
    isCreatingWrapper: mutation.isPending || deploysInFlight > 0,
  }
}
