import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { toastRequest } from "@/components/Toasts"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { invalidateMarketAccountQueries } from "@/utils/marketAccountQueries"
import {
  isApprovalAllowanceSufficient,
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
        const hash = await token.approve(
          market.address.toLowerCase(),
          tokenAmount,
        )

        return waitForApproval({
          provider: signer.provider,
          hash,
          isAllowanceSufficient: async () => {
            const allowance = await token.allowance(
              signingAddress,
              market.address,
            )
            return isApprovalAllowanceSufficient(allowance.raw, tokenAmount.raw)
          },
          safeConnected,
          safeSdk: sdk,
          onTransactionHash: setTxHash,
        })
      }

      return approve()
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
      success: (confirmation) =>
        confirmation.allowanceSatisfied === false
          ? `Approved a smaller ${token.symbol} allowance than requested`
          : `Successfully approved ${tokenAmount.format()} ${token.symbol}`,
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
