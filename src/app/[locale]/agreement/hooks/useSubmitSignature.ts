import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"

import { TargetNetwork } from "@/config/network"
import { API_URL } from "@/config/api"
import { ROUTES } from "@/routes"
import { SignatureSubmissionProps } from "./interface"

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
      replace(ROUTES.borrower)
    },
    onError(error) {
      console.log(error)
    },
  })
}
