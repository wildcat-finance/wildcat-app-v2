import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { usePathname, useRouter } from "next/navigation"

import { toastError, toastRequest } from "@/components/Toasts"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isTerminalClientError } from "@/utils/httpStatus"
import { currentReturnTarget } from "@/utils/returnTarget"
import {
  buildServiceAgreementMessage,
  SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
} from "@/utils/serviceAgreementMessage"
import { getServiceAgreementPartyForPath } from "@/utils/serviceAgreementParty"
import { invalidateToUQueries } from "@/utils/serviceAgreementQueries"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  timeSigned: number | undefined
}

export const useSignAgreement = () => {
  const { t } = useTranslation()
  const signer = useEthersSigner()
  const { chainId } = useSelectedNetwork()
  const safeSigning = useSafeMessageSigning()
  const router = useRouter()
  const pathname = usePathname()
  const client = useQueryClient()
  const currentAgreement = useCurrentServiceAgreement()

  const mutation = useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!name) throw Error(`No organization name`)
      if (!timeSigned) throw Error(`No time signed`)
      if (!currentAgreement.data) throw Error(`Current Terms of Use not loaded`)
      if (signer.chainId !== chainId) {
        throw Error(`Wallet network does not match selected network`)
      }

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
            acknowledgementText: currentAgreement.data.acknowledgementText,
            timeSigned: effectiveTimeSigned,
            chainId,
          }),
      })
      const result = safeSigning.safeConnected
        ? await signPromise
        : await toastRequest(signPromise, {
            pending: `Waiting For Signature...`,
            success: `Terms of Use signature ready!`,
            error: `Failed to sign Terms of Use!`,
          })
      safeSigning.markSubmitting(result.pendingSafeMessageId)
      try {
        const response = await fetch(`/api/sla`, {
          method: "POST",
          body: JSON.stringify({
            signature: result.signature,
            name,
            timeSigned: result.timeSigned,
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
          safeSigning.markCompleted(result.pendingSafeMessageId)
        }
        if (!submission.success) throw Error(`Failed to submit signature`)
        safeSigning.markCompleted(result.pendingSafeMessageId)
      } catch (error) {
        safeSigning.markSubmissionFailed(result.pendingSafeMessageId, error)
        toastError(t("agreement.page.toasts.submitFailed"))
        throw error
      }
      return result
    },
    onSuccess: async (_, variables) => {
      await invalidateToUQueries(client, chainId, variables.address)
      // A successful signature must not leave the application. Return to the
      // validated target carried on the URL, or to the party's own root.
      router.replace(
        currentReturnTarget(getServiceAgreementPartyForPath(pathname)),
      )
    },
    onError(error) {
      console.log(error)
    },
  })

  return {
    ...mutation,
    isAgreementLoading: currentAgreement.isLoading,
  }
}
