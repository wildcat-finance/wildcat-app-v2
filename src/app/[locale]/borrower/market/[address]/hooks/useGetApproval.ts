import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import {
  isApprovalAllowanceSufficient,
  isApprovalAllowanceMismatchError,
  rejectOnTransactionCancelled,
  toReceiptRequestProvider,
  waitForApproval,
} from "@/utils/transactions"

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
        const tx = await token.contract.approve(
          market.address.toLowerCase(),
          tokenAmount.raw,
        )

        return waitForApproval({
          provider: toReceiptRequestProvider(signer.provider),
          hash: tx.hash,
          isAllowanceSufficient: async () => {
            const allowance = await token.contract.allowance(
              signingAddress,
              market.address,
            )
            return isApprovalAllowanceSufficient(
              allowance.toBigInt(),
              tokenAmount.raw.toBigInt(),
            )
          },
          safeConnected,
          safeSdk: sdk,
          onTransactionHash: setTxHash,
          cancelled: safeConnected
            ? undefined
            : rejectOnTransactionCancelled(tx),
        })
      }

      return approve()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.PREFIX(
          market.chainId,
          market.address,
          address,
        ),
      })
    },
  })

  const approveWithToast = async (tokenAmount: TokenAmount) => {
    await toastRequest(mutation.mutateAsync(tokenAmount), {
      pending: `Approving ${tokenAmount.format()} ${token.symbol}...`,
      success: (confirmation) =>
        confirmation.confirmedBy === "allowance"
          ? `${tokenAmount.format()} ${token.symbol} allowance is ready`
          : `Successfully approved ${tokenAmount.format()} ${token.symbol}`,
      getErrorMessage: (error) =>
        isApprovalAllowanceMismatchError(error)
          ? `Approved ${token.symbol} allowance is smaller than requested`
          : "Failed to approve",
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
