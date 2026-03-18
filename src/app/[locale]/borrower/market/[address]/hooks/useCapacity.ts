import { Dispatch } from "react"

import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"

export const useSetMaxTotalSupply = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const { signer, address, targetChainId } = useEthersProvider()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (newMaxTotalSupply: string) => {
      await withClientSpan(
        "market.set_max_total_supply",
        async (span) => {
          if (!marketAccount || !signer) {
            throw Error("Missing signer or market account")
          }
          if (marketAccount.market.chainId !== targetChainId) {
            throw Error(
              `Signer chainId does not match market or target chainId:` +
                ` Market ${marketAccount.market.chainId},` +
                ` Target ${targetChainId}`,
            )
          }

          const supplyTokenAmount = new TokenAmount(
            parseUnits(
              newMaxTotalSupply,
              marketAccount.market.underlyingToken.decimals,
            ),
            marketAccount.market.underlyingToken,
          )

          span.setAttributes({
            "token.address": supplyTokenAmount.token.address,
            "token.symbol": supplyTokenAmount.token.symbol,
            "token.amount": supplyTokenAmount.raw.toString(),
          })

          const tx = await marketAccount.setMaxTotalSupply(supplyTokenAmount)
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
    },
    onError(error) {
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to set max total supply",
      )
    },
  })
}
