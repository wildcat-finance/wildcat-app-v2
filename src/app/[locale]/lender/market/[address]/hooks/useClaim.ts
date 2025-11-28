import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LenderWithdrawalStatus, Market } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

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
      const chainId = market.chainId
      const marketAddress = market.address
      const lenderAddress = address?.toLowerCase()

      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(chainId, marketAddress),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(chainId, marketAddress),
      })
      if (lenderAddress) {
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT(
            chainId,
            marketAddress,
            lenderAddress,
            "initial",
          ),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT(
            chainId,
            marketAddress,
            lenderAddress,
            "update",
          ),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_WITHDRAWALS.INITIAL(
            chainId,
            lenderAddress,
            marketAddress,
          ),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_WITHDRAWALS.UPDATE(
            chainId,
            lenderAddress,
            marketAddress,
          ),
        })
      }
    },
    onError(error) {
      console.log(error)
    },
  })
}
