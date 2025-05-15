import { ROUTES } from "@/routes"

const NO_WALLET_RESTRICTED_PATHS = [
  ROUTES.agreement,
  ROUTES.borrower.createMarket,
  ROUTES.borrower.market,
  ROUTES.borrower.lendersList,
]

export const isNotPublicPath = (pathname: string): boolean => {
  if (pathname.startsWith(ROUTES.borrower.market)) {
    return true
  }
  return NO_WALLET_RESTRICTED_PATHS.includes(pathname)
}
