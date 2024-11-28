import { useQuery } from "@tanstack/react-query"

import { BorrowerProfile } from "@/app/api/profiles/interface"

export const BORROWER_PROFILE_KEY = "borrower-profile-key"

const fetchBorrowerProfile = async (
  address: `0x${string}` | undefined,
): Promise<BorrowerProfile> => {
  const response = await fetch(`/api/profiles/${address}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-cache",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch borrower profile: ${response.statusText}`)
  }

  const data = await response.json()
  return data.profile as BorrowerProfile
}

export const useGetBorrowerProfile = (address: `0x${string}` | undefined) =>
  useQuery<BorrowerProfile>({
    queryKey: [BORROWER_PROFILE_KEY, address],
    queryFn: () => fetchBorrowerProfile(address),
  })
