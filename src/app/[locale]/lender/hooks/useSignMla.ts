import { useEffect, useMemo, useState } from "react"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import {
  MasterLoanAgreementResponse,
  MlaSignatureResponse,
} from "@/app/api/mla/interface"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"

export const GET_SIGNED_MLA_KEY = "GET_SIGNED_MLA_KEY"

export const useGetSignedMla = (marketAddress: string | undefined) => {
  const { address } = useAccount()
  const getSignedMla = async () => {
    if (!marketAddress) return undefined
    const res = await fetch(
      `/api/mla/${marketAddress.toLowerCase()}/${address?.toLowerCase()}`,
    )
    if (res.status === 200) {
      return res.json() as Promise<MlaSignatureResponse>
    }
    if (res.status === 404) {
      return null
    }
    return undefined
  }

  return useQuery({
    queryKey: [GET_SIGNED_MLA_KEY, marketAddress, address],
    queryFn: getSignedMla,
    enabled: !!marketAddress && !!address,
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
    return fillInMlaForLender(mla, values)
  }, [mla, address, timeSigned])

  return {
    ...preview,
    timeSigned,
  }
}

export const useSignMla = (mla: MasterLoanAgreementResponse) => {
  const { address } = useAccount()

  useMutation({
    mutationFn: async (timeSigned: number) => {
      if (!address) throw new Error("No address")
      const values = getFieldValuesForLender(address, timeSigned)
      fillInMlaForLender(mla, values)
    },
  })
}
