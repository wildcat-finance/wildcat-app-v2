import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export const useApprove = (
  token: Token,
  market: Market,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const { targetChainId } = useCurrentNetwork()
  const { address } = useAccount()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!market) {
        return
      }
      if (market.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const approve = async () => {
        const tx = await token.contract.approve(
          market.address.toLowerCase(),
          tokenAmount.raw,
        )

        if (!safeConnected) setTxHash(tx.hash)

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

      await approve()
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
}
