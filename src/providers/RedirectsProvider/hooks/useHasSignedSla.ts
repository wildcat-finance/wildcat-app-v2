import { useQuery } from "@tanstack/react-query"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const HAS_SIGNED_SLA_KEY = "has-signed-sla"

type Response = {
  isSigned: boolean
}

export const useHasSignedSla = (address: `0x${string}` | undefined) => {
  const { chainId: targetChainId } = useSelectedNetwork()
  return useQuery({
    queryKey: [HAS_SIGNED_SLA_KEY, address],
    enabled: false,
    queryFn: async () => {
      const { isSigned }: Response = await fetch(`/api/sla/${address}?chainId=${targetChainId}`).then(
        (res) => res.json(),
      )

      return { isSigned }
    },
  })
}