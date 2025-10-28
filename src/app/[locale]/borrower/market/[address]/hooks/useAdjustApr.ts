import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthersSigner"

export const useAdjustAPR = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const { signer, address, targetChainId } = useEthersProvider()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!marketAccount || !signer) {
        return
      }
      if (marketAccount.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const setApr = async () => {
        const tx = await marketAccount.setAnnualInterestBips(amount * 100)

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

      await setApr()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          marketAccount.market.chainId,
          address,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
