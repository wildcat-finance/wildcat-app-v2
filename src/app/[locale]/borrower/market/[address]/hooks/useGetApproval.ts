import { SpanStatusCode, context, trace } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { logger } from "@/lib/logging/client"

export const useApprove = (
  token: Token,
  market: Market,
  setTxHash?: (hash: string) => void,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const { targetChainId } = useCurrentNetwork()
  const { address } = useAccount()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const tracer = trace.getTracer("wildcat-app-v2-web")

  const mutation = useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      const parentContext = getParentContext?.() ?? context.active()
      return tracer.startActiveSpan(
        "market.approve",
        {},
        parentContext,
        async (span) => {
          try {
            if (!market) {
              throw Error("Market not available")
            }
            if (market.chainId !== targetChainId) {
              throw Error(
                `Market chainId does not match target chainId:` +
                  ` Market ${market.chainId},` +
                  ` Target ${targetChainId}`,
              )
            }

            span.setAttributes({
              "market.address": market.address,
              "market.chain_id": market.chainId,
              "token.address": token.address,
              "token.symbol": token.symbol,
              "token.amount": tokenAmount.raw.toString(),
              "safe.connected": safeConnected,
            })

            const approve = async () => {
              const tx = await token.contract.approve(
                market.address.toLowerCase(),
                tokenAmount.raw,
              )
              span.setAttribute("tx.hash", tx.hash)

              if (!safeConnected && setTxHash) setTxHash(tx.hash)

              if (safeConnected) {
                const checkTransaction = async () => {
                  const transactionBySafeHash = await sdk.txs.getBySafeTxHash(
                    tx.hash,
                  )
                  if (transactionBySafeHash?.txHash) {
                    if (setTxHash) setTxHash(transactionBySafeHash.txHash)
                  } else {
                    setTimeout(checkTransaction, 1000)
                  }
                }

                await checkTransaction()
              }

              return tx.wait()
            }

            await approve()
          } catch (error) {
            span.recordException(error as Error)
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error instanceof Error ? error.message : String(error),
            })
            throw error
          } finally {
            span.end()
          }
        },
      )
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
          market.chainId,
          market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          market.chainId,
          address,
          market.address,
        ),
      })
    },
  })

  const approveWithToast = async (tokenAmount: TokenAmount) => {
    await toastRequest(mutation.mutateAsync(tokenAmount), {
      pending: `Approving ${tokenAmount.format()} ${token.symbol}...`,
      success: `Successfully approved ${tokenAmount.format()} ${token.symbol}`,
      error: "Failed to approve",
    })
  }

  return {
    mutateAsync: approveWithToast,
    mutate: (tokenAmount: TokenAmount) => {
      approveWithToast(tokenAmount).catch((error) => {
        logger.error({ err: error }, "Approval request failed")
      })
    },
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  }
}
