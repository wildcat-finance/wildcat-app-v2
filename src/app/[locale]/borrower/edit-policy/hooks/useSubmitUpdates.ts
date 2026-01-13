import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketController, PartialTransaction } from "@wildcatfi/wildcat-sdk"
import {
  FixedTermHooks,
  HooksInstance,
  OpenTermHooks,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { toastRequest, ToastRequestConfig } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { useAppDispatch } from "@/store/hooks"
import { resetEditPolicyState } from "@/store/slices/editPolicySlice/editPolicySlice"

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
  const { isTestnet, targetChainId } = useCurrentNetwork()
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
      logger.debug(
        {
          isTestnet,
          isConnectedToSafe,
          hasGnosisSafeSDK: !!gnosisSafeSDK,
        },
        "Submit policy updates status",
      )

      const txs: Array<PartialTransaction & ToastRequestConfig> = []
      if (addLenders && addLenders.length) {
        logger.info({ count: addLenders.length }, "Adding lenders")
        logger.debug({ addLenders }, "Add lenders list")
        if (
          policy instanceof OpenTermHooks ||
          policy instanceof FixedTermHooks
        ) {
          logger.debug("Adding lenders to v2 policy")
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
          logger.debug("Adding lenders to v1 policy")
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
        logger.info({ count: removeLenders.length }, "Removing lenders")
        logger.debug({ removeLenders }, "Remove lenders list")
        logger.debug(
          {
            policyAddress: policy.address,
            contractAddress: policy.contract.address,
          },
          "Policy addresses",
        )
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
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_POLICY(targetChainId, policy?.address),
      })
      dispatch(resetEditPolicyState())
    },
    onError(error) {
      logger.error(
        { err: error, policyAddress: policy?.address },
        "Failed to submit policy updates",
      )
    },
  })

  return {
    submitUpdates,
    isSubmitting,
    isSuccess,
    isError,
  }
}
