import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LenderWithdrawalStatus, Market } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useWildcatClient } from "@/hooks/useEthersSigner"
import { invalidateMarketAccountQueries } from "@/utils/marketAccountQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

import {
  isWithdrawalExecutable,
  prepareWithdrawalClaim,
  preflightWithdrawalClaim,
} from "./withdrawalClaim"

export const useClaim = (
  market: Market,
  withdrawals: LenderWithdrawalStatus[],
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const client = useQueryClient()
  const { address } = useAccount()
  const { targetChainId } = useCurrentNetwork()
  const { publicClient } = useWildcatClient({ chainId: market.chainId })

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
      const claimableWithdrawals = withdrawals.filter(isWithdrawalExecutable)
      if (!claimableWithdrawals.length || !address || !publicClient) throw Error

      const transaction = prepareWithdrawalClaim(
        market.address,
        claimableWithdrawals,
      )
      await preflightWithdrawalClaim({
        publicClient,
        account: address,
        transaction,
        expiries: claimableWithdrawals.map(({ expiry }) => expiry),
      })

      const claim = async () => {
        const hash =
          claimableWithdrawals.length === 1
            ? await market.executeWithdrawal(claimableWithdrawals[0])
            : await market.executeWithdrawals(claimableWithdrawals)

        if (!safeConnected) setTxHash(hash.toString())

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
      invalidateMarketAccountQueries({
        client,
        chainId: market.chainId,
        marketAddress,
        accountAddress: lender,
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Lender.GET_WITHDRAWALS.PREFIX(
          market.chainId,
          lender,
          marketAddress,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(
          market.chainId,
          marketAddress,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
