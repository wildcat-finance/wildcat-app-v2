import { Dispatch } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { toastifyRequest } from "@/components/toasts"
import {
  GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY,
  GET_MARKET_ACCOUNT_KEY,
} from "@/hooks/useGetMarketAccount"
import { waitForSubgraphSync } from "@/utils/waitForSubgraphSync"

export const useApprove = (
  token: Token,
  market: Market,
  setTxHash: Dispatch<React.SetStateAction<string>>,
) => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!market) {
        return
      }

      const approve = async () => {
        const tx = await token.contract.approve(
          market.address.toLowerCase(),
          tokenAmount.raw,
        )
        setTxHash(tx.hash)
        return tx.wait()
      }

      const receipt = await toastifyRequest(approve(), {
        pending: `Approving ${tokenAmount.format(
          tokenAmount.token.decimals,
          true,
        )}...`,
        success: `Successfully Approved ${tokenAmount.format(
          tokenAmount.token.decimals,
          true,
        )}!`,
        error: `Error: ${token.symbol} Approval Failed`,
      })
      await waitForSubgraphSync(receipt.blockNumber)
    },
    onSuccess() {
      client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
      })
    },
  })
}
