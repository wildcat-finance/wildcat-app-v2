import { useQuery } from "@tanstack/react-query"

export const HAS_SIGNED_SLA_KEY = "has-signed-sla"

type Response = {
  isSigned: boolean
}

// TODO: Remove when sure that NextJS middleware redirect works fine
export const useHasSignedSla = (address: `0x${string}` | undefined) =>
  useQuery({
    queryKey: [HAS_SIGNED_SLA_KEY, address],
    enabled: false,
    queryFn: async () => {
      const { isSigned }: Response = await fetch(
        `/api/sla/${address}`,
      ).then((res) => res.json())

      return { isSigned }
    },
  })
