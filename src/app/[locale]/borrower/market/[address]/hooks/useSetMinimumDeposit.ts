import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"

import { useEthersSigner } from "@/hooks/useEthersSigner"
import {
  GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY,
  GET_MARKET_ACCOUNT_KEY,
} from "@/hooks/useGetMarketAccount"

export const useSetMinimumDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (newMinDeposit: string) => {
      if (!marketAccount || !signer) {
        return
      }

      const tokenAmount =
        marketAccount.market.underlyingToken.parseAmount(newMinDeposit)

      const setMinDeposit = async () => {
        const tx = await marketAccount.setMinimumDeposit(tokenAmount)

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

      await setMinDeposit()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
      })
      client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })
    },
    onError(error) {
      console.log(error)
    },
  })
}
