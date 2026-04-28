import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, Signer } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useBorrow = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  return useMutation({
    mutationFn: async (amount: string) => {
      if (
        !marketAccount ||
        !signer ||
        !Signer.isSigner(marketAccount.market.provider)
      ) {
        return
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

      const tokenAmount =
        marketAccount.market.underlyingToken.parseAmount(amount)

      const borrow = async () => {
        const hash = await marketAccount.borrow(tokenAmount)

        if (!safeConnected) setTxHash(hash)

        const { hash: transactionHash, receipt } =
          await waitForSubmittedTransaction({
            provider: signer.provider,
            hash,
            safeConnected,
            safeSdk: sdk,
          })
        setTxHash(transactionHash)
        return receipt
      }

      await borrow()
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
      console.log(error)
    },
  })
}
