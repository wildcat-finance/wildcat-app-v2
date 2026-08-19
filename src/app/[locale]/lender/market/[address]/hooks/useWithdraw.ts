/* eslint-disable no-console */
import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  MarketVersion,
  prepareTransaction,
  toSafeTransactionInput,
  wildcatMarketAbi,
  wildcatMarketV2Abi,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { invalidateMarketAccountQueries } from "@/utils/marketAccountQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useWithdraw = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  queueFullWithdrawal?: boolean,
) => {
  const { address } = useAccount()
  const client = useQueryClient()
  const { targetChainId } = useCurrentNetwork()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (amount: string) => {
      if (!marketAccount || !address) {
        return
      }
      if (marketAccount.market.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const tokenAmount = queueFullWithdrawal
        ? marketAccount.marketBalance
        : marketAccount.market.underlyingToken.parseAmount(amount)

      const withdraw = async () => {
        if (safeConnected) {
          if (!sdk) throw Error("No Safe SDK")

          const tx =
            queueFullWithdrawal &&
            marketAccount.market.version === MarketVersion.V2
              ? prepareTransaction({
                  to: marketAccount.market.address,
                  abi: wildcatMarketV2Abi,
                  functionName: "queueFullWithdrawal",
                })
              : prepareTransaction({
                  to: marketAccount.market.address,
                  abi: wildcatMarketAbi,
                  functionName: "queueWithdrawal",
                  args: [tokenAmount.raw],
                })
          const { safeTxHash } = await sdk.txs.send({
            txs: [toSafeTransactionInput(tx)],
          })
          const { hash, receipt } = await waitForSubmittedTransaction({
            provider: marketAccount.market.signer.provider,
            hash: safeTxHash,
            safeConnected: true,
            safeSdk: sdk,
          })
          setTxHash(hash.toString())
          return receipt
        }

        const tx = queueFullWithdrawal
          ? await marketAccount.queueFullWithdrawal()
          : await marketAccount.queueWithdrawal(tokenAmount)

        setTxHash(tx.hash)
        return tx.receipt
      }

      await withdraw()
    },
    onSuccess() {
      const lender = marketAccount.account.toLowerCase()
      const marketAddress = marketAccount.market.address.toLowerCase()

      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAddress,
        ),
      })
      invalidateMarketAccountQueries({
        client,
        chainId: marketAccount.market.chainId,
        marketAddress,
        accountAddress: lender,
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Lender.GET_WITHDRAWALS.PREFIX(
          marketAccount.market.chainId,
          lender,
          marketAddress,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(
          marketAccount.market.chainId,
          marketAddress,
        ),
      })
    },
    onError(error, amount) {
      console.log(error, amount)
    },
  })
}
