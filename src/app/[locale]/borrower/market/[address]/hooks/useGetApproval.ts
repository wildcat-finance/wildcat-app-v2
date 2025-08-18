import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import {
  GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY,
  GET_MARKET_ACCOUNT_KEY,
} from "@/hooks/useGetMarketAccount"

export const useApprove = (
  token: Token,
  market: Market,
  setTxHash?: (hash: string) => void,
) => {
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  const mutation = useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!market) {
        throw Error("Market not available")
      }

      const approve = async () => {
        const tx = await token.contract.approve(
          market.address.toLowerCase(),
          tokenAmount.raw,
        )

        if (!safeConnected && setTxHash) setTxHash(tx.hash)

        if (safeConnected) {
          const checkTransaction = async () => {
            const transactionBySafeHash = await sdk.txs.getBySafeTxHash(tx.hash)
            if (transactionBySafeHash?.txHash) {
              if (setTxHash) setTxHash(transactionBySafeHash.txHash)
            } else {
              setTimeout(checkTransaction, 1000)
            }
          }

          await checkTransaction()
        }

        return tx.wait()
      }

      await approve()
    },
    onSuccess() {
      client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
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
