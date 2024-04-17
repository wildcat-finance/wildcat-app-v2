import { TargetNetwork } from "@/config/network"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { API_URL } from "@/config/api"
import { toastifyInfo } from "@/components/toasts"
import { useAgreementStore } from "@/store/useAgreementStore"
import { redirect } from "next/navigation"
import { HAS_SIGNED_SLA_KEY } from "@/hooks/useHasSignedSla"
import { USE_BORROWER_INVITE_KEY } from "@/hooks/useBorrowerInvitation"
import { ROUTES } from "@/routes"

export interface SignatureSubmissionProps {
  address: string
  name: string
  signature: string
  messageHash?: string
  dateSigned?: string
}

export function useSubmitSignature() {
  const network = TargetNetwork.stringID
  const client = useQueryClient()
  const url = API_URL
  const signatures = useAgreementStore()
  return useMutation({
    mutationFn: async (input: SignatureSubmissionProps) => {
      if (!url) throw Error(`API url not defined`)

      await fetch(`${url}/accept`, {
        method: "POST",
        body: JSON.stringify({
          ...input,
          network,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      signatures.setBorrowerSignature(input.address, input.signature)
    },
    onSuccess: () => {
      setTimeout(() => {
        toastifyInfo(`Redirecting to Markets List...`)
        redirect(`${ROUTES.borrower}`)
      }, 3000)
      client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] })
      client.invalidateQueries({ queryKey: [USE_BORROWER_INVITE_KEY] })
    },
    onError(error) {
      console.log(error)
    },
  })
}
