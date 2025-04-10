import { useQuery, useQueryClient } from "@tanstack/react-query"

import { BorrowerProfile } from "@/app/api/profiles/interface"

export const BORROWER_PROFILE_KEY = "borrower-profile-key"

const fetchBorrowerProfile = async (
  address: `0x${string}` | undefined,
): Promise<BorrowerProfile | undefined> => {
  if (!address) return undefined
  const response = await fetch(`/api/profiles/${address}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (response.status === 404) {
    return undefined
  }

  if (!response.ok) {
    console.log(`Failed to fetch profile: ${response.statusText}`)
    throw new Error("Failed to fetch profile")
  }

  const data = await response.json()
  return data.profile as BorrowerProfile
}

export const useGetBorrowerProfile = (address: `0x${string}` | undefined) =>
  useQuery<BorrowerProfile | undefined>({
    queryKey: [BORROWER_PROFILE_KEY, address],
    queryFn: () => fetchBorrowerProfile(address),
    enabled: !!address,
    refetchOnMount: false,
  })

export const useInvalidateBorrowerProfile = (
  address: `0x${string}` | undefined,
) => {
  const queryClient = useQueryClient()

  return () => {
    if (address) {
      queryClient.invalidateQueries({ queryKey: [BORROWER_PROFILE_KEY] })
    }
  }
}
