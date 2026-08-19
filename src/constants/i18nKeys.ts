import { HooksKind } from "@wildcatfi/wildcat-sdk"

import { LenderWithdrawalActionState } from "@/app/[locale]/lender/market/[address]/utils"

/**
 * Explicit i18n key lookups for values that vary at runtime.
 *
 * Building a key by interpolation hides it from grep and from
 * scripts/i18n/check-i18n.mjs, so a renamed or missing key surfaces as a raw
 * dotted string in the UI instead of failing a check. Every key below is a
 * literal, and every map is exhaustive over its union -- adding a HooksKind
 * member breaks the build here rather than in production.
 *
 * Paths are the CURRENT ones. The key rename has not happened yet; when it does,
 * the codemod rewrites any literal that matches a mapped key, so these move with
 * everything else.
 *
 */

export const POLICY_TYPE_KEY: Record<HooksKind, string> = {
  [HooksKind.Unknown]: "policyType.Unknown",
  [HooksKind.OpenTerm]: "marketParameters.policyType.openTerm",
  [HooksKind.FixedTerm]: "marketParameters.policyType.fixedTerm",
  [HooksKind.PeriodicTerm]: "policyType.PeriodicTerm",
}

export const MARKET_TYPE_CHIP_KEY: Record<HooksKind, string> = {
  [HooksKind.Unknown]: "marketTypeChip.kind.Unknown",
  [HooksKind.OpenTerm]: "marketTypeChip.kind.OpenTerm",
  [HooksKind.FixedTerm]: "marketTypeChip.kind.FixedTerm",
  [HooksKind.PeriodicTerm]: "marketTypeChip.kind.PeriodicTerm",
}

export const MARKET_TERM_TEXT_KEY: Record<HooksKind, string> = {
  [HooksKind.Unknown]:
    "borrowerMarketDetails.parameters.marketTerm.Unknown.text",
  [HooksKind.OpenTerm]:
    "borrowerMarketDetails.parameters.marketTerm.OpenTerm.text",
  [HooksKind.FixedTerm]:
    "borrowerMarketDetails.parameters.marketTerm.FixedTerm.text",
  [HooksKind.PeriodicTerm]:
    "borrowerMarketDetails.parameters.marketTerm.PeriodicTerm.text",
}

export const MARKET_TERM_TOOLTIP_KEY: Record<HooksKind, string> = {
  [HooksKind.Unknown]:
    "borrowerMarketDetails.parameters.marketTerm.Unknown.tooltip",
  [HooksKind.OpenTerm]:
    "borrowerMarketDetails.parameters.marketTerm.OpenTerm.tooltip",
  [HooksKind.FixedTerm]:
    "borrowerMarketDetails.parameters.marketTerm.FixedTerm.tooltip",
  [HooksKind.PeriodicTerm]:
    "borrowerMarketDetails.parameters.marketTerm.PeriodicTerm.tooltip",
}

export type AccessMode = "open" | "restricted"
export type TransferAccessMode = AccessMode | "disabled"
export type TernaryFlag = "yes" | "no" | "na"
export type PeriodicWindowStatus = "open" | "scheduled" | "closed"
export type PeriodicWindowStartLabel = "currentWindowStart" | "nextWindowStart"
export type TempReserveRatioViewer = "borrower" | "lender"

export const DEPOSIT_ACCESS_TEXT_KEY: Record<AccessMode, string> = {
  open: "borrowerMarketDetails.parameters.depositAccess.open.text",
  restricted: "borrowerMarketDetails.parameters.depositAccess.restricted.text",
}

export const DEPOSIT_ACCESS_TOOLTIP_KEY: Record<AccessMode, string> = {
  open: "borrowerMarketDetails.parameters.depositAccess.open.tooltip",
  restricted:
    "borrowerMarketDetails.parameters.depositAccess.restricted.tooltip",
}

export const WITHDRAWAL_ACCESS_TEXT_KEY: Record<AccessMode, string> = {
  open: "borrowerMarketDetails.parameters.withdrawalAccess.open.text",
  restricted:
    "borrowerMarketDetails.parameters.withdrawalAccess.restricted.text",
}

export const WITHDRAWAL_ACCESS_TOOLTIP_KEY: Record<AccessMode, string> = {
  open: "borrowerMarketDetails.parameters.withdrawalAccess.open.tooltip",
  restricted:
    "borrowerMarketDetails.parameters.withdrawalAccess.restricted.tooltip",
}

export const TRANSFER_ACCESS_TEXT_KEY: Record<TransferAccessMode, string> = {
  open: "borrowerMarketDetails.parameters.transferAccess.open.text",
  restricted: "borrowerMarketDetails.parameters.transferAccess.restricted.text",
  disabled: "borrowerMarketDetails.parameters.transferAccess.disabled.text",
}

export const TRANSFER_ACCESS_TOOLTIP_KEY: Record<TransferAccessMode, string> = {
  open: "borrowerMarketDetails.parameters.transferAccess.open.tooltip",
  restricted:
    "borrowerMarketDetails.parameters.transferAccess.restricted.tooltip",
  disabled: "borrowerMarketDetails.parameters.transferAccess.disabled.tooltip",
}

export const EARLY_CLOSURE_TEXT_KEY: Record<TernaryFlag, string> = {
  yes: "borrowerMarketDetails.parameters.marketEarlyClosure.yes.text",
  no: "borrowerMarketDetails.parameters.marketEarlyClosure.no.text",
  na: "borrowerMarketDetails.parameters.marketEarlyClosure.na.text",
}

export const EARLY_CLOSURE_TOOLTIP_KEY: Record<TernaryFlag, string> = {
  yes: "borrowerMarketDetails.parameters.marketEarlyClosure.yes.tooltip",
  no: "borrowerMarketDetails.parameters.marketEarlyClosure.no.tooltip",
  na: "borrowerMarketDetails.parameters.marketEarlyClosure.na.tooltip",
}

export const MATURITY_REDUCTION_TEXT_KEY: Record<TernaryFlag, string> = {
  yes: "borrowerMarketDetails.parameters.marketMaturityReduction.yes.text",
  no: "borrowerMarketDetails.parameters.marketMaturityReduction.no.text",
  na: "borrowerMarketDetails.parameters.marketMaturityReduction.na.text",
}

export const MATURITY_REDUCTION_TOOLTIP_KEY: Record<TernaryFlag, string> = {
  yes: "borrowerMarketDetails.parameters.marketMaturityReduction.yes.tooltip",
  no: "borrowerMarketDetails.parameters.marketMaturityReduction.no.tooltip",
  na: "borrowerMarketDetails.parameters.marketMaturityReduction.na.tooltip",
}

export const PERIODIC_WINDOW_STATUS_TEXT_KEY: Record<
  PeriodicWindowStatus,
  string
> = {
  open: "borrowerMarketDetails.parameters.periodicTerm.windowStatus.open.text",
  scheduled:
    "borrowerMarketDetails.parameters.periodicTerm.windowStatus.scheduled.text",
  closed:
    "borrowerMarketDetails.parameters.periodicTerm.windowStatus.closed.text",
}

export const PERIODIC_WINDOW_STATUS_TOOLTIP_KEY: Record<
  PeriodicWindowStatus,
  string
> = {
  open: "borrowerMarketDetails.parameters.periodicTerm.windowStatus.open.tooltip",
  scheduled:
    "borrowerMarketDetails.parameters.periodicTerm.windowStatus.scheduled.tooltip",
  closed:
    "borrowerMarketDetails.parameters.periodicTerm.windowStatus.closed.tooltip",
}

export const PERIODIC_WINDOW_START_KEY: Record<
  PeriodicWindowStartLabel,
  string
> = {
  currentWindowStart:
    "borrowerMarketDetails.parameters.periodicTerm.currentWindowStart",
  nextWindowStart:
    "borrowerMarketDetails.parameters.periodicTerm.nextWindowStart",
}

export const TEMP_RATIO_ACTIVE_TOOLTIP_KEY: Record<
  TempReserveRatioViewer,
  string
> = {
  borrower:
    "borrowerMarketDetails.parameters.tempReserveRatio.borrowerActiveTooltip",
  lender:
    "borrowerMarketDetails.parameters.tempReserveRatio.lenderActiveTooltip",
}

export const TEMP_RATIO_EXPIRED_TOOLTIP_KEY: Record<
  TempReserveRatioViewer,
  string
> = {
  borrower:
    "borrowerMarketDetails.parameters.tempReserveRatio.borrowerExpiredTooltip",
  lender:
    "borrowerMarketDetails.parameters.tempReserveRatio.lenderExpiredTooltip",
}

export const TEMP_RATIO_BANNER_BODY_KEY: Record<
  TempReserveRatioViewer,
  string
> = {
  borrower:
    "borrowerMarketDetails.parameters.tempReserveRatio.borrowerBannerBody",
  lender: "borrowerMarketDetails.parameters.tempReserveRatio.lenderBannerBody",
}

/**
 * Hook flags, in the two columns the parameters panel renders. The key travels
 * with the flag name so neither list can drift from the locale file.
 */
