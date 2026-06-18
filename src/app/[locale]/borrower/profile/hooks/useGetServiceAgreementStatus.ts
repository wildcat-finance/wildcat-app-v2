import { useQuery } from "@tanstack/react-query"

import { ServiceAgreementStatusResponse } from "@/app/api/service-agreement/interface"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

const fetchServiceAgreementStatus = async (
  address: string | undefined,
  chainId: number,
): Promise<ServiceAgreementStatusResponse | undefined> => {
  if (!address) return undefined
  const response = await fetch(
    `/api/service-agreement/${address.toLowerCase()}/status?chainId=${chainId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  )
  if (!response.ok) {
    throw new Error("Failed to fetch service agreement status")
  }
  return response.json() as Promise<ServiceAgreementStatusResponse>
}

export const useGetServiceAgreementStatus = (
  address: string | undefined,
  externalChainId?: number,
) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const normalizedAddress = address?.toLowerCase()
  return useQuery<ServiceAgreementStatusResponse | undefined>({
    queryKey: QueryKeys.ServiceAgreement.GET_STATUS(chainId, normalizedAddress),
    queryFn: () => fetchServiceAgreementStatus(normalizedAddress, chainId),
    enabled: !!normalizedAddress && !!chainId,
    refetchOnMount: false,
  })
}
