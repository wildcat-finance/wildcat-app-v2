import { Dispatch } from "react"

import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"

export const useWithdraw = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  queueFullWithdrawal?: boolean,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const { address } = useAccount()
  const client = useQueryClient()
  const { targetChainId } = useCurrentNetwork()

  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (amount: string) => {
      await withClientSpan(
        "market.withdraw",
        async (span) => {
          if (!marketAccount || !address) {
            throw Error("Missing market account or address")
          }
          if (marketAccount.market.chainId !== targetChainId) {
            throw Error(
              `Market chainId does not match target chainId:` +
                ` Market ${marketAccount.market.chainId},` +
                ` Target ${targetChainId}`,
            )
          }

          const tokenAmount = new TokenAmount(
            parseUnits(amount, marketAccount.market.underlyingToken.decimals),
            marketAccount.market.underlyingToken,
          )

          span.setAttributes({
            "token.address": tokenAmount.token.address,
            "token.symbol": tokenAmount.token.symbol,
            "token.amount": tokenAmount.raw.toString(),
          })

          const tx = queueFullWithdrawal
            ? await marketAccount.queueFullWithdrawal()
            : await marketAccount.queueWithdrawal(tokenAmount)

          span.setAttribute("tx.hash", tx.transaction.hash)

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

          await tx.transaction.wait()
        },
        {
          parentContext: getParentContext?.() ?? context.active(),
          attributes: {
            "market.address": marketAccount.market.address,
            "market.chain_id": marketAccount.market.chainId,
            "safe.connected": safeConnected,
            "withdraw.full": Boolean(queueFullWithdrawal),
          },
        },
      )
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
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
    onError(error, amount) {
      logger.error(
        {
          err: error,
          amount,
          market: marketAccount.market.address,
          queueFullWithdrawal,
        },
        "Failed to withdraw",
      )
    },
  })
}
