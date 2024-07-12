import { Dispatch } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"

import { toastifyRequest } from "@/components/toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY } from "@/hooks/useGetMarketAccount"
import { waitForSubgraphSync } from "@/utils/waitForSubgraphSync"

export const useSetMaxTotalSupply = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (newMaxTotalSupply: string) => {
      if (!marketAccount || !signer) {
        return
      }

      const supplyTokenAmount = new TokenAmount(
        parseUnits(
          newMaxTotalSupply,
          marketAccount.market.underlyingToken.decimals,
        ),
        marketAccount.market.underlyingToken,
      )

      const setMaxTotalSupply = async () => {
        const tx = await marketAccount.setMaxTotalSupply(supplyTokenAmount)
        setTxHash(tx.hash)
        return tx.wait()
      }

      const receipt = await toastifyRequest(setMaxTotalSupply(), {
        pending: `Setting Maximum Capacity...`,
        success: `Maximum Capacity successfully Adjusted`,
        error: "Error setting Maximum Capacity",
      })
      await waitForSubgraphSync(receipt.blockNumber)
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
