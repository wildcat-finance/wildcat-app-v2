import { Dispatch } from "react"

import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LenderWithdrawalStatus, Market } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"

export const useClaim = (
  market: Market,
  withdrawals: LenderWithdrawalStatus[],
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const client = useQueryClient()
  const { address } = useAccount()
  const { targetChainId } = useCurrentNetwork()

  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async () => {
      await withClientSpan(
        "market.claim",
        async (span) => {
          if (market.chainId !== targetChainId) {
            throw Error(
              `Market chainId does not match target chainId:` +
                ` Market ${market.chainId},` +
                ` Target ${targetChainId}`,
            )
          }

          const claimableWithdrawals = withdrawals.filter((w) =>
            w.availableWithdrawalAmount.gt(0),
          )
          if (!market || !claimableWithdrawals.length || !address) {
            throw Error("No claimable withdrawals available")
          }

          const tx =
            claimableWithdrawals.length === 1
              ? await market.executeWithdrawal(claimableWithdrawals[0])
              : await market.executeWithdrawals(claimableWithdrawals)

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
            "market.address": market.address,
            "market.chain_id": market.chainId,
            "safe.connected": safeConnected,
            "withdrawals.count": withdrawals.length,
          },
        },
      )
    },
    onSuccess() {
      const lender = address?.toLowerCase()
      const marketAddress = market.address.toLowerCase()

      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(market.chainId, market.address),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
          market.chainId,
          market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Lender.GET_WITHDRAWALS.PREFIX(
          market.chainId,
          lender,
          marketAddress,
        ),
      })
    },
    onError(error) {
      logger.error(
        { err: error, market: market.address },
        "Failed to claim withdrawals",
      )
    },
  })
}
