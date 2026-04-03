import { context } from "@opentelemetry/api"
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
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"
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
  const flow = useFlowMutation()

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
            const txs: PartialTransaction[] = []

            if (addLenders?.length) {
              const tx =
                // eslint-disable-next-line no-nested-ternary
                policy instanceof OpenTermHooks ||
                policy instanceof FixedTermHooks
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
                policy instanceof OpenTermHooks ||
                policy instanceof FixedTermHooks
                  ? policy.populateBlockLenders(removeLenders)
                  : marketsToUpdate?.length
                    ? policy.populateDeauthorizeLendersAndUpdateMarkets(
                        removeLenders,
                        marketsToUpdate,
                      )
                    : policy.populateDeauthorizeLenders(removeLenders)

              txs.push(tx)
            }

            span.setAttributes({
              "policy.add_lenders_count": addLenders?.length ?? 0,
              "policy.remove_lenders_count": removeLenders?.length ?? 0,
              "policy.tx_count": txs.length,
            })

            const send = async () => {
              if (isConnectedToSafe && isTestnet && txs.length > 1) {
                const tx = await gnosisSafeSDK.txs.send({ txs })
                span.setAttribute("safe.tx_hash", tx.safeTxHash)
                logger.info({ safeTxHash: tx.safeTxHash }, "Transaction sent")

                const checkTransaction = async (): Promise<string> => {
                  const transactionBySafeHash =
                    await gnosisSafeSDK.txs.getBySafeTxHash(tx.safeTxHash)

                  if (transactionBySafeHash?.txHash) {
                    logger.info(
                      { txHash: transactionBySafeHash.txHash },
                      "Transaction confirmed",
                    )
                    return transactionBySafeHash.txHash
                  }

                  logger.debug("Transaction pending, rechecking in 1 second")
                  return new Promise<string>((res) => {
                    setTimeout(async () => res(await checkTransaction()), 1000)
                  })
                }

                const txHash = await checkTransaction()

                if (txHash) {
                  span.setAttribute("tx.hash", txHash)
                  logger.info({ txHash }, "Waiting for transaction")
                  const receipt = await waitForTransaction(txHash)
                  logger.info(
                    { txHash },
                    "Transaction confirmed, receipt received",
                  )
                  return receipt
                }

                logger.error("Failed to retrieve txHash")
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
                    .then(({ wait, hash }) => {
                      span.setAttribute("tx.hash", hash)
                      return wait()
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
      dispatch(resetPolicyLendersState())
    },
    onError: (error) =>
      logger.error(
        { err: error, policyAddress: policy?.address },
        "Failed to submit policy updates",
      ),
  })

  return { submitUpdates, isSubmitting, isSuccess, isError }
}
