import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { Web3TransactionReceiptObject } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketCollateralV1, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_UPDATED_COLLATERAL_CONTRACT_QUERY_KEY } from "@/hooks/useGetCollateralContracts"

export const useDepositCollateral = (
  collateralContract: MarketCollateralV1,
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
    mutationFn: async (amount: TokenAmount) => {
      if (!collateralContract || !signer) {
        return
      }
      if (collateralContract.provider !== signer) {
        collateralContract.provider = signer
      }

      const depositCollateral = async () => {
        const tx = await toastRequest(collateralContract.deposit(amount), {
          pending: `Depositing Collateral...`,
          success: `Collateral Deposited Successfully!`,
          error: `Collateral Deposit Failed.`,
        })

        if (safeConnected) {
          return checkGnosisTransaction(tx.hash)
        }
        setTxHash(tx.hash)
        return tx.wait()
      }

      await depositCollateral()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [
          GET_UPDATED_COLLATERAL_CONTRACT_QUERY_KEY,
          collateralContract.address,
        ],
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
