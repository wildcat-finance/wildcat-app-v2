import { Dispatch } from "react"

import { context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import {
  BaseTransaction,
  Web3TransactionReceiptObject,
} from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { isUSDTLikeToken } from "@/utils/constants"

export const useRepay = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  processUnpaidWithdrawalsIfAny?: boolean,
  getParentContext?: () => ReturnType<typeof context.active> | null,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

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
      await withClientSpan(
        "market.repay",
        async (span) => {
          if (!marketAccount || !signer) {
            throw Error("Missing signer or market account")
          }
          if (marketAccount.market.chainId !== targetChainId) {
            throw Error(
              `Market chainId does not match target chainId:` +
                ` Market ${marketAccount.market.chainId},` +
                ` Target ${targetChainId}`,
            )
          }

          span.setAttributes({
            "token.address": amount.token.address,
            "token.symbol": amount.token.symbol,
            "token.amount": amount.raw.toString(),
          })

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
                  logger.info(
                    { txHash: receipt.transactionHash, safeTxHash },
                    "Got gnosis transaction receipt",
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
            logger.info(
              { market: marketAccount.market.address },
              "Sending gnosis transactions",
            )
            logger.debug(
              { transactionCount: gnosisTransactions.length },
              "Prepared gnosis transactions",
            )
            const { safeTxHash } = await sdk.txs.send({
              txs: gnosisTransactions,
            })
            span.setAttribute("safe.tx_hash", safeTxHash)
            logger.info({ safeTxHash }, "Got gnosis transaction")
            const receipt = await checkTransaction(safeTxHash)
            span.setAttribute("tx.hash", receipt.transactionHash)
            logger.info(
              { txHash: receipt.transactionHash, safeTxHash },
              "Got gnosis transaction receipt",
            )
            return
          }
          const tx =
            await marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
              amount,
              maxBatches,
            )
          span.setAttribute("tx.hash", tx.hash)

          if (!safeConnected) setTxHash(tx.hash)

          if (safeConnected) {
            await checkTransaction(tx.hash)
            return
          }

          await tx.wait()
        },
        {
          parentContext: getParentContext?.() ?? context.active(),
          attributes: {
            "market.address": marketAccount.market.address,
            "market.chain_id": marketAccount.market.chainId,
            "safe.connected": safeConnected,
          },
        },
      )
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
          queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
            marketAccount.market.chainId,
            "initial",
            marketAccount.market.address,
          ),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
            marketAccount.market.chainId,
            "update",
            marketAccount.market.address,
          ),
        })
      }
    },
    onError(error) {
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to repay",
      )
    },
  })
}
