import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  HooksInstance,
  MarketController,
  PartialTransaction,
} from "@wildcatfi/wildcat-sdk"

import { toastRequest, ToastRequestConfig } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useWildcatClient } from "@/hooks/useEthersSigner"
import { useAppDispatch } from "@/store/hooks"
import { resetEditPolicyState } from "@/store/slices/editPolicySlice/editPolicySlice"
import {
  getLenderUpdateSafeBatch,
  isV2HooksInstance,
  lenderPolicyErrorAbi,
  prepareCompatibilityLenderAddition,
  prepareCompatibilityLenderRemoval,
} from "@/utils/lenderAccess"
import {
  assertTransactionSucceeded,
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
  // const { t } = useTranslation
  const { publicClient, walletClient } = useWildcatClient()
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
      return assertTransactionSucceeded(tx, txHash)
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
      if (!publicClient || !walletClient || !policy) {
        return
      }

      console.log(
        `useDeployMarket :: isTestnet: ${isTestnet} :: isConnectedToSafe: ${isConnectedToSafe} :: gnosisSafeSDK: ${!!gnosisSafeSDK}`,
      )

      const txs: Array<PartialTransaction & ToastRequestConfig> = []
      if (addLenders && addLenders.length) {
        console.log(`adding lenders`)
        console.log(addLenders)
        if (isV2HooksInstance(policy)) {
          console.log(`adding lenders to v2 policy`)
          const addition = await prepareCompatibilityLenderAddition(
            publicClient,
            policy,
            addLenders,
          )
          addition.membershipTransactions.forEach((transaction) => {
            txs.push({
              ...transaction,
              pending: `Adding ${addLenders.length} lenders`,
              success: `Added ${addLenders.length} lenders`,
              error: `Failed to add ${addLenders.length} lenders`,
            })
          })
          addition.unblockTransactions.forEach((transaction) => {
            txs.push({
              ...transaction,
              pending: "Restoring lender deposit access",
              success: "Restored lender deposit access",
              error: "Failed to restore lender deposit access",
            })
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
        if (isV2HooksInstance(policy)) {
          const tx = prepareCompatibilityLenderRemoval(policy, removeLenders)
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

      const safeBatch = getLenderUpdateSafeBatch(isConnectedToSafe, txs)
      if (txs.length > 1) {
        txs.forEach((tx, i) => {
          tx.pending = `Step ${i + 1}/${txs.length}: ${tx.pending}`
          tx.success = `Step ${i + 1}/${txs.length}: ${tx.success}`
          tx.error = `Step ${i + 1}/${txs.length}: ${tx.error}`
        })
      }

      if (safeBatch) {
        const tx = gnosisSafeSDK.txs.send({
          txs: toSafeTransactions(safeBatch),
        })
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
            sendTransactionAndWait(publicClient, walletClient, tx, {
              errorAbi: lenderPolicyErrorAbi,
            }),
            {
              ...tx,
              getErrorMessage: (error) =>
                error instanceof Error
                  ? error.message
                  : tx.error || "Failed to update lenders",
            },
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
