import { ROUTES } from "@/routes"
import { resolveLenderMarketBackLink } from "@/utils/lenderMarketOrigin"

export const isBorrowerAppPath = (pathname: string) =>
  pathname === ROUTES.borrower.root ||
  pathname.startsWith(`${ROUTES.borrower.root}/`)

export const isBorrowerContextPath = (pathname: string) =>
  isBorrowerAppPath(pathname)

/**
 * Back from a borrower profile: the borrower dashboard when the profile was
 * opened there, otherwise the lender list named by `from` - the same explicit
 * destinations the lender market page resolves, Explore when none is named.
 */
export const resolveBorrowerProfileBackLink = (
  pathname: string,
  from: string | null | undefined,
): string =>
  isBorrowerContextPath(pathname) || from === "borrower"
    ? ROUTES.borrower.root
    : resolveLenderMarketBackLink(from)
