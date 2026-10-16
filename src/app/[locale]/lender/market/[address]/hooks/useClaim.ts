import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LenderWithdrawalStatus, Market } from "@wildcatfi/wildcat-sdk"
import { useAccount, usePublicClient } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { invalidateMarketListQueries } from "@/utils/marketListQueries"

import {
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
  const publicClient = usePublicClient({ chainId: market.chainId })

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
      if (!claimableWithdrawals.length || !address || !publicClient) throw Error

      await preflightWithdrawalClaim({
        publicClient,
        account: address,
        transaction: prepareWithdrawalClaim(
          market.address,
          claimableWithdrawals,
        ),
        expiries: claimableWithdrawals.map(({ expiry }) => expiry),
      })

      const claim = async () => {
        const tx =
          claimableWithdrawals.length === 1
            ? await market.executeWithdrawal(claimableWithdrawals[0])
            : await market.executeWithdrawals(claimableWithdrawals)

        if (!safeConnected) setTxHash(tx.hash)

        if (safeConnected) {
          const checkTransaction = async () => {
            const transactionBySafeHash = await sdk.txs.getBySafeTxHash(tx.hash)
            if (transactionBySafeHash?.txHash) {
              setTxHash(transactionBySafeHash.txHash)
            } else {
              setTimeout(checkTransaction, 1000)
            }
          }

          await checkTransaction()
        }

        return tx.wait()
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
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.PREFIX(
          market.chainId,
          market.address,
        ),
      })
      invalidateMarketListQueries({ client, chainId: market.chainId })
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
