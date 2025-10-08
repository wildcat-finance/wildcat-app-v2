import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import {
  BaseTransaction,
  Web3TransactionReceiptObject,
} from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { GET_WITHDRAWALS_KEY } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { isUSDTLikeToken } from "@/utils/constants"

export const useRepay = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  processUnpaidWithdrawalsIfAny?: boolean,
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
    mutationFn: async (amount: TokenAmount) => {
      if (!marketAccount || !signer) {
        return
      }

      const step = marketAccount.previewRepay(amount)
      const gnosisTransactions: BaseTransaction[] = []
      if (step.status !== "Ready") {
        if (safeConnected && step.status === "InsufficientAllowance") {
          if (
            marketAccount.underlyingApproval.gt(0) &&
            isUSDTLikeToken(marketAccount.market.underlyingToken.address)
          ) {
            gnosisTransactions.push(
              await marketAccount.populateApproveMarket(
                amount.token.getAmount(0),
              ),
            )
          }
          gnosisTransactions.push(
            await marketAccount.populateApproveMarket(amount),
          )
        } else {
          throw Error(
            `Should not be able to reach useRepay when status not ready and not connected to safe`,
          )
        }
      }

      const repay = async () => {
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
        const maxBatches =
          marketAccount.market.unpaidWithdrawalBatchExpiries.length
        if (gnosisTransactions.length) {
          gnosisTransactions.push(
            await marketAccount.market.populateRepayAndProcessUnpaidWithdrawalBatches(
              amount,
              maxBatches,
            ),
          )
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
        const tx =
          await marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
            amount,
            maxBatches,
          )

        if (!safeConnected) setTxHash(tx.hash)

        if (safeConnected) {
          return checkTransaction(tx.hash)
        }

        return tx.wait()
      }

      await repay()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          marketAccount.market.chainId,
          marketAccount.account,
          marketAccount.market.address,
        ),
      })
      if (processUnpaidWithdrawalsIfAny) {
        client.invalidateQueries({
          queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
            marketAccount.market.chainId,
            marketAccount.market.address,
          ),
        })

        client.invalidateQueries({
          queryKey: [GET_WITHDRAWALS_KEY],
        })
      }
    },
    onError(error) {
      console.log(error)
    },
  })
}
