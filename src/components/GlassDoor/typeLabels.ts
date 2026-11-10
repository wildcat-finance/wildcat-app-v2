import { HooksKind, Market } from "@wildcatfi/wildcat-sdk"

import type { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { formatUtcMaturityDate } from "@/utils/formatters"
import { hasActivePullRoleProvider } from "@/utils/marketCapabilities"

import { text } from "./text"

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
      ? text("shared.typeLabels.fixedTerm", {
          date: formatUtcMaturityDate(hooks.fixedTermEndTime),
        })
      : text("shared.typeLabels.openTerm"),
  ]
  if (hooks) {
    // Restricted deposits are self-onboarding when a pull role provider lets
    // lenders take a credential themselves, else a borrower-run allowlist.
    let deposits = text("shared.typeLabels.depositsOpen")
    if (hooks.depositRequiresAccess) {
      const providers = market.hooksInstance?.roleProviders
      if (!providers) deposits = text("shared.typeLabels.depositsRestricted")
      else
        deposits = hasActivePullRoleProvider(providers)
          ? text("shared.typeLabels.selfOnboarding")
          : text("shared.typeLabels.allowlist")
    }
    labels.push(deposits)
    if (hooks.transfersDisabled)
      labels.push(text("shared.typeLabels.transfersDisabled"))
    else if (hooks.transferRequiresAccess)
      labels.push(text("shared.typeLabels.transfersRestricted"))
    else labels.push(text("shared.typeLabels.transfersOpen"))
  }
  if (mla && !("noMLA" in mla) && mla.borrowerSignature)
    labels.push(text("shared.typeLabels.mlaSigned"))
  return labels
}
