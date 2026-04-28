import { context } from "@opentelemetry/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"

export const useFaucet = (
  marketAccount: MarketAccount,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isTestnet, chainId: targetChainId } = useSelectedNetwork()
  const flow = useFlowMutation()

  return useMutation({
    mutationFn: async () => {
      const externalParentContext = getParentContext?.()
      const useExternalFlow = Boolean(externalParentContext)
      const baseAttributes = {
        "market.address": marketAccount.market.address,
        "market.chain_id": marketAccount.market.chainId,
        "token.address": marketAccount.market.underlyingToken.address,
        "token.symbol": marketAccount.market.underlyingToken.symbol,
      }
      if (!useExternalFlow) {
        flow.start("market.faucet.flow", baseAttributes)
      }

      try {
        await withClientSpan(
          "market.faucet",
          async (span) => {
            if (
              !marketAccount ||
              !signer ||
              !marketAccount.market.underlyingToken.isMock ||
              !isTestnet
            ) {
              throw Error()
            }
            if (marketAccount.market.chainId !== targetChainId) {
              throw Error(
                `Market chainId does not match target chainId:` +
                  ` Market ${marketAccount.market.chainId},` +
                  ` Target ${targetChainId}`,
              )
            }

            const faucet = async () => {
              const tx = await marketAccount.market.underlyingToken.faucet()
              span.setAttribute("tx.hash", tx.hash)
              return tx.wait()
            }

            await toastRequest(faucet(), {
              error: "Failed to acquire testnet tokens",
              success: "Acquired testnet tokens!",
              pending: "Requesting testnet tokens...",
            })
          },
          {
            parentContext:
              externalParentContext ??
              flow.getParentContext() ??
              context.active(),
            attributes: baseAttributes,
          },
        )
        if (!useExternalFlow) {
          flow.endSuccess()
        }
      } catch (error) {
        if (!useExternalFlow) {
          flow.endError(error, baseAttributes)
        }
        throw error
      }
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to request faucet tokens",
      )
    },
  })
}
