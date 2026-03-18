import { Dispatch } from "react"

import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, Signer, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"

export const useProcessUnpaidWithdrawalBatch = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  getParentContext?: () => ReturnType<typeof context.active> | null,
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
      await withClientSpan(
        "market.repay_and_process_unpaid_batches",
        async (span) => {
          if (
            !marketAccount ||
            !Signer.isSigner(marketAccount.market.provider)
          ) {
            throw Error("Missing signer or market account")
          }
          if (targetChainId !== marketAccount.market.chainId) {
            throw Error(
              `Target chainId does not match market chainId:` +
                ` Market ${marketAccount.market.chainId},` +
                ` Target ${targetChainId}`,
            )
          }

          span.setAttributes({
            "token.address": tokenAmount.token.address,
            "token.symbol": tokenAmount.token.symbol,
            "token.amount": tokenAmount.raw.toString(),
            "withdrawal.max_batches": maxBatches,
          })

          const tx =
            await marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
              tokenAmount,
              maxBatches,
            )

          span.setAttribute("tx.hash", tx.hash)

          if (safeConnected) {
            const checkTransaction = async () => {
              const transactionBySafeHash = await sdk.txs.getBySafeTxHash(
                tx.hash,
              )
              if (transactionBySafeHash?.txHash) {
                setTxHash(transactionBySafeHash.txHash)
              } else {
                setTimeout(checkTransaction, 1000)
              }
            }

            await checkTransaction()
          }

          await tx.wait()
        },
        {
          parentContext: getParentContext?.() ?? context.active(),
          attributes: {
            "market.address": marketAccount.market.address,
            "market.chain_id": marketAccount.market.chainId,
            "safe.connected": safeConnected,
          },
        },
      )
    },
    onSuccess() {
      const initialWithdrawalsKey = QueryKeys.Borrower.GET_WITHDRAWALS(
        marketAccount.market.chainId,
        "initial",
        marketAccount.market.address,
      )
      const updateWithdrawalsKey = QueryKeys.Borrower.GET_WITHDRAWALS(
        marketAccount.market.chainId,
        "update",
        marketAccount.market.address,
      )

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
        queryKey: initialWithdrawalsKey,
      })
      client.invalidateQueries({
        queryKey: updateWithdrawalsKey,
      })
    },
    onError(error) {
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to process unpaid withdrawal batches",
      )
    },
  })
}
