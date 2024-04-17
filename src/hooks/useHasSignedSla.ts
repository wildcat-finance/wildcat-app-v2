import { useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"
import { useMemo } from "react"
import { useAgreementStore } from "@/store/useAgreementStore"

export const HAS_SIGNED_SLA_KEY = "has-signed-sla"

export const useHasSignedSla = () => {
  const url = process.env.REACT_APP_API_URL as string | undefined
  const { address } = useAccount()

  const signatures = useAgreementStore()
  const signature = useMemo(
    () => signatures[`sla-signature-${address?.toLowerCase()}`],
    [address, signatures],
  )
  const { data, isLoading } = useQuery({
    queryKey: [HAS_SIGNED_SLA_KEY],
    refetchOnMount: false,
    enabled: !!address && !!url,
    queryFn: async () => {
      if (signature) return true
      if (!url) throw Error(`API url not defined`)
      const { data: signed } = await fetch(`${url}/sla/${address}`).then(
        (res) => res.json(),
      )
      return signed as boolean
    },
  })

  return {
    hasSignedAgreement: Boolean(signature) || data,
    isLoading,
  }
}
