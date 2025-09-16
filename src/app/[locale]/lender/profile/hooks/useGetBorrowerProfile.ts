import { useQuery, useQueryClient } from "@tanstack/react-query"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { BorrowerProfile } from "@/app/api/profiles/interface"

export const BORROWER_PROFILE_KEY = "borrower-profile-key"

const fetchBorrowerProfile = async (
  address: `0x${string}` | undefined,
  chainId: number,
): Promise<BorrowerProfile | undefined> => {
  if (!address) return undefined
  const response = await fetch(`/api/profiles/${address}?chainId=${chainId}`, {
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

export const useGetBorrowerProfile = (
  chainId: SupportedChainId,
  address: `0x${string}` | undefined,
) =>
  useQuery<BorrowerProfile | undefined>({
    queryKey: [BORROWER_PROFILE_KEY, address],
    queryFn: () => fetchBorrowerProfile(address, chainId),
    enabled: !!address,
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
