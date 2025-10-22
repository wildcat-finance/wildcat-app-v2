import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketController, PartialTransaction } from "@wildcatfi/wildcat-sdk"
import {
  FixedTermHooks,
  HooksInstance,
  OpenTermHooks,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useAppDispatch } from "@/store/hooks"
import { resetPolicyLendersState } from "@/store/slices/policyLendersSlice/policyLendersSlice"

export type SubmitPolicyUpdatesInputs = {
  addLenders?: string[]
  removeLenders?: string[]
  setName?: string
  marketsToUpdate?: string[]
}

export function useSubmitUpdates(policy?: HooksInstance | MarketController) {
  const signer = useEthersSigner()
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
  } = useMutation({
    mutationFn: async ({
      addLenders,
      removeLenders,
      setName,
      marketsToUpdate,
    }: SubmitPolicyUpdatesInputs) => {
      if (!signer || !policy) return

      const txs: PartialTransaction[] = []

      if (addLenders?.length) {
        const tx =
          // eslint-disable-next-line no-nested-ternary
          policy instanceof OpenTermHooks || policy instanceof FixedTermHooks
            ? policy.populateAddLenders(
                addLenders.map((lender) => ({ lender })),
              )
            : marketsToUpdate?.length
              ? policy.populateAuthorizeLendersAndUpdateMarkets(
                  addLenders,
                  marketsToUpdate,
                )
              : policy.populateAuthorizeLenders(addLenders)

        txs.push(tx)
      }

      if (removeLenders?.length) {
        const tx =
          // eslint-disable-next-line no-nested-ternary
          policy instanceof OpenTermHooks || policy instanceof FixedTermHooks
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
          const tx = await gnosisSafeSDK.txs.send({ txs })
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
            await signer
              .sendTransaction({
                to: tx.to,
                data: tx.data,
                value: tx.value,
              })
              .then(({ wait }) => wait())
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
    onError: (error) => console.log(error),
  })

  return { submitUpdates, isSubmitting, isSuccess, isError }
}
