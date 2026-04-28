import { Dispatch } from "react"

import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"

export const useForceBuyBack = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const { signer, address, targetChainId } = useEthersProvider()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async ({
      lender,
      amount,
    }: {
      lender: string
      amount: string
    }) => {
      await withClientSpan(
        "market.force_buy_back",
        async (span) => {
          if (!marketAccount || !signer) {
            throw Error("Missing market account or signer")
          }
          if (marketAccount.market.chainId !== targetChainId) {
            throw Error(
              `Market chainId does not match target chainId:` +
                ` Market ${marketAccount.market.chainId},` +
                ` Target ${targetChainId}`,
            )
          }

          const tokenAmount =
            marketAccount.market.underlyingToken.parseAmount(amount)

          span.setAttributes({
            "lender.address": lender.toLowerCase(),
            "token.address": tokenAmount.token.address,
            "token.symbol": tokenAmount.token.symbol,
            "token.amount": tokenAmount.raw.toString(),
          })

          const tx = await marketAccount.forceBuyBack(lender, tokenAmount)
          span.setAttribute("tx.hash", tx.hash)

          if (!safeConnected) setTxHash(tx.hash)

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
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          marketAccount.market.chainId,
          address,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_LENDERS(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to force buy back",
      )
    },
  })
}
