import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, Signer, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { invalidateMarketStateQueries } from "@/utils/marketStateQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

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
        const hash =
          await marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
            tokenAmount,
            maxBatches,
          )

        if (!safeConnected) setTxHash(hash.toString())

        const { hash: transactionHash, receipt } =
          await waitForSubmittedTransaction({
            provider: marketAccount.market.signer.provider,
            hash,
            safeConnected,
            safeSdk: sdk,
          })
        setTxHash(transactionHash)
        return receipt
      }

      await processWithdrawalBatch()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      invalidateMarketStateQueries({
        client,
        chainId: marketAccount.market.chainId,
        marketAddress: marketAccount.market.address,
        accountAddress: marketAccount.account,
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
    },
  })
}
