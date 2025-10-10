import { useQuery, useQueryClient } from "@tanstack/react-query"

import { BorrowerProfile } from "@/app/api/profiles/interface"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

const fetchBorrowerProfile = async (
  address: `0x${string}` | undefined,
  chainId: number,
): Promise<BorrowerProfile | undefined> => {
  if (!address) return undefined
  const normalizedAddress = address.toLowerCase() as `0x${string}`
  const response = await fetch(
    `/api/profiles/${normalizedAddress}?chainId=${chainId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  )

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

export const useGetBorrowerProfile = (address: `0x${string}` | undefined) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = address?.toLowerCase() as `0x${string}` | undefined
  return useQuery<BorrowerProfile | undefined>({
    queryKey: QueryKeys.Borrower.GET_PROFILE(chainId, normalizedAddress),
    queryFn: () => fetchBorrowerProfile(normalizedAddress, chainId),
    enabled: !!normalizedAddress && !!chainId,
    refetchOnMount: false,
  })
}

export const useInvalidateBorrowerProfile = (
  address: `0x${string}` | undefined,
) => {
  const queryClient = useQueryClient()
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = address?.toLowerCase() as `0x${string}` | undefined

  return () => {
    if (normalizedAddress) {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_PROFILE(chainId, normalizedAddress),
      })
    }
  }
}
