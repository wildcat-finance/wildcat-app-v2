import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { GET_ALL_BORROWER_PROFILES_KEY } from "@/app/[locale]/admin/hooks/useAllBorrowerProfiles"
import { BORROWER_PROFILE_KEY } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { BorrowerProfileInput } from "@/app/api/profiles/interface"
import { toastRequest } from "@/components/Toasts"
import { useAuthToken } from "@/hooks/useApiAuth"

import { USE_REGISTERED_BORROWERS_KEY } from "../../../../borrower/hooks/useBorrowerNames"

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
  const { address } = useAccount()
  const token = useAuthToken()

  const updateBorrowerProfile = async (profile: BorrowerProfileInput) => {
    if (!token.token) {
      throw new Error("No token available. Make sure you are logged in.")
    }
    const response = await fetch(`/api/profiles/updates`, {
      method: "POST",
      body: JSON.stringify({ ...profile }),
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to update profile")
    }

    return response.json()
  }

  return useMutation({
    mutationFn: async (profile: BorrowerProfileInput) => {
      if (!address || !token) {
        throw new Error("No address available. Make sure wallet is connected.")
      }
      // const dataHash = await hashData(profile)
      // const currentDate = formatDateForMessage(new Date())
      // const messageToSign = `I confirm updating my profile data to the new values. Hash of the new data: ${dataHash}, date of changing: ${currentDate}`

      // if (!signer) {
      //   throw new Error("No signer available. Make sure MetaMask is connected.")
      // }

      // const signature = await toastRequest(signer.signMessage(messageToSign), {
      //   pending: `Waiting for MetaMask signature`,
      //   success: `Signed successfully!`,
      //   error: `Failed to sign!`,
      // })

      // if (!signature) {
      //   throw new Error("Failed to obtain blockchain signature")
      // }

      await toastRequest(
        updateBorrowerProfile({
          ...profile,
          address: token.isAdmin
            ? profile.address.toLowerCase()
            : address.toLowerCase(),
        }),
        {
          pending: `Updating profile...`,
          success: `Profile updated successfully`,
          error: `Failed to update profile`,
        },
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BORROWER_PROFILE_KEY] })
      queryClient.invalidateQueries({
        queryKey: [USE_REGISTERED_BORROWERS_KEY],
      })
      if (token.isAdmin) {
        queryClient.invalidateQueries({
          queryKey: [GET_ALL_BORROWER_PROFILES_KEY],
        })
      }
    },
    onError(error) {
      console.error("Error updating profile with blockchain signature:", error)
    },
  })
}
