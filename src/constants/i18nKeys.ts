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
  [HooksKind.Unknown]: "marketParameters.policyType.Unknown",
  [HooksKind.OpenTerm]: "marketParameters.policyType.OpenTerm",
  [HooksKind.FixedTerm]: "marketParameters.policyType.FixedTerm",
  [HooksKind.PeriodicTerm]: "marketParameters.policyType.PeriodicTerm",
}

export const MARKET_TYPE_CHIP_KEY: Record<HooksKind, string> = {
  [HooksKind.Unknown]: "marketParameters.marketTypeChip.Unknown",
  [HooksKind.OpenTerm]: "marketParameters.marketTypeChip.OpenTerm",
  [HooksKind.FixedTerm]: "marketParameters.marketTypeChip.FixedTerm",
  [HooksKind.PeriodicTerm]: "marketParameters.marketTypeChip.PeriodicTerm",
}

export const MARKET_TERM_TEXT_KEY: Record<HooksKind, string> = {
  [HooksKind.Unknown]: "marketParameters.marketTerm.Unknown.text",
  [HooksKind.OpenTerm]: "marketParameters.marketTerm.OpenTerm.text",
  [HooksKind.FixedTerm]: "marketParameters.marketTerm.FixedTerm.text",
  [HooksKind.PeriodicTerm]: "marketParameters.marketTerm.PeriodicTerm.text",
}

export const MARKET_TERM_TOOLTIP_KEY: Record<HooksKind, string> = {
  [HooksKind.Unknown]: "marketParameters.marketTerm.Unknown.tooltip",
  [HooksKind.OpenTerm]: "marketParameters.marketTerm.OpenTerm.tooltip",
  [HooksKind.FixedTerm]: "marketParameters.marketTerm.FixedTerm.tooltip",
  [HooksKind.PeriodicTerm]: "marketParameters.marketTerm.PeriodicTerm.tooltip",
}

export type AccessMode = "open" | "restricted"
export type TransferAccessMode = AccessMode | "disabled"
export type TernaryFlag = "yes" | "no" | "na"
export type PeriodicWindowStatus = "open" | "scheduled" | "closed"
export type PeriodicWindowStartLabel = "currentWindowStart" | "nextWindowStart"
export type TempReserveRatioViewer = "borrower" | "lender"

export const DEPOSIT_ACCESS_TEXT_KEY: Record<AccessMode, string> = {
  open: "marketParameters.depositAccess.open.text",
  restricted: "common.labels.restricted",
}

export const DEPOSIT_ACCESS_TOOLTIP_KEY: Record<AccessMode, string> = {
  open: "marketParameters.depositAccess.open.tooltip",
  restricted: "marketParameters.depositAccess.restricted.tooltip",
}

export const WITHDRAWAL_ACCESS_TEXT_KEY: Record<AccessMode, string> = {
  open: "marketParameters.withdrawalAccess.open.text",
  restricted: "common.labels.restricted",
}

export const WITHDRAWAL_ACCESS_TOOLTIP_KEY: Record<AccessMode, string> = {
  open: "marketParameters.withdrawalAccess.open.tooltip",
  restricted: "marketParameters.withdrawalAccess.restricted.tooltip",
}

export const TRANSFER_ACCESS_TEXT_KEY: Record<TransferAccessMode, string> = {
  open: "marketParameters.transferAccess.open.text",
  restricted: "common.labels.restricted",
  disabled: "marketParameters.transferAccess.disabled.text",
}

export const TRANSFER_ACCESS_TOOLTIP_KEY: Record<TransferAccessMode, string> = {
  open: "marketParameters.transferAccess.open.tooltip",
  restricted: "marketParameters.transferAccess.restricted.tooltip",
  disabled: "marketParameters.transferAccess.disabled.tooltip",
}

export const EARLY_CLOSURE_TEXT_KEY: Record<TernaryFlag, string> = {
  yes: "common.yesNo.yes",
  no: "common.yesNo.no",
  na: "common.yesNo.na",
}

export const EARLY_CLOSURE_TOOLTIP_KEY: Record<TernaryFlag, string> = {
  yes: "marketParameters.marketEarlyClosure.yes.tooltip",
  no: "marketParameters.marketEarlyClosure.no.tooltip",
  na: "marketParameters.fixedTermOnlyTooltip",
}

export const MATURITY_REDUCTION_TEXT_KEY: Record<TernaryFlag, string> = {
  yes: "common.yesNo.yes",
  no: "common.yesNo.no",
  na: "common.yesNo.na",
}

export const MATURITY_REDUCTION_TOOLTIP_KEY: Record<TernaryFlag, string> = {
  yes: "marketParameters.marketMaturityReduction.yes.tooltip",
  no: "marketParameters.marketMaturityReduction.no.tooltip",
  na: "marketParameters.fixedTermOnlyTooltip",
}

export const PERIODIC_WINDOW_STATUS_TEXT_KEY: Record<
  PeriodicWindowStatus,
  string
> = {
  open: "marketParameters.periodicTerm.windowStatus.open.text",
  scheduled: "marketParameters.periodicTerm.windowStatus.scheduled.text",
  closed: "marketParameters.periodicTerm.windowStatus.closed.text",
}

export const PERIODIC_WINDOW_STATUS_TOOLTIP_KEY: Record<
  PeriodicWindowStatus,
  string
