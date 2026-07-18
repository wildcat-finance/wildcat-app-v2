import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { toastError, toastRequest } from "@/components/Toasts"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { SLA_STATUS_QUERY_KEY } from "@/hooks/useNetworkGate"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { HAS_SIGNED_SLA_KEY } from "@/providers/RedirectsProvider/hooks/useHasSignedSla"
import { buildServiceAgreementMessage } from "@/utils/serviceAgreementMessage"

import { SignatureSubmissionProps } from "./interface"

export type SignAgreementProps = {
  address: string | undefined
  name: string | undefined
  timeSigned: number | undefined
}

export async function submitSignature(input: SignatureSubmissionProps) {
  const result = await fetch(`/api/sla`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      chainId: input.chainId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  }).then((res) => res.json())
  if (!result.success) {
    throw Error(`Failed to submit signature`)
  }
}

export const useSignAgreement = () => {
  const signer = useEthersSigner()
  const { chainId } = useSelectedNetwork()
  const safeSigning = useSafeMessageSigning()
  const router = useRouter()
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
        await submitSignature({
          signature: result.signature,
          name,
          timeSigned: result.timeSigned,
          address,
          chainId,
        })
        safeSigning.markCompleted(result.pendingSafeMessageId)
      } catch (error) {
        safeSigning.markSubmissionFailed(result.pendingSafeMessageId, error)
        toastError("Failed to submit TOU signature.")
        throw error
      }
      return result
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: [SLA_STATUS_QUERY_KEY],
        exact: false,
      })
      client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] })
      router.back()
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
