import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  SafeTransactionInput,
  TokenAmount,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { isUSDTLikeToken } from "@/utils/constants"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  return useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!marketAccount || !signer) throw Error()
      if (marketAccount.market.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
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
          gnosisTransactions.push({
            to: marketAccount.market.address,
            data: marketAccount.market.contract.interface.encodeFunctionData(
              "deposit",
              [tokenAmount.raw.toString()],
            ),
            value: "0",
          })
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

      await deposit()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
