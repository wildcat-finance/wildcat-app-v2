import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { ROUTES } from "@/routes"

import { isBorrowerAppPath } from "./profileRoutes"

export const getServiceAgreementPartyForPath = (
  pathname: string | null | undefined,
): ServiceAgreementPartyInput =>
  pathname && isBorrowerAppPath(pathname) ? "Borrower" : "Lender"

export const getServiceAgreementRouteForParty = (
  party: ServiceAgreementPartyInput,
) =>
  party === "Borrower" ? ROUTES.borrower.agreement : ROUTES.lender.agreement

export const isServiceAgreementPath = (pathname: string | null | undefined) =>
  pathname === ROUTES.agreement ||
  pathname === ROUTES.borrower.agreement ||
  pathname === ROUTES.lender.agreement
