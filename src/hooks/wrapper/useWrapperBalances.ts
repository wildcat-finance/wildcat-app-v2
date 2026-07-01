import { useQuery } from "@tanstack/react-query"
import { TokenWrapper } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"

export type WrapperBalances = {
  marketBalance: ReturnType<TokenWrapper["marketToken"]["getAmount"]>
  shareBalance: ReturnType<TokenWrapper["shareToken"]["getAmount"]>
}

export const useWrapperBalances = (
  chainId: number | undefined,
  wrapper: TokenWrapper | undefined,
  account: string | undefined,
) =>
  useQuery({
    queryKey: QueryKeys.Wrapper.GET_BALANCES(
      chainId ?? 0,
      wrapper?.address,
      account,
    ),
    enabled: !!chainId && !!wrapper && !!account,
    refetchInterval: POLLING_INTERVAL,
    queryFn: async () => {
      if (!wrapper || !account) throw new Error("Missing wrapper")
      const [marketBalance, shareBalance] = await Promise.all([
        wrapper.marketToken.balanceOf(account),
        wrapper.shareToken.balanceOf(account),
      ])
      return {
        marketBalance,
        shareBalance,
      }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
