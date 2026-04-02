import { useQuery } from "@tanstack/react-query"
import { TokenWrapper } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"

export const useWrapperAllowance = (
  chainId: number | undefined,
  wrapper: TokenWrapper | undefined,
  account: string | undefined,
) =>
  useQuery({
    queryKey: QueryKeys.Wrapper.GET_ALLOWANCE(
      chainId ?? 0,
      wrapper?.address,
      account,
    ),
    enabled: !!chainId && !!wrapper && !!account,
    refetchInterval: POLLING_INTERVAL,
    queryFn: async () => {
      if (!wrapper || !account) throw new Error("Missing wrapper")
      return wrapper.marketToken.contract.allowance(account, wrapper.address)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
