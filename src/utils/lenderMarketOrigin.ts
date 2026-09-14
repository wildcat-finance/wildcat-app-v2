import { ROUTES } from "@/routes"

/**
 * Three separate routes list markets to a lender — /lender, /lender/my-markets
 * and /lender/all-markets — and a market opened from one of them looks exactly
 * like a market opened from another. So the lender area records which list page
 * it was last on, and the market's Back control reads that back.
 *
 * The record is kept out of the market URL deliberately: the address bar is
 * part of the product, and a shared market link should not carry one visitor's
 * navigation history. It lives in the store, which survives client-side
 * navigation, and is mirrored into sessionStorage so a reload on the market
 * page does not lose it. Both are per-tab and per-session, which is the same
 * lifetime as the question being answered.
 *
 * What it cannot survive is a market URL opened cold — pasted into a fresh tab,
 * or reached from outside the lender area. Those fall back to /lender, which is
 * where this control pointed unconditionally before.
 *
 * It is deliberately not `router.back()`. That reads the whole tab's session
 * history rather than this application's, so it sent lenders out of the app
 * entirely; see the note in src/components/BackButton/index.tsx and issue 32.
 */
const ORIGIN_ROUTES = {
  explore: ROUTES.lender.explore,
  "my-markets": ROUTES.lender.myMarkets,
  "all-markets": ROUTES.lender.allMarkets,
} as const

export type LenderMarketOrigin = keyof typeof ORIGIN_ROUTES

/** Mirrors the store so a reload on the market page keeps the way back. */
export const LENDER_MARKET_ORIGIN_STORAGE_KEY = "lenderMarketOrigin"

const isLenderMarketOrigin = (
  value: string | null | undefined,
): value is LenderMarketOrigin =>
  // Own keys only. A plain property read would answer "constructor" and
  // "toString" with things off Object.prototype, and those are truthy.
  !!value && Object.prototype.hasOwnProperty.call(ORIGIN_ROUTES, value)

/**
 * The name for the lender list page at `pathname`, or undefined anywhere else
 * — including the borrower side, the lender profile and the market page itself,
 * none of which this control knows how to return to.
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

/**
 * The page a recorded name refers to. Anything unrecognised — nothing recorded
 * yet, or a value left by an older build — falls back to /lender.
 */
export const resolveLenderMarketBackLink = (
  origin: LenderMarketOrigin | null | undefined,
): string => (origin ? ORIGIN_ROUTES[origin] : ROUTES.lender.root)

/**
 * Storage is allowed to be missing or to throw: private browsing and
 * site-data blocking both do that, and losing the way back is not worth an
 * exception. Same treatment as the TelegramBanner's own storage reads.
 */
export const readStoredLenderMarketOrigin = ():
  | LenderMarketOrigin
  | undefined => {
  if (typeof window === "undefined") return undefined
  try {
    const stored = window.sessionStorage.getItem(
      LENDER_MARKET_ORIGIN_STORAGE_KEY,
    )
    return isLenderMarketOrigin(stored) ? stored : undefined
  } catch {
    return undefined
  }
}

export const writeStoredLenderMarketOrigin = (
  origin: LenderMarketOrigin,
): void => {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(LENDER_MARKET_ORIGIN_STORAGE_KEY, origin)
  } catch {
    // Nothing to do: the store still holds it for this navigation.
  }
}
