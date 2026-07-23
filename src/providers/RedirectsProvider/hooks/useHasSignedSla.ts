import { useQuery } from "@tanstack/react-query"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { HAS_SIGNED_SLA_KEY } from "@/utils/serviceAgreementQueries"

export { HAS_SIGNED_SLA_KEY } from "@/utils/serviceAgreementQueries"

type Response = {
  isSigned: boolean
}

export const useHasSignedSla = (address: `0x${string}` | undefined) => {
  const { chainId: targetChainId } = useSelectedNetwork()
  return useQuery({
    queryKey: [HAS_SIGNED_SLA_KEY, address, targetChainId, "Lender"],
    enabled: false,
    queryFn: async () => {
      const { isSigned }: Response = await fetch(
        `/api/sla/${address}?chainId=${targetChainId}&party=Lender`,
      ).then((res) => res.json())

      return { isSigned }
    },
  })
}
