import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { ROUTES } from "@/routes"

export const getServiceAgreementPartyForPath = (
  pathname: string | null | undefined,
): ServiceAgreementPartyInput =>
  pathname?.includes(ROUTES.borrower.root) ? "Borrower" : "Lender"
