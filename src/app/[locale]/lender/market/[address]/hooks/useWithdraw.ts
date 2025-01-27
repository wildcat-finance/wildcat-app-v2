import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"
import { useAccount } from "wagmi"

import { GET_WITHDRAWALS_KEY } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { GET_MARKET_KEY } from "@/hooks/useGetMarket"

export const useWithdraw = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  queueFullWithdrawal?: boolean,
) => {
  const { address } = useAccount()
  const client = useQueryClient()

  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (amount: string) => {
      if (!marketAccount || !address) {
        return
      }

      const tokenAmount = new TokenAmount(
        parseUnits(amount, marketAccount.market.underlyingToken.decimals),
        marketAccount.market.underlyingToken,
      )

      const withdraw = async () => {
        const tx = queueFullWithdrawal
          ? await marketAccount.queueFullWithdrawal()
          : await marketAccount.queueWithdrawal(tokenAmount)

        if (!safeConnected) setTxHash(tx.transaction.hash)

        if (safeConnected) {
          const checkTransaction = async () => {
            const transactionBySafeHash = await sdk.txs.getBySafeTxHash(
              tx.transaction.hash,
            )
            if (transactionBySafeHash?.txHash) {
              setTxHash(transactionBySafeHash.txHash)
            } else {
              setTimeout(checkTransaction, 1000)
            }
          }

          await checkTransaction()
        }

        return tx.transaction.wait()
      }

      await withdraw()
    },
    onSuccess() {
      client.invalidateQueries({ queryKey: [GET_MARKET_KEY] })
      client.invalidateQueries({ queryKey: [GET_WITHDRAWALS_KEY] })
    },
    onError(/* error, amount */) {
      // console.log(error, amount)
    },
  })
}
