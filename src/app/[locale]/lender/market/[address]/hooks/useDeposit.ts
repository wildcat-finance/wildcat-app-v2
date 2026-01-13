import { Dispatch } from "react"

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
import { isUSDTLikeToken } from "@/utils/constants"

export const useDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
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
        if (gnosisTransactions.length) {
          gnosisTransactions.push({
            to: marketAccount.market.address,
            data: marketAccount.market.contract.interface.encodeFunctionData(
              "deposit",
              [tokenAmount.raw],
            ),
            value: "0",
          })
          logger.info(
            { market: marketAccount.market.address },
            "Sending gnosis transactions",
          )
          logger.debug(
            { transactions: gnosisTransactions },
            "Gnosis transactions payload",
          )
          const { safeTxHash } = await sdk.txs.send({
            txs: gnosisTransactions,
          })
          logger.info({ safeTxHash }, "Got gnosis transaction")
          const receipt = await checkTransaction(safeTxHash)
          logger.info(
            { txHash: receipt.transactionHash, safeTxHash },
            "Got gnosis transaction receipt",
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
      logger.error(
        { err: error, market: marketAccount.market.address },
        "Failed to deposit",
      )
    },
  })
}
