import { useEffect, useMemo, useState } from "react"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import {
  MasterLoanAgreementResponse,
  MlaSignatureResponse,
} from "@/app/api/mla/interface"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"

export const GET_SIGNED_MLA_KEY = "GET_SIGNED_MLA_KEY"

export const useGetSignedMla = (
  mla: MasterLoanAgreementResponse | null | undefined,
) => {
  const { address, chainId } = useAccount()
  const { chainId: targetChainId } = useSelectedNetwork()

  const getSignedMla = async () => {
    if (!mla) return undefined
    const marketAddress = mla.market
    if (!marketAddress) return undefined
    const res = await fetch(
      `/api/mla/${marketAddress.toLowerCase()}/${address?.toLowerCase()}?chainId=${chainId}`,
    )
    if (res.status === 200) {
      const signed = (await res.json()) as MlaSignatureResponse
      const values = getFieldValuesForLender(
        signed.address,
        +new Date(signed.timeSigned),
      )
      const filledMla = fillInMlaForLender(mla, values, marketAddress)
      return {
        ...signed,
        ...filledMla,
      }
    }
    if (res.status === 404) {
      return null
    }
    return undefined
  }

  return useQuery({
    queryKey: [targetChainId, GET_SIGNED_MLA_KEY, mla?.market, address],
    queryFn: getSignedMla,
    enabled: !!mla?.market && !!address,
  })
}

export const usePreviewSignedMla = (mla: MasterLoanAgreementResponse) => {
  const { address } = useAccount()
  const [timeSigned, setTimeSigned] = useState(0)

  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])

  const preview = useMemo(() => {
    if (!address) return undefined
    const values = getFieldValuesForLender(address, timeSigned)
    return fillInMlaForLender(mla, values, mla.market)
  }, [mla, address, timeSigned])

  return {
    ...preview,
    timeSigned,
  }
}

export const useSignMla = (mla: MasterLoanAgreementResponse) => {
  const { address } = useAccount()
  const { mutateAsync: signMla } = useMutation({
    mutationFn: async (timeSigned: number) => {
      if (!address) throw new Error("No address")
      const values = getFieldValuesForLender(address, timeSigned)
      const { plaintext } = fillInMlaForLender(mla, values, mla.market)
    },
  })
}
