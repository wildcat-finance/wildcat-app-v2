import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Market, Signer, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { toastRequest } from "@/components/Toasts"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { invalidateMarketAccountQueries } from "@/utils/marketAccountQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useApprove = (
  token: Token,
  market: Market,
  setTxHash?: (hash: string) => void,
) => {
  const { targetChainId } = useCurrentNetwork()
  const { address } = useAccount()
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk, safe } = useSafeAppsSDK()

  const mutation = useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!market || !signer || !address) {
        throw Error("Market or signing account not available")
      }
      const signingChainId = safeConnected ? safe.chainId : signer.chainId
      const signingAddress = safeConnected
        ? safe.safeAddress
        : await signer.getAddress()
      if (
        market.chainId !== targetChainId ||
        market.chainId !== signingChainId
      ) {
        throw Error(
          `Market chainId does not match active chainId:` +
            ` Market ${market.chainId},` +
            ` Target ${targetChainId}, Signing ${signingChainId}`,
        )
      }
      if (
        !signingAddress ||
        signingAddress.toLowerCase() !== address.toLowerCase()
      ) {
        throw Error("Signing account does not match connected account")
      }

      const approve = async () => {
        const hash = await token.approve(
          market.address.toLowerCase(),
          tokenAmount,
        )

        if (!safeConnected && setTxHash) setTxHash(hash.toString())

        if (safeConnected) {
          const checkTransaction = async () => {
            const transactionBySafeHash = await sdk.txs.getBySafeTxHash(
              hash.toString(),
            )
            if (transactionBySafeHash?.txHash) {
              if (setTxHash) setTxHash(transactionBySafeHash.txHash)
            } else {
              setTimeout(checkTransaction, 1000)
            }
          }

          await checkTransaction()
        }

        return waitForSubmittedTransaction({
          provider: Signer.isSigner(token.provider)
            ? token.provider.provider
            : token.provider,
          hash,
          safeConnected,
          safeSdk: sdk,
        })
      }

      await approve()
    },
    onSuccess() {
      invalidateMarketAccountQueries({
        client,
        chainId: market.chainId,
        marketAddress: market.address,
        accountAddress: address,
      })
    },
  })

  const approveWithToast = async (tokenAmount: TokenAmount) => {
    await toastRequest(mutation.mutateAsync(tokenAmount), {
      pending: `Approving ${tokenAmount.format()} ${token.symbol}...`,
      success: `Successfully approved ${tokenAmount.format()} ${token.symbol}`,
      error: "Failed to approve",
    })
  }

  return {
    mutateAsync: approveWithToast,
    mutate: (tokenAmount: TokenAmount) => {
      approveWithToast(tokenAmount).catch(console.error)
    },
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  }
}
