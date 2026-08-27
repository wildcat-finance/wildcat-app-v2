import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { ROUTES } from "@/routes"

export const getServiceAgreementPartyForPath = (
  pathname: string | null | undefined,
): ServiceAgreementPartyInput =>
  pathname?.includes(ROUTES.borrower.root) ? "Borrower" : "Lender"

export const getServiceAgreementRouteForParty = (
  party: ServiceAgreementPartyInput,
) =>
  party === "Borrower" ? ROUTES.borrower.agreement : ROUTES.lender.agreement

export const isServiceAgreementPath = (pathname: string | null | undefined) =>
  pathname === ROUTES.agreement ||
  pathname === ROUTES.borrower.agreement ||
  pathname === ROUTES.lender.agreement
