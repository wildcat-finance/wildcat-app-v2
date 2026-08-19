import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  prepareTransaction,
  SafeTransactionInput,
  TokenAmount,
  toSafeTransactionInput,
  wildcatMarketAbi,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { isUSDTLikeToken } from "@/utils/constants"
import { invalidateMarketAccountQueries } from "@/utils/marketAccountQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk, safe } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  return useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!marketAccount || !signer) throw Error()
      const signingChainId = safeConnected ? safe.chainId : signer.chainId
      const signingAddress = safeConnected
        ? safe.safeAddress
        : await signer.getAddress()
      if (
        marketAccount.market.chainId !== targetChainId ||
        marketAccount.market.chainId !== signingChainId
      ) {
        throw Error(
          `Market chainId does not match active chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}, Signing ${signingChainId}`,
        )
      }
      if (
        !signingAddress ||
        signingAddress.toLowerCase() !== marketAccount.account.toLowerCase()
      ) {
        throw Error("Signing account does not match market account")
      }

      const step = marketAccount.previewDeposit(tokenAmount)

      const gnosisTransactions: SafeTransactionInput[] = []

      if (step.status !== "Ready") {
        if (safeConnected && step.status === "InsufficientAllowance") {
          if (
            marketAccount.underlyingApproval > BigInt(0) &&
            isUSDTLikeToken(marketAccount.market.underlyingToken.address)
          ) {
            gnosisTransactions.push(
              toSafeTransactionInput(
                await marketAccount.populateApproveMarket(
                  tokenAmount.token.getAmount(0),
                ),
              ),
            )
          }
          gnosisTransactions.push(
            toSafeTransactionInput(
              await marketAccount.populateApproveMarket(tokenAmount),
            ),
          )
        } else {
          throw Error(
            `Should not be able to reach useDeposit when status not ready and not connected to safe`,
          )
        }
      }

      const deposit = async () => {
        if (gnosisTransactions.length) {
          gnosisTransactions.push(
            toSafeTransactionInput(
              prepareTransaction({
                to: marketAccount.market.address,
                abi: wildcatMarketAbi,
                functionName: "deposit",
                args: [tokenAmount.raw],
              }),
            ),
          )
          console.log(`Sending gnosis transactions...`)
          console.log(gnosisTransactions)
          const { safeTxHash } = await sdk.txs.send({
            txs: gnosisTransactions,
          })
          console.log(`Got gnosis transaction:\n\tsafeTxHash: ${safeTxHash}`)
          const { hash: transactionHash, receipt } =
            await waitForSubmittedTransaction({
              provider: signer.provider,
              hash: safeTxHash,
              safeConnected: true,
              safeSdk: sdk,
            })
          setTxHash(transactionHash)
          console.log(
            `Got gnosis transaction receipt:\n\ttxHash: ${transactionHash}`,
          )
          return receipt
        }

        const hash = await marketAccount.deposit(tokenAmount)

        if (!safeConnected) setTxHash(hash.toString())

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

      await deposit()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      invalidateMarketAccountQueries({
        client,
        chainId: marketAccount.market.chainId,
        marketAddress: marketAccount.market.address,
        accountAddress: marketAccount.account,
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
