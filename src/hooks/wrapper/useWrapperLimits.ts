import { useQuery } from "@tanstack/react-query"
import { TokenWrapper } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"

export const useWrapperLimits = (
  chainId: number | undefined,
  wrapper: TokenWrapper | undefined,
  account: string | undefined,
) =>
  useQuery({
    queryKey: QueryKeys.Wrapper.GET_LIMITS(
      chainId ?? 0,
      wrapper?.address,
      account,
    ),
    enabled: !!chainId && !!wrapper && !!account,
    refetchInterval: POLLING_INTERVAL,
    queryFn: async () => {
      if (!wrapper || !account) throw new Error("Missing wrapper")
      const [maxDeposit, maxMint, maxWithdraw, maxRedeem] = await Promise.all([
        wrapper.maxDeposit(account),
        wrapper.maxMint(account),
        wrapper.maxWithdraw(account),
        wrapper.maxRedeem(account),
      ])
      return { maxDeposit, maxMint, maxWithdraw, maxRedeem }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
