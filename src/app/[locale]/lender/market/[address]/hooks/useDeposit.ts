import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import {
  BaseTransaction,
  Web3TransactionReceiptObject,
} from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_MARKET_KEY } from "@/hooks/useGetMarket"
import { GET_MARKET_ACCOUNT_KEY } from "@/hooks/useGetMarketAccount"
import { isUSDTLikeToken } from "@/utils/constants"

export const useDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  const waitForTransaction = async (safeTxHash: string) => {
    if (!sdk) throw Error("No sdk found")
    const { txHash } = await sdk.txs.getBySafeTxHash(safeTxHash)
    if (!txHash) throw Error("No tx hash found")
    return sdk.eth.getTransactionReceipt([txHash]).then((tx) => {
      if (tx) {
        tx.transactionHash = txHash
      }
      return tx
    })
  }

  return useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!marketAccount || !signer) throw Error()

      const step = marketAccount.previewDeposit(tokenAmount)

      const gnosisTransactions: BaseTransaction[] = []

      if (step.status !== "Ready") {
        if (safeConnected && step.status === "InsufficientAllowance") {
          if (
            marketAccount.underlyingApproval.gt(0) &&
            isUSDTLikeToken(marketAccount.market.underlyingToken.address)
          ) {
            gnosisTransactions.push(
              await marketAccount.populateApproveMarket(
                tokenAmount.token.getAmount(0),
              ),
            )
          }
          gnosisTransactions.push(
            await marketAccount.populateApproveMarket(tokenAmount),
          )
        } else {
          throw Error(
            `Should not be able to reach useDeposit when status not ready and not connected to safe`,
          )
        }
      }

      const deposit = async () => {
        const checkTransaction = async (
          safeTxHash: string,
        ): Promise<Web3TransactionReceiptObject> =>
          new Promise((resolve) => {
            const doCheckTransaction = async () => {
              const transactionBySafeHash =
                await sdk.txs.getBySafeTxHash(safeTxHash)
              if (transactionBySafeHash?.txHash) {
                setTxHash(transactionBySafeHash.txHash)
                const receipt = await waitForTransaction(safeTxHash)
                console.log(
                  `Got gnosis transaction receipt:\n\ttxHash: ${receipt.transactionHash}`,
                )
                resolve(receipt)
              } else {
                setTimeout(doCheckTransaction, 1000)
              }
            }
            doCheckTransaction()
          })
        if (gnosisTransactions.length) {
          gnosisTransactions.push({
            to: marketAccount.market.address,
            data: marketAccount.market.contract.interface.encodeFunctionData(
              "deposit",
              [tokenAmount.raw],
            ),
            value: "0",
          })
          console.log(`Sending gnosis transactions...`)
          console.log(gnosisTransactions)
          const { safeTxHash } = await sdk.txs.send({
            txs: gnosisTransactions,
          })
          console.log(`Got gnosis transaction:\n\tsafeTxHash: ${safeTxHash}`)
          const receipt = await checkTransaction(safeTxHash)
          console.log(
            `Got gnosis transaction receipt:\n\ttxHash: ${receipt.transactionHash}`,
          )
          return receipt
        }

        const tx = await marketAccount.deposit(tokenAmount)

        if (!safeConnected) setTxHash(tx.hash)

        if (safeConnected) {
          return checkTransaction(tx.hash)
        }

        return tx.wait()
      }

      await deposit()
    },
    onSuccess() {
      client.invalidateQueries({ queryKey: [GET_MARKET_KEY] })
      client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })
    },
    onError(error) {
      console.log(error)
    },
  })
}
