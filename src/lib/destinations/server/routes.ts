import type { DestinationDraft } from "./adapters/types"
import type { WildcatToken } from "./universe"
import { MIN_AVAILABLE_LIQUIDITY_USD, THIN_LIQUIDITY_USD } from "../constants"
import type { Destination, DestinationNotice, DestinationRoute } from "../types"

export type RouteRejection = "loan_asset_mismatch" | "below_liquidity_floor"

type RouteRule = {
  reject: (
    draft: DestinationDraft,
    token: WildcatToken,
  ) => RouteRejection | null
  notices: (draft: DestinationDraft) => DestinationNotice[]
  /** Sort key within a market, highest first */
  rank: (destination: Destination) => number
}

// Rules every venue of a route passes, whichever platform it comes from. The
// borrow copy (carry, liquidation risk, Loopable) assumes the loan asset is the
// market's own asset, so that is enforced here rather than by each adapter.
export const ROUTE_RULES: Record<DestinationRoute, RouteRule> = {
  BORROW_AGAINST: {
    reject: ({ loanAsset, figures }, token) => {
      if (loanAsset.address.toLowerCase() !== token.asset.toLowerCase()) {
        return "loan_asset_mismatch"
      }
      if (figures.availableLiquidityUsd < MIN_AVAILABLE_LIQUIDITY_USD) {
        return "below_liquidity_floor"
      }
      return null
    },
    notices: ({ figures }) =>
      figures.availableLiquidityUsd < THIN_LIQUIDITY_USD
        ? ["THIN_LIQUIDITY"]
        : [],
    rank: ({ figures }) => figures.availableLiquidityUsd,
  },
}