export const HOOK_FLAG_KEYS_PRIMARY = [
  { flag: "useOnDeposit", key: "borrowerMarketDetails.hooks.useOnDeposit" },
  {
    flag: "useOnQueueWithdrawal",
    key: "borrowerMarketDetails.hooks.useOnQueueWithdrawal",
  },
  {
    flag: "useOnExecuteWithdrawal",
    key: "borrowerMarketDetails.hooks.useOnExecuteWithdrawal",
  },
  { flag: "useOnTransfer", key: "borrowerMarketDetails.hooks.useOnTransfer" },
  { flag: "useOnBorrow", key: "borrowerMarketDetails.hooks.useOnBorrow" },
] as const

export const HOOK_FLAG_KEYS_SECONDARY = [
  { flag: "useOnRepay", key: "borrowerMarketDetails.hooks.useOnRepay" },
  {
    flag: "useOnCloseMarket",
    key: "borrowerMarketDetails.hooks.useOnCloseMarket",
  },
  {
    flag: "useOnNukeFromOrbit",
    key: "borrowerMarketDetails.hooks.useOnNukeFromOrbit",
  },
  {
    flag: "useOnSetMaxTotalSupply",
    key: "borrowerMarketDetails.hooks.useOnSetMaxTotalSupply",
  },
  {
    flag: "useOnSetAnnualInterestAndReserveRatioBips",
    key: "borrowerMarketDetails.hooks.useOnSetAnnualInterestAndReserveRatioBips",
  },
  {
    flag: "useOnSetProtocolFeeBips",
    key: "borrowerMarketDetails.hooks.useOnSetProtocolFeeBips",
  },
  {
    flag: "useOnExecutePendingAnnualInterestBipsReduction",
    key: "borrowerMarketDetails.hooks.useOnExecutePendingAnnualInterestBipsReduction",
  },
] as const

/**
 * `ready` is deliberately absent: the call sites render the withdraw button in
 * that state and only reach for an explanation when withdrawal is unavailable.
 * Excluding it from the union keeps the map exhaustive over exactly the states
 * that have wording.
 */
export const WITHDRAWAL_UNAVAILABLE_KEY: Record<
  Exclude<LenderWithdrawalActionState, "ready">,
  string
> = {
  resolving: "lenderMarketDetails.transactions.withdraw.unavailable.resolving",
  "resolution-error":
    "lenderMarketDetails.transactions.withdraw.unavailable.resolution-error",
  "no-balance":
    "lenderMarketDetails.transactions.withdraw.unavailable.no-balance",
  "requires-access":
    "lenderMarketDetails.transactions.withdraw.unavailable.requires-access",
  "fixed-term":
    "lenderMarketDetails.transactions.withdraw.unavailable.fixed-term",
  "withdrawal-window-closed":
    "lenderMarketDetails.transactions.withdraw.unavailable.withdrawal-window-closed",
  "insufficient-balance":
    "lenderMarketDetails.transactions.withdraw.unavailable.insufficient-balance",
  "insufficient-role":
    "lenderMarketDetails.transactions.withdraw.unavailable.insufficient-role",
}

export type EarningsProjectionPeriod = "thirtyDays" | "ninetyDays" | "oneYear"

export const EARNINGS_PROJECTION_PERIOD_KEY: Record<
  EarningsProjectionPeriod,
  string
> = {
  thirtyDays:
    "lenderMarketDetails.transactions.deposit.modal.projection.periods.thirtyDays",
  ninetyDays:
    "lenderMarketDetails.transactions.deposit.modal.projection.periods.ninetyDays",
  oneYear:
    "lenderMarketDetails.transactions.deposit.modal.projection.periods.oneYear",
}

export type PendingAprReductionPhase = "proposed" | "exitNow" | "elapsed"

export const PENDING_APR_REDUCTION_TITLE_KEY: Record<
  PendingAprReductionPhase,
  string
> = {
  proposed: "lenderMarketDetails.pendingAprReduction.proposed.title",
  exitNow: "lenderMarketDetails.pendingAprReduction.exitNow.title",
  elapsed: "lenderMarketDetails.pendingAprReduction.elapsed.title",
}

export const PENDING_APR_REDUCTION_BODY_KEY: Record<
  PendingAprReductionPhase,
  string
> = {
  proposed: "lenderMarketDetails.pendingAprReduction.proposed.body",
  exitNow: "lenderMarketDetails.pendingAprReduction.exitNow.body",
  elapsed: "lenderMarketDetails.pendingAprReduction.elapsed.body",
}
