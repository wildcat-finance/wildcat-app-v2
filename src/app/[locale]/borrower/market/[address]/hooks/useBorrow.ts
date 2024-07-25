import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"

import { toastifyRequest } from "@/components/toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY } from "@/hooks/useGetMarketAccount"
import { waitForSubgraphSync } from "@/utils/waitForSubgraphSync"

export const useBorrow = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected } = useSafeAppsSDK()

  console.log("DEBUG isSafe", connected)

  return useMutation({
    mutationFn: async (amount: string) => {
      if (!marketAccount || !signer) {
        return
      }

      const tokenAmount = new TokenAmount(
        parseUnits(amount, marketAccount.market.underlyingToken.decimals),
        marketAccount.market.underlyingToken,
      )

      const borrow = async () => {
        const tx = await marketAccount.borrow(tokenAmount)
        setTxHash(tx.hash)
        return tx.wait()
      }

      // const receipt = await toastifyRequest(borrow(), {
      //   pending: `Borrowing ${tokenAmount.format(
      //     tokenAmount.token.decimals,
      //     true,
      //   )}...`,
      //   success: `Borrowed ${tokenAmount.format(
      //     tokenAmount.token.decimals,
      //     true,
      //   )}!`,
      //   error: `Error: Borrow Failed`,
      // })
      // await waitForSubgraphSync(receipt.blockNumber)

      await borrow()
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
