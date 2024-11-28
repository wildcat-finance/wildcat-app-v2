import { useMutation, useQueryClient } from "@tanstack/react-query"

import { BORROWER_PROFILE_KEY } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { BorrowerProfileInput } from "@/app/api/profiles/interface"

export const useUpdateBorrowerProfile = () => {
  const queryClient = useQueryClient()

  const updateBorrowerProfile = async (profile: BorrowerProfileInput) => {
    const response = await fetch(`/api/profiles/${profile.address}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    })

    if (!response.ok) {
      throw new Error("Failed to update profile")
    }

    return response.json()
  }

  return useMutation({
    mutationFn: (profile: BorrowerProfileInput) =>
      updateBorrowerProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BORROWER_PROFILE_KEY] })
    },
  })
}
