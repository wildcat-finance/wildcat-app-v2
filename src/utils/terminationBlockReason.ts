/// Pure routing for the Terminate Market modal (product#538).
/// Decides which flow the modal shows from the SDK's previewCloseMarket()
/// status, so a market inside its fixed term gets the real reason instead
/// of the repay-debt flow with a zero-debt table and a dead button. The SDK
/// status is the single authority: it already encodes the escape hatches
/// (allowClosureBeforeTerm, or allowTermReduction off Sepolia), so nothing
/// here re-derives "can this close early" from raw config.
import { CloseMarketStatus, HooksKind } from "@wildcatfi/wildcat-sdk"

export type TerminateModalFlow = "terminate" | "repayAndTerminate" | "blocked"

export interface TerminationBlockDetails {
  status: CloseMarketStatus
  /// Unix seconds; present when the market is a fixed-term market.
  fixedTermEndTime?: number
  /// True when the borrower can pull maturity forward and then terminate.
  allowTermReduction?: boolean
}

export interface TerminationRouting {
  flow: TerminateModalFlow
  block?: TerminationBlockDetails
}

/// Minimal structural slice of the SDK's HooksConfig this decision needs.
export interface FixedTermConfigSlice {
  kind: HooksKind
  fixedTermEndTime?: number
  allowTermReduction?: boolean
}

const REPAY_STATUSES: CloseMarketStatus[] = [
  CloseMarketStatus.InsufficientBalance,
  CloseMarketStatus.InsufficientAllowance,
  CloseMarketStatus.UnpaidWithdrawalBatches,
]

export function routeTermination({
  status,
  outstandingDebtIsZero,
  hooksConfig,
}: {
  status: CloseMarketStatus
  outstandingDebtIsZero: boolean
  hooksConfig?: FixedTermConfigSlice
}): TerminationRouting {
  if (status === CloseMarketStatus.Ready) {
    return { flow: outstandingDebtIsZero ? "terminate" : "repayAndTerminate" }
  }
  if (REPAY_STATUSES.includes(status)) {
    return { flow: "repayAndTerminate" }
  }
  // EarlyClosureNotAllowed and NotBorrower: no amount of repaying helps, so
  // the repay flow would mislead. Explain instead.
  const block: TerminationBlockDetails = { status }
  if (
    status === CloseMarketStatus.EarlyClosureNotAllowed &&
    hooksConfig?.kind === HooksKind.FixedTerm
  ) {
    block.fixedTermEndTime = hooksConfig.fixedTermEndTime
    block.allowTermReduction = hooksConfig.allowTermReduction ?? false
  }
  return { flow: "blocked", block }
}
