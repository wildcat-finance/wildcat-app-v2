import { Dispatch, SetStateAction } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  RecoverUnderlyingStatus,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { invalidateMarketStateQueries } from "@/utils/marketStateQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useRecoverUnderlyingQuote = (
  account: MarketAccount,
  enabled: boolean,
) =>
  useQuery({
    queryKey: [
      ...QueryKeys.Markets.GET_MARKET(
        account.market.chainId,
        account.market.address,
      ),
      "recoverUnderlying",
      account.account.toLowerCase(),
    ],
    enabled,
    queryFn: async () => {
      await account.market.update()
      return account.previewRecoverUnderlying()
    },
    refetchInterval: 15_000,
    staleTime: 0,
    retry: 1,
  })

export const useRecoverUnderlying = (
  account: MarketAccount,
  setTxHash: Dispatch<SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  return useMutation({
    mutationFn: async () => {
      const { market } = account
      if (!signer) throw Error("Connect the market borrower to recover surplus")
      if (
        signer.chainId !== market.chainId ||
        targetChainId !== market.chainId
      ) {
        throw Error("Wallet network does not match the market")
      }
      const signerAddress = (await signer.getAddress()).toLowerCase()
      if (
        !account.isBorrower ||
        signerAddress !== account.account.toLowerCase()
      ) {
        throw Error("Only the market borrower can recover surplus")
      }
      // Bind the current wallet, then refresh immediately before preparing either
      // an EOA transaction or a Safe proposal. Indexed balances are never quotes.
      market.provider = signer
      await market.update()
      const preview = account.previewRecoverUnderlying()
      if (preview.status !== RecoverUnderlyingStatus.Ready) {
        throw Error(`Cannot recover surplus: ${preview.status}`)
      }
      setTxHash(undefined)
      const hash = safeConnected
        ? (
            await sdk.txs.send({
              txs: [
                toSafeTransactionInput(account.populateRecoverUnderlying()),
              ],
            })
          ).safeTxHash
        : await account.recoverUnderlying()
      if (!safeConnected) setTxHash(hash.toString())
      const result = await waitForSubmittedTransaction({
        provider: signer.provider,
        hash,
        safeConnected,
        safeSdk: sdk,
      })
      setTxHash(result.hash)
      return result.receipt
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          account.market.chainId,
          account.market.address,
        ),
      })
      invalidateMarketStateQueries({
        client,
        chainId: account.market.chainId,
        marketAddress: account.market.address,
        accountAddress: account.account,
      })
    },
  })
}
