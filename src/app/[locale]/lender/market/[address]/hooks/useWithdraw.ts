/* eslint-disable no-console */
import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

import type { BorrowerWithdrawalsForMarketResult } from "../../../../borrower/market/[address]/hooks/useGetWithdrawals"

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

      const tokenAmount = new TokenAmount(
        parseUnits(amount, marketAccount.market.underlyingToken.decimals),
        marketAccount.market.underlyingToken,
      )

      const withdraw = async () => {
        const tx = queueFullWithdrawal
          ? await marketAccount.queueFullWithdrawal()
          : await marketAccount.queueWithdrawal(tokenAmount)

        if (!safeConnected) setTxHash(tx.transaction.hash)

        if (safeConnected) {
          const checkTransaction = async () => {
            const transactionBySafeHash = await sdk.txs.getBySafeTxHash(
              tx.transaction.hash,
            )
            if (transactionBySafeHash?.txHash) {
              setTxHash(transactionBySafeHash.txHash)
            } else {
              setTimeout(checkTransaction, 1000)
            }
          }

          await checkTransaction()
        }

        return tx.transaction.wait()
      }

      await withdraw()
    },
    onSuccess() {
      const chainId = marketAccount.market.chainId
      const marketAddress = marketAccount.market.address
      const lenderAddress = address?.toLowerCase()

      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(chainId, marketAddress),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(chainId, marketAddress),
      })
      if (lenderAddress) {
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT(
            chainId,
            marketAddress,
            lenderAddress,
            "initial",
          ),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT(
            chainId,
            marketAddress,
            lenderAddress,
            "update",
          ),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_WITHDRAWALS.INITIAL(
            chainId,
            lenderAddress,
            marketAddress,
          ),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_WITHDRAWALS.UPDATE(
            chainId,
            lenderAddress,
            marketAddress,
          ),
        })
      }
    },
    onError(error, amount) {
      console.log(error, amount)
    },
  })
}
