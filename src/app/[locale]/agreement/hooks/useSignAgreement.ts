import { context } from "@opentelemetry/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { toastError, toastRequest } from "@/components/Toasts"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"
import { isTerminalClientError } from "@/utils/httpStatus"
import {
  buildServiceAgreementMessage,
  SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
} from "@/utils/serviceAgreementMessage"
import { invalidateToUQueries } from "@/utils/serviceAgreementQueries"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  timeSigned: number | undefined
}

export const useSignAgreement = () => {
  const signer = useEthersSigner()
  const { chainId } = useSelectedNetwork()
  const safeSigning = useSafeMessageSigning()
  const router = useRouter()
  const client = useQueryClient()
  const currentAgreement = useCurrentServiceAgreement()
  const flow = useFlowMutation()

  const mutation = useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      flow.start("agreement.sign.flow", {
        "agreement.address": address?.toLowerCase() ?? "",
        "safe.connected": safeSigning.safeConnected,
      })

      try {
        const result = await withClientSpan(
          "agreement.sign",
          async (span) => {
            if (!signer) throw Error(`No signer`)
            if (!address) throw Error(`No address`)
            if (!name) throw Error(`No organization name`)
            if (!timeSigned) throw Error(`No time signed`)
            if (!currentAgreement.data)
              throw Error(`Current Terms of Use not loaded`)
            if (signer.chainId !== chainId) {
              throw Error(`Wallet network does not match selected network`)
            }

            span.setAttributes({
              "agreement.address": address.toLowerCase(),
              "operation.kind": "signature",
            })

            const signPromise = safeSigning.signMessage({
              flow: "initial-tou",
              address,
              chainId,
              timeSigned,
              // Expire the pending Safe record exactly when the server would start
              // rejecting its embedded timeSigned, so a too-slow ceremony discards
              // itself instead of resubmitting a guaranteed 400 forever.
              expiresAt: timeSigned + SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
              buildMessage: (effectiveTimeSigned) =>
                buildServiceAgreementMessage({
                  acknowledgementText:
                    currentAgreement.data.acknowledgementText,
                  timeSigned: effectiveTimeSigned,
                  chainId,
                }),
            })
            const signResult = safeSigning.safeConnected
              ? await signPromise
              : await toastRequest(signPromise, {
                  pending: `Waiting For Signature...`,
                  success: `Terms of Use signature ready!`,
                  error: `Failed to sign Terms of Use!`,
                })
            logger.info(
              { name, timeSigned: signResult.timeSigned, address },
              "Got signature",
            )
            safeSigning.markSubmitting(signResult.pendingSafeMessageId)
            try {
              const response = await fetch(`/api/sla`, {
                method: "POST",
                body: JSON.stringify({
                  signature: signResult.signature,
                  name,
                  timeSigned: signResult.timeSigned,
                  address,
                  chainId,
                }),
                headers: { "Content-Type": "application/json" },
                credentials: "include",
              })
              const submission = await response.json()
              // A terminal rejection (e.g. timeSigned outside the server window)
              // can never succeed on resubmit - discard the pending record so the
              // next attempt starts a fresh ceremony with a fresh timestamp.
              if (isTerminalClientError(response.status)) {
                safeSigning.markCompleted(signResult.pendingSafeMessageId)
              }
              if (!submission.success) throw Error(`Failed to submit signature`)
              safeSigning.markCompleted(signResult.pendingSafeMessageId)
            } catch (error) {
              safeSigning.markSubmissionFailed(
                signResult.pendingSafeMessageId,
                error,
              )
              toastError("Failed to submit TOU signature.")
              throw error
            }
            return signResult
          },
          {
            parentContext: flow.getParentContext() ?? context.active(),
            attributes: {
              "safe.connected": safeSigning.safeConnected,
            },
          },
        )
        flow.endSuccess()
        return result
      } catch (error) {
        flow.endError(error)
        throw error
      }
    },
    onSuccess: async (_, variables) => {
      await invalidateToUQueries(client, chainId, variables.address)
      router.back()
    },
    onError(error) {
      logger.error({ err: error }, "Failed to sign agreement")
    },
  })

  return {
    ...mutation,
    isAgreementLoading: currentAgreement.isLoading,
  }
}
