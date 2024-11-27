import { useQuery } from "@tanstack/react-query"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { TargetNetwork } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"

export const USE_BORROWERS_KEY = "use-borrowers"

export const useGetBorrowers = () => {
  const url = process.env.NEXT_PUBLIC_API_URL as string | undefined
  const getBorrowers = async () => {
    if (!url) throw Error(`API url not defined`)
    const { data } = await fetch(
      `${url}/borrowers/registered/${TargetNetwork?.name.toLowerCase()}`,
    )
      .then((res) => res.json())
      .catch((err) => {
        console.log(err)
        return undefined
      })
    return data === undefined ? null : (data as BorrowerWithName[])
  }
  const { data, ...result } = useQuery({
    queryKey: [USE_BORROWERS_KEY],
    queryFn: getBorrowers,
    refetchInterval: POLLING_INTERVAL,
    refetchOnMount: false,
  })
  return {
    data: data === null ? undefined : data,
    ...result,
  }
}
