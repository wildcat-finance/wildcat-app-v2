import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  HooksInstance,
  MarketController,
  PartialTransaction,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useWildcatClient } from "@/hooks/useEthersSigner"
import { useAppDispatch } from "@/store/hooks"
import { resetPolicyLendersState } from "@/store/slices/policyLendersSlice/policyLendersSlice"
import {
  isV2HooksInstance,
  lenderPolicyErrorAbi,
  prepareLenderRestoration,
} from "@/utils/lenderAccess"
import {
  sendTransactionAndWait,
  toSafeTransactions,
} from "@/utils/transactions"

export type SubmitPolicyUpdatesInputs = {
  addLenders?: string[]
  removeLenders?: string[]
  setName?: string
  marketsToUpdate?: string[]
}

export function useSubmitUpdates(policy?: HooksInstance | MarketController) {
  const { publicClient, walletClient } = useWildcatClient()
  const client = useQueryClient()
  const { isTestnet, targetChainId } = useCurrentNetwork()
  const { connected: isConnectedToSafe, sdk: gnosisSafeSDK } = useSafeAppsSDK()
  const dispatch = useAppDispatch()

  const waitForTransaction = async (txHash: string) => {
    if (!gnosisSafeSDK) throw Error("No SDK found")
    return gnosisSafeSDK.eth.getTransactionReceipt([txHash]).then((tx) => {
      if (tx) {
        tx.transactionHash = txHash
      }
      return tx
    })
  }

  const {
    mutate: submitUpdates,
    isPending: isSubmitting,
    isSuccess,
    isError,
    error,
  } = useMutation({
    mutationFn: async ({
      addLenders,
      removeLenders,
      setName,
      marketsToUpdate,
    }: SubmitPolicyUpdatesInputs) => {
      if (!publicClient || !walletClient || !policy) return

      const txs: PartialTransaction[] = []

      if (addLenders?.length) {
        if (isV2HooksInstance(policy)) {
          const restoration = await prepareLenderRestoration(
            publicClient,
            policy,
            addLenders,
          )
          txs.push(...restoration.transactions)
        } else {
          const tx = marketsToUpdate?.length
            ? policy.populateAuthorizeLendersAndUpdateMarkets(
                addLenders,
                marketsToUpdate,
              )
            : policy.populateAuthorizeLenders(addLenders)
          txs.push(tx)
        }
      }

      if (removeLenders?.length) {
        const tx =
          // eslint-disable-next-line no-nested-ternary
          isV2HooksInstance(policy)
            ? policy.populateBlockLenders(removeLenders)
            : marketsToUpdate?.length
              ? policy.populateDeauthorizeLendersAndUpdateMarkets(
                  removeLenders,
                  marketsToUpdate,
                )
              : policy.populateDeauthorizeLenders(removeLenders)

        txs.push(tx)
      }

      const send = async () => {
        if (isConnectedToSafe && isTestnet && txs.length > 1) {
          const tx = await gnosisSafeSDK.txs.send({
            txs: toSafeTransactions(txs),
          })
          console.log("Transaction sent, result:", tx)

          const checkTransaction = async (): Promise<string> => {
            const transactionBySafeHash =
              await gnosisSafeSDK.txs.getBySafeTxHash(tx.safeTxHash)

            if (transactionBySafeHash?.txHash) {
              console.log(
                `Transaction confirmed. txHash: ${transactionBySafeHash.txHash}`,
              )
              return transactionBySafeHash.txHash
            }

            console.log("Transaction pending, rechecking in 1 second...")
            return new Promise<string>((res) => {
              setTimeout(async () => res(await checkTransaction()), 1000)
            })
          }

          const txHash = await checkTransaction()

          if (txHash) {
            console.log(`Waiting for transaction with txHash: ${txHash}`)
            const receipt = await waitForTransaction(txHash)
            console.log("Transaction confirmed, receipt received.")
            return receipt
          }

          console.error("Failed to retrieve txHash.")
          throw new Error("Transaction failed or hash not found.")
        } else {
          // eslint-disable-next-line no-restricted-syntax
          for (const tx of txs) {
            // eslint-disable-next-line no-await-in-loop
            await sendTransactionAndWait(publicClient, walletClient, tx, {
              errorAbi: lenderPolicyErrorAbi,
            })
          }
          return {
            status: "success",
            message: "All transactions processed successfully",
          }
        }
      }

      await send()
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_POLICY(targetChainId, policy?.address),
      })
      dispatch(resetPolicyLendersState())
    },
    onError: (mutationError) => console.log(mutationError),
  })

  return {
    submitUpdates,
    isSubmitting,
    isSuccess,
    isError,
    errorMessage: error?.message,
  }
}
