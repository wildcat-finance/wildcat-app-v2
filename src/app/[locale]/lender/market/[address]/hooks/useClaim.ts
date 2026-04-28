import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LenderWithdrawalStatus, Market } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useClaim = (
  market: Market,
  withdrawals: LenderWithdrawalStatus[],
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const client = useQueryClient()
  const { address } = useAccount()
  const { targetChainId } = useCurrentNetwork()

  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async () => {
      if (market.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }
      const claimableWithdrawals = withdrawals.filter((w) =>
        w.availableWithdrawalAmount.gt(0),
      )
      if (!market || !claimableWithdrawals.length || !address) throw Error

      const claim = async () => {
        const hash =
          claimableWithdrawals.length === 1
            ? await market.executeWithdrawal(claimableWithdrawals[0])
            : await market.executeWithdrawals(claimableWithdrawals)

        if (!safeConnected) setTxHash(hash)

        const { hash: transactionHash, receipt } =
          await waitForSubmittedTransaction({
            provider: market.signer.provider,
            hash,
            safeConnected,
            safeSdk: sdk,
          })
        setTxHash(transactionHash)
        return receipt
      }

      await claim()
    },
    onSuccess() {
      const lender = address?.toLowerCase()
      const marketAddress = market.address.toLowerCase()

      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(market.chainId, market.address),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
          market.chainId,
          market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Lender.GET_WITHDRAWALS.PREFIX(
          market.chainId,
          lender,
          marketAddress,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
