import { useQuery, useQueryClient } from "@tanstack/react-query"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { BorrowerProfile } from "@/app/api/profiles/interface"
import { QueryKeys } from "@/config/query-keys"
import { logger } from "@/lib/logging/client"

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
    logger.error(
      {
        address: normalizedAddress,
        chainId,
        status: response.status,
        statusText: response.statusText,
      },
      "Failed to fetch profile",
    )
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
    queryKey: QueryKeys.Borrower.GET_PROFILE(
      chainId,
      address?.toLowerCase() as `0x${string}` | undefined,
    ),
    queryFn: () => fetchBorrowerProfile(address, chainId),
    enabled: !!address,
  })

export const useInvalidateBorrowerProfile = (
  chainId: SupportedChainId,
  address: `0x${string}` | undefined,
) => {
  const queryClient = useQueryClient()
  const normalizedAddress = address?.toLowerCase() as `0x${string}` | undefined

  return () => {
    if (normalizedAddress) {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_PROFILE(chainId, normalizedAddress),
      })
    }
  }
}
