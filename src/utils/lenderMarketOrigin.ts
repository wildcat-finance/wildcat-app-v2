import { ROUTES } from "@/routes"

// The URL carries a list identifier so new tabs and reloads keep the same Back
// destination. Resolve only these identifiers, never an arbitrary return URL.
const ORIGIN_ROUTES = {
  explore: ROUTES.lender.explore,
  "my-markets": ROUTES.lender.myMarkets,
  "all-markets": ROUTES.lender.allMarkets,
} as const

export type LenderMarketOrigin = keyof typeof ORIGIN_ROUTES

const isLenderMarketOrigin = (
  value: string | null | undefined,
): value is LenderMarketOrigin =>
  !!value && Object.prototype.hasOwnProperty.call(ORIGIN_ROUTES, value)

/**
 * The name for the lender list page at `pathname`, or undefined anywhere else
 * — including the borrower side, profiles and the market page itself.
 *
 * Exact equality is enough: i18nConfig sets `noPrefix`, so usePathname() yields
 * a bare "/lender/my-markets" with no locale segment in front of it.
 */
export const lenderMarketOriginOf = (
  pathname: string | null | undefined,
): LenderMarketOrigin | undefined =>
  (Object.keys(ORIGIN_ROUTES) as LenderMarketOrigin[]).find(
    (origin) => ORIGIN_ROUTES[origin] === pathname,
  )

export const resolveLenderMarketBackLink = (
  origin: string | null | undefined,
): string =>
  isLenderMarketOrigin(origin) ? ORIGIN_ROUTES[origin] : ROUTES.lender.root
