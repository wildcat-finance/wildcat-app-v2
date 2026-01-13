import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, Signer, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"

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

      const tokenAmount = new TokenAmount(
        parseUnits(amount, marketAccount.market.underlyingToken.decimals),
        marketAccount.market.underlyingToken,
      )

      const borrow = async () => {
        const tx = await marketAccount.borrow(tokenAmount)

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
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to borrow",
      )
    },
  })
}
