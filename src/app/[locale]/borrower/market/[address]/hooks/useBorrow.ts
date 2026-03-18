import { Dispatch } from "react"

import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, Signer, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"

export const useBorrow = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  return useMutation({
    mutationFn: async (amount: string) => {
      await withClientSpan(
        "market.borrow",
        async (span) => {
          if (
            !marketAccount ||
            !signer ||
            !Signer.isSigner(marketAccount.market.provider)
          ) {
            throw Error("Missing signer or market account")
          }
          if (
            signer.chainId !== marketAccount.market.chainId ||
            signer.chainId !== targetChainId
          ) {
            throw Error(
              `Signer chainId does not match market or target chainId:` +
                ` Market ${marketAccount.market.chainId},` +
                ` Target ${targetChainId},` +
                ` Signer ${signer.chainId}`,
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

          const tx = await marketAccount.borrow(tokenAmount)
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
          marketAccount.account,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to borrow",
      )
    },
  })
}
