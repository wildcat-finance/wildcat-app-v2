import { Dispatch, SetStateAction } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { toastifyRequest } from "@/components/toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY } from "@/hooks/useGetMarketAccount"
import { waitForSubgraphSync } from "@/utils/waitForSubgraphSync"

export const useTerminateMarket = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<SetStateAction<string>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!signer) {
        return
      }

      const closeMarket = async () => {
        const tx = await marketAccount.closeMarket()
        setTxHash(tx.hash)
        return tx.wait()
      }

      // const receipt = await toastifyRequest(closeMarket(), {
      //   pending: `Terminating Market...`,
      //   success: `Successfully Terminated Market!`,
      //   error: "Error Terminating Market",
      // })
      // await waitForSubgraphSync(receipt.blockNumber)

      await closeMarket()
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
