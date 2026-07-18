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
import { buildServiceAgreementMessage } from "@/utils/serviceAgreementMessage"

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
          removeBadToken()
          throw Error("Failed to accept invitation")
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
    onSuccess: () => {
      console.log(`Invalidating queries`)
      client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_KEY] })
      client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_EXISTS_KEY] })
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
