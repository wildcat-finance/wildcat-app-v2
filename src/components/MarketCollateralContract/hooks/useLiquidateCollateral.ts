import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { Web3TransactionReceiptObject } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"

import { BebopPMMQuote } from "@/hooks/bebop/useGetBebopPMMQuote"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_UPDATED_COLLATERAL_CONTRACT_QUERY_KEY } from "@/hooks/useGetCollateralContracts"

export const useLiquidateCollateral = (
  collateral: MarketCollateralV1,
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
  const checkGnosisTransaction = async (
    safeTxHash: string,
  ): Promise<Web3TransactionReceiptObject> =>
    new Promise((resolve) => {
      const doCheckTransaction = async () => {
        const transactionBySafeHash = await sdk.txs.getBySafeTxHash(safeTxHash)
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

  return useMutation({
    mutationFn: async (quote: BebopPMMQuote) => {
      if (!collateral || !signer) throw Error()
      if (quote.buyTokenAmount.gt(collateral.maxRepayment)) {
        throw Error("Exceeds max repayment")
      }
      if (quote.sellTokenAmount.gt(collateral.availableCollateral)) {
        throw Error("Exceeds available collateral")
      }
      if (!quote.tx) {
        throw Error("No quote tx")
      }
      console.log(quote)
      const lengthWithdrawalQueue =
        collateral.market.unpaidWithdrawalBatchExpiries.length || 3
      const tx = await collateral.contract
        .connect(signer)
        .liquidateCollateral(
          quote.tx!.data,
          lengthWithdrawalQueue,
          quote.sellTokenAmount.raw,
          quote.buyTokenAmount.raw,
          {
            gasLimit: 5_000_000,
          },
        )

      if (safeConnected) {
        return checkGnosisTransaction(tx.hash)
      }
      setTxHash(tx.hash)
      return tx.wait()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [
          GET_UPDATED_COLLATERAL_CONTRACT_QUERY_KEY,
          collateral.address,
        ],
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
