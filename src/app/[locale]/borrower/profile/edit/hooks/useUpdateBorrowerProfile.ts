import { useMutation } from "@tanstack/react-query"

import { BorrowerProfileInput } from "@/app/api/profiles/interface"

const sendBorrowerProfile = async (profile: BorrowerProfileInput) => {
  const response = await fetch("http://localhost:3000/api/profiles/updates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  })

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`)
  }

  return response.json()
}

export const useUpdateBorrowerProfile = () =>
  useMutation({
    mutationFn: (profile: BorrowerProfileInput) => sendBorrowerProfile(profile),
  })
