import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { API_URL } from "@/config/api"
import { TargetNetwork } from "@/config/network"
import { ROUTES } from "@/routes"

import { SignatureSubmissionProps } from "./interface"

export async function submitSignature(input: SignatureSubmissionProps) {
  const network = TargetNetwork.stringID
  const url = API_URL
  if (!url) throw Error(`API url not defined`)

  await fetch(`${url}/sla`, {
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
}

export function useSubmitSignature() {
  const { replace } = useRouter()
  const network = TargetNetwork.stringID
  const url = API_URL

  return useMutation({
    mutationFn: async (input: SignatureSubmissionProps) => {
      if (!url) throw Error(`API url not defined`)

      await fetch(`${url}/sla`, {
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
    },
    onSuccess: () => {
      replace(ROUTES.borrower.root)
    },
    onError(error) {
      console.log(error)
    },
  })
}
