import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, Signer, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export const useProcessUnpaidWithdrawalBatch = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  return useMutation({
    mutationFn: async ({
      tokenAmount,
      maxBatches,
    }: {
      tokenAmount: TokenAmount
      maxBatches: number
    }) => {
      if (!marketAccount || !Signer.isSigner(marketAccount.market.provider)) {
        return
      }
      if (targetChainId !== marketAccount.market.chainId) {
        throw Error(
          `Target chainId does not match market chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const processWithdrawalBatch = async () => {
        const tx =
          await marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
            tokenAmount,
            maxBatches,
          )

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

      await processWithdrawalBatch()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          marketAccount.market.chainId,
          marketAccount.market.borrower,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
          marketAccount.market.chainId,
          "initial",
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
          marketAccount.market.chainId,
          "update",
          marketAccount.market.address,
        ),
      })
    },
  })
}
