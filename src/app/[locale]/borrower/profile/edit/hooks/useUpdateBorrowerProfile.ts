import { useMutation, useQueryClient } from "@tanstack/react-query"

import { BORROWER_PROFILE_KEY } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { BorrowerProfileInput } from "@/app/api/profiles/interface"
import { toastRequest } from "@/components/Toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"

const hashData = async (data: object): Promise<string> => {
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(JSON.stringify(data))
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedData)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

const formatDateForMessage = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes} ${date.getFullYear()}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`
}

export const useUpdateBorrowerProfile = () => {
  const queryClient = useQueryClient()
  const signer = useEthersSigner()

  const updateBorrowerProfile = async (
    profile: BorrowerProfileInput,
    signature: string,
    updatedAt: number,
  ) => {
    const response = await fetch(`/api/profiles/${profile.address}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...profile, signature, updatedAt }),
    })

    if (!response.ok) {
      throw new Error("Failed to update profile")
    }

    return response.json()
  }

  return useMutation({
    mutationFn: async (profile: BorrowerProfileInput) => {
      const dataHash = await hashData(profile)
      const currentDate = formatDateForMessage(new Date())
      const messageToSign = `I confirm updating my profile data to the new values. Hash of the new data: ${dataHash}, date of changing: ${currentDate}`

      if (!signer) {
        throw new Error("No signer available. Make sure MetaMask is connected.")
      }

      const signature = await toastRequest(signer.signMessage(messageToSign), {
        pending: `Waiting for MetaMask signature`,
        success: `Signed successfully!`,
        error: `Failed to sign!`,
      })

      if (!signature) {
        throw new Error("Failed to obtain blockchain signature")
      }

      return updateBorrowerProfile(profile, signature, Date.now())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BORROWER_PROFILE_KEY] })
    },
    onError(error) {
      console.error("Error updating profile with blockchain signature:", error)
    },
  })
}