> = {
  open: "marketParameters.periodicTerm.windowStatus.open.tooltip",
  scheduled: "marketParameters.periodicTerm.windowStatus.scheduled.tooltip",
  closed: "marketParameters.periodicTerm.windowStatus.closed.tooltip",
}

export const PERIODIC_WINDOW_START_KEY: Record<
  PeriodicWindowStartLabel,
  string
> = {
  currentWindowStart: "marketParameters.periodicTerm.currentWindowStart",
  nextWindowStart: "marketParameters.periodicTerm.nextWindowStart",
}

export const TEMP_RATIO_ACTIVE_TOOLTIP_KEY: Record<
  TempReserveRatioViewer,
  string
> = {
  borrower: "marketParameters.tempReserveRatio.borrowerActiveTooltip",
  lender: "marketParameters.tempReserveRatio.lenderActiveTooltip",
}

export const TEMP_RATIO_EXPIRED_TOOLTIP_KEY: Record<
  TempReserveRatioViewer,
  string
> = {
  borrower: "marketParameters.tempReserveRatio.borrowerExpiredTooltip",
  lender: "marketParameters.tempReserveRatio.lenderExpiredTooltip",
}

export const TEMP_RATIO_BANNER_BODY_KEY: Record<
  TempReserveRatioViewer,
  string
> = {
  borrower: "marketParameters.tempReserveRatio.borrowerBannerBody",
  lender: "marketParameters.tempReserveRatio.lenderBannerBody",
}

/**
 * Hook flags, in the two columns the parameters panel renders. The key travels
 * with the flag name so neither list can drift from the locale file.
 */
export const HOOK_FLAG_KEYS_PRIMARY = [
  { flag: "useOnDeposit", key: "marketParameters.hooks.useOnDeposit" },
  {
    flag: "useOnQueueWithdrawal",
    key: "marketParameters.hooks.useOnQueueWithdrawal",
  },
  {
    flag: "useOnExecuteWithdrawal",
    key: "marketParameters.hooks.useOnExecuteWithdrawal",
  },
  { flag: "useOnTransfer", key: "marketParameters.hooks.useOnTransfer" },
  { flag: "useOnBorrow", key: "marketParameters.hooks.useOnBorrow" },
] as const

export const HOOK_FLAG_KEYS_SECONDARY = [
  { flag: "useOnRepay", key: "marketParameters.hooks.useOnRepay" },
  {
    flag: "useOnCloseMarket",
    key: "marketParameters.hooks.useOnCloseMarket",
  },
  {
    flag: "useOnNukeFromOrbit",
    key: "marketParameters.hooks.useOnNukeFromOrbit",
  },
  {
    flag: "useOnSetMaxTotalSupply",
    key: "marketParameters.hooks.useOnSetMaxTotalSupply",
  },
  {
    flag: "useOnSetAnnualInterestAndReserveRatioBips",
    key: "marketParameters.hooks.useOnSetAnnualInterestAndReserveRatioBips",
  },
  {
    flag: "useOnSetProtocolFeeBips",
    key: "marketParameters.hooks.useOnSetProtocolFeeBips",
  },
  {
    flag: "useOnExecutePendingAnnualInterestBipsReduction",
    key: "marketParameters.hooks.useOnExecutePendingAnnualInterestBipsReduction",
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
  resolving: "marketDetails.lender.transactions.withdraw.unavailable.resolving",
  "resolution-error":
    "marketDetails.lender.transactions.withdraw.unavailable.resolution-error",
  "no-balance":
    "marketDetails.lender.transactions.withdraw.unavailable.no-balance",
  "requires-access":
    "marketDetails.lender.transactions.withdraw.unavailable.requires-access",
  "fixed-term":
    "marketDetails.lender.transactions.withdraw.unavailable.fixed-term",
  "withdrawal-window-closed":
    "marketDetails.lender.transactions.withdraw.unavailable.withdrawal-window-closed",
  "insufficient-balance":
    "marketDetails.lender.transactions.withdraw.unavailable.insufficient-balance",
  "insufficient-role":
    "marketDetails.lender.transactions.withdraw.unavailable.insufficient-role",
}

export type EarningsProjectionPeriod = "thirtyDays" | "ninetyDays" | "oneYear"

export const EARNINGS_PROJECTION_PERIOD_KEY: Record<
  EarningsProjectionPeriod,
  string
> = {
  thirtyDays: "marketDetails.lender.modals.deposit.projection.thirtyDays",
  ninetyDays: "marketDetails.lender.modals.deposit.projection.ninetyDays",
  oneYear: "marketDetails.lender.modals.deposit.projection.oneYear",
}

export type PendingAprReductionPhase = "proposed" | "exitNow" | "elapsed"

export const PENDING_APR_REDUCTION_TITLE_KEY: Record<
  PendingAprReductionPhase,
  string
> = {
  proposed: "marketDetails.lender.pendingAprReduction.proposed.title",
  exitNow: "marketDetails.lender.pendingAprReduction.exitNow.title",
  elapsed: "marketDetails.lender.pendingAprReduction.elapsed.title",
}

export const PENDING_APR_REDUCTION_BODY_KEY: Record<
  PendingAprReductionPhase,
  string
> = {
  proposed: "marketDetails.lender.pendingAprReduction.proposed.body",
  exitNow: "marketDetails.lender.pendingAprReduction.exitNow.body",
  elapsed: "marketDetails.lender.pendingAprReduction.elapsed.body",
}
