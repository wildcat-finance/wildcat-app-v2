import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketController, PartialTransaction } from "@wildcatfi/wildcat-sdk"
import {
  FixedTermHooks,
  HooksInstance,
  OpenTermHooks,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { toastRequest, ToastRequestConfig } from "@/components/Toasts"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useAppDispatch } from "@/store/hooks"
import { resetEditPolicyState } from "@/store/slices/editPolicySlice/editPolicySlice"

import { GET_POLICY_KEY } from "../../hooks/useGetPolicy"

export type SubmitPolicyUpdatesInputs = {
  addLenders?: string[]
  removeLenders?: string[]
  setName?: string
  marketsToUpdate?: string[]
}

export function useSubmitUpdates(policy?: HooksInstance | MarketController) {
  // const { t } = useTranslation
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isTestnet } = useCurrentNetwork()
  const { connected: isConnectedToSafe, sdk: gnosisSafeSDK } = useSafeAppsSDK()
  const dispatch = useAppDispatch()

  const waitForTransaction = async (txHash: string) => {
    if (!gnosisSafeSDK) throw Error("No sdk found")
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
      if (!signer || !policy) {
        return
      }

      const gnosisTransactions: PartialTransaction[] = []
      console.log(
        `useDeployMarket :: isTestnet: ${isTestnet} :: isConnectedToSafe: ${isConnectedToSafe} :: gnosisSafeSDK: ${!!gnosisSafeSDK}`,
      )

      const txs: Array<PartialTransaction & ToastRequestConfig> = []
      if (addLenders && addLenders.length) {
        console.log(`adding lenders`)
        console.log(addLenders)
        if (
          policy instanceof OpenTermHooks ||
          policy instanceof FixedTermHooks
        ) {
          console.log(`adding lenders to v2 policy`)
          const tx = policy.populateAddLenders(
            addLenders.map((lender) => ({ lender })),
          )
          txs.push({
            ...tx,
            pending: `Adding ${addLenders.length} lenders`,
            success: `Added ${addLenders.length} lenders`,
            error: `Failed to add ${addLenders.length} lenders`,
          })
        } else {
          console.log(`adding lenders to v1 policy`)
          const tx = marketsToUpdate?.length
            ? policy.populateAuthorizeLendersAndUpdateMarkets(
                addLenders,
                marketsToUpdate,
              )
            : policy.populateAuthorizeLenders(addLenders)
          txs.push({
            ...tx,
            pending: `Adding ${addLenders.length} lenders`,
            success: `Added ${addLenders.length} lenders`,
            error: `Failed to add ${addLenders.length} lenders`,
          })
        }
      }
      if (removeLenders && removeLenders.length) {
        console.log(`removing lenders`)
        console.log(removeLenders)
        console.log(`policy address: ${policy.address}`)
        console.log(`policy address: ${policy.contract.address}`)
        if (
          policy instanceof OpenTermHooks ||
          policy instanceof FixedTermHooks
        ) {
          const tx = policy.populateBlockLenders(removeLenders)
          txs.push({
            ...tx,
            pending: `Removing ${removeLenders.length} lenders`,
            success: `Removed ${removeLenders.length} lenders`,
            error: `Failed to remove ${removeLenders.length} lenders`,
          })
        } else {
          const tx = marketsToUpdate?.length
            ? policy.populateDeauthorizeLendersAndUpdateMarkets(
                removeLenders,
                marketsToUpdate,
              )
            : policy.populateDeauthorizeLenders(removeLenders)
          txs.push({
            ...tx,
            pending: `Removing ${removeLenders.length} lenders`,
            success: `Removed ${removeLenders.length} lenders`,
            error: `Failed to remove ${removeLenders.length} lenders`,
          })
        }
      }

      const useGnosisMultiSend =
        isConnectedToSafe && isTestnet && txs.length > 1
      if (txs.length > 1) {
        txs.forEach((tx, i) => {
          tx.pending = `Step ${i + 1}/${txs.length}: ${tx.pending}`
          tx.success = `Step ${i + 1}/${txs.length}: ${tx.success}`
          tx.error = `Step ${i + 1}/${txs.length}: ${tx.error}`
        })
      }

      if (useGnosisMultiSend) {
        const tx = gnosisSafeSDK.txs.send({ txs: gnosisTransactions })
        await toastRequest(tx, {
          pending: "Submitting gnosis transaction batch to update lenders...",
          success: "Lenders updated!",
          error: "Failed to update lenders",
        })
      } else {
        // eslint-disable-next-line no-restricted-syntax, no-await-in-loop
        for (const tx of txs) {
          // eslint-disable-next-line no-restricted-syntax, no-await-in-loop
          await toastRequest(
            signer
              .sendTransaction({
                to: tx.to,
                data: tx.data,
                value: tx.value,
              })
              .then(({ wait }) => wait()),
            tx,
          )
        }
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_POLICY_KEY] })
      dispatch(resetEditPolicyState())
    },
    onError(error) {
      console.log(error)
    },
  })

  return {
    submitUpdates,
    isSubmitting,
    isSuccess,
    isError,
  }
}
