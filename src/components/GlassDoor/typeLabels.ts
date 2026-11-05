import { HooksKind, Market } from "@wildcatfi/wildcat-sdk"

import type { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { formatUtcMaturityDate } from "@/utils/formatters"
import { hasActivePullRoleProvider } from "@/utils/marketCapabilities"

/**
 * Market type labels (G4): term and maturity, deposit access, token transfers
 * and a signed MLA, as separate badges. Read from the market's hooks and app
 * data rather than the published snapshot.
 */
export const marketTypeLabels = (
  market: Market,
  mla?: MasterLoanAgreementResponse | { noMLA: boolean } | null,
) => {
  const hooks = market.hooksConfig
  const labels = [
    hooks?.kind === HooksKind.FixedTerm
      ? `Fixed term, matures ${formatUtcMaturityDate(hooks.fixedTermEndTime)}`
      : "Open term",
  ]
  if (hooks) {
    // Restricted deposits are self-onboarding when a pull role provider lets
    // lenders take a credential themselves, else a borrower-run allowlist.
    let deposits = "Deposits open"
    if (hooks.depositRequiresAccess) {
      const providers = market.hooksInstance?.roleProviders
      if (!providers) deposits = "Deposits restricted"
      else
        deposits = hasActivePullRoleProvider(providers)
          ? "Self-onboarding"
          : "Allowlist"
    }
    labels.push(deposits)
    if (hooks.transfersDisabled) labels.push("Transfers disabled")
    else if (hooks.transferRequiresAccess) labels.push("Transfers restricted")
    else labels.push("Transfers open")
  }
  if (mla && !("noMLA" in mla) && mla.borrowerSignature)
    labels.push("MLA signed")
  return labels
}
