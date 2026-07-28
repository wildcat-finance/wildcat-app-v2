import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { SignAgreementProps } from "@/app/[locale]/agreement/hooks/useSignAgreement"
import { toastRequest } from "@/components/Toasts"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { isTerminalClientError } from "@/utils/httpStatus"
import {
  buildServiceAgreementMessage,
  SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
} from "@/utils/serviceAgreementMessage"
import { invalidateToUQueries } from "@/utils/serviceAgreementQueries"

import {
  USE_BORROWER_INVITE_EXISTS_KEY,
  USE_BORROWER_INVITE_KEY,
} from "../../hooks/useBorrowerInvitation"

export const useSubmitAcceptInvitation = () => {
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()
  const client = useQueryClient()
  const { replace } = useRouter()
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  const currentAgreement = useCurrentServiceAgreement()

  const mutation = useMutation({
    mutationFn: async ({ address, name, timeSigned }: SignAgreementProps) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (!name) throw Error(`No organization name`)
      if (!timeSigned) throw Error(`No time signed`)
      if (!token) throw Error(`No token`)
      if (!chainId) throw Error(`No chain ID selected`)
      if (signer.chainId !== chainId) {
        throw Error(`Wallet network does not match selected network`)
      }
      if (token.chainId !== chainId) throw Error(`Wrong-chain API token`)
      if (!currentAgreement.data) throw Error(`Current Terms of Use not loaded`)

      const signPromise = safeSigning.signMessage({
        flow: "invitation-accept",
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
            organizationName: name,
          }),
      })
      const result = safeSigning.safeConnected
        ? await signPromise
        : await toastRequest(signPromise, {
            pending: `Waiting for signature...`,
            success: `Terms of Use signature ready!`,
            error: `Failed to sign Terms of Use!`,
          })
      safeSigning.markSubmitting(result.pendingSafeMessageId)
      try {
        const response = await fetch("/api/invite", {
          method: "PUT",
          body: JSON.stringify({
            chainId,
            signature: result.signature,
            name,
            timeSigned: result.timeSigned,
            address,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.token}`,
          },
        })
        if (response.status === 401) {
          // Token problem, not a signature problem - keep the pending Safe
          // signature so it can be resubmitted after a fresh login.
          removeBadToken()
          throw Error("Failed to accept invitation")
        }
        // A terminal rejection (e.g. timeSigned outside the server window,
        // or the invitation no longer pending) can never succeed on resubmit
        // - discard the pending record so the next attempt starts fresh.
        if (isTerminalClientError(response.status)) {
          safeSigning.markCompleted(result.pendingSafeMessageId)
        }
        const data = await response.json()
        if (!data.success) throw Error("Failed to accept invitation")
        safeSigning.markCompleted(result.pendingSafeMessageId)
      } catch (error) {
        safeSigning.markSubmissionFailed(result.pendingSafeMessageId, error)
        throw error
      }
      return result
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        invalidateToUQueries(client, chainId, variables.address),
        client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_KEY] }),
        client.invalidateQueries({
          queryKey: [USE_BORROWER_INVITE_EXISTS_KEY],
        }),
      ])
      replace(ROUTES.borrower.root)
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
