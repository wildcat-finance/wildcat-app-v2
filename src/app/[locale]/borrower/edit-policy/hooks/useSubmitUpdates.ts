import { context } from "@opentelemetry/api"
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
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"
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
  const flow = useFlowMutation()

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
      flow.start("policy.submit_updates.flow", {
        "policy.address": policy?.address ?? "",
        "market.chain_id": targetChainId,
        "safe.connected": isConnectedToSafe,
        "policy.set_name": Boolean(setName),
      })

      if (!signer || !policy) {
        flow.endCancel({
          "policy.address": policy?.address ?? "",
          "flow.cancelled": true,
        })
        return
      }

      try {
        await withClientSpan(
          "policy.submit_updates",
          async (span) => {
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

            span.setAttributes({
              "policy.add_lenders_count": addLenders?.length ?? 0,
              "policy.remove_lenders_count": removeLenders?.length ?? 0,
              "policy.tx_count": txs.length,
            })

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
              const gnosisTransactions: PartialTransaction[] = txs.map(
                ({ to, data, value }) => ({
                  to,
                  data,
                  value,
                }),
              )
              const tx = gnosisSafeSDK.txs.send({ txs: gnosisTransactions })
              await toastRequest(
                tx.then((result) => {
                  span.setAttribute("safe.tx_hash", result.safeTxHash)
                  return result
                }),
                {
                  pending:
                    "Submitting gnosis transaction batch to update lenders...",
                  success: "Lenders updated!",
                  error: "Failed to update lenders",
                },
              )
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
                    .then(({ wait, hash }) => {
                      span.setAttribute("tx.hash", hash)
                      return wait()
                    }),
                  tx,
                )
              }
            }
          },
          {
            parentContext: flow.getParentContext() ?? context.active(),
            attributes: {
              "policy.address": policy?.address ?? "",
              "market.chain_id": targetChainId,
              "safe.connected": isConnectedToSafe,
              "policy.set_name": Boolean(setName),
            },
          },
        )
        flow.endSuccess()
      } catch (error) {
        flow.endError(error, {
          "policy.address": policy?.address ?? "",
        })
        throw error
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
