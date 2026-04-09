import { useQuery } from "@tanstack/react-query"
import { TokenAmount, TokenWrapper } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"

export type AdoptionData = {
  originalAmount: TokenAmount
  wrappedAmount: TokenAmount
  originalAssetValue: number
  wrappedAssetValue: number
}

/**
 fetches adoption data for the wrapper
 *
 * - lender: personal balances. Shares are converted to their underlying
 *   asset equivalent so percentages match.
 *
 * - borrower: market-wide adoption. shows how much of is split between normal vs wrapped.
 *   `unwrapped = totalSupply - totalAssets` to avoid double-counting, since
 *   totalAssets are market tokens held by the wrapper and already included in
 *   totalSupply.
 */
export const useAdoptionData = (
  chainId: number | undefined,
  wrapper: TokenWrapper | undefined,
  viewerType: "lender" | "borrower",
  account: string | undefined,
) =>
  useQuery({
    queryKey: QueryKeys.Wrapper.GET_ADOPTION(
      chainId ?? 0,
      wrapper?.address,
      viewerType,
      account,
    ),
    enabled: !!chainId && !!wrapper && (viewerType === "borrower" || !!account),
    refetchInterval: POLLING_INTERVAL,
    queryFn: async (): Promise<AdoptionData> => {
      if (!wrapper) throw new Error("Missing wrapper")
      // borrower
      if (viewerType === "borrower") {
        const [totalSupplyRaw, totalAssets] = await Promise.all([
          wrapper.marketToken.contract.totalSupply(),
          wrapper.totalAssets(), // returns TokenAmount in market-token terms
        ])
        const totalSupply = wrapper.marketToken.getAmount(totalSupplyRaw)
        const unwrapped = totalSupply.sub(totalAssets)
        const unwrappedFloat = parseFloat(
          unwrapped.format(unwrapped.token.decimals),
        )
        const wrappedFloat = parseFloat(
          totalAssets.format(totalAssets.token.decimals),
        )

        return {
          originalAmount: unwrapped,
          wrappedAmount: totalAssets,
          originalAssetValue: unwrappedFloat,
          wrappedAssetValue: wrappedFloat,
        }
      }

      // lender
      if (!account) throw new Error("Missing account")

      const [marketBalanceRaw, shareBalanceRaw] = await Promise.all([
        wrapper.marketToken.contract.balanceOf(account),
        wrapper.shareToken.contract.balanceOf(account),
      ])

      const marketBalance = wrapper.marketToken.getAmount(marketBalanceRaw)
      const shareBalance = wrapper.shareToken.getAmount(shareBalanceRaw)

      const sharesAsAssets = shareBalanceRaw.gt(0)
        ? await wrapper.convertToAssets(shareBalance)
        : wrapper.marketToken.getAmount(0)

      const marketFloat = parseFloat(
        marketBalance.format(marketBalance.token.decimals),
      )
      const sharesAsAssetsFloat = parseFloat(
        sharesAsAssets.format(sharesAsAssets.token.decimals),
      )

      return {
        originalAmount: marketBalance,
        wrappedAmount: shareBalance,
        originalAssetValue: marketFloat,
        wrappedAssetValue: sharesAsAssetsFloat,
      }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
