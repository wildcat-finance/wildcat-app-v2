/// Pure borrower-restriction state machine, shared by server routes and
/// client hooks. No prisma / wagmi imports allowed here. See product#789.
///
/// "Removed" is derived from the archcontroller's isRegisteredBorrower view
/// and persisted once; it is never derived from the subgraph's
/// BorrowerRegistrationChange.isRegistered field, which is wrong for
/// removals (src/lib/registrar.ts documents the subgraph bug).

export type RestrictionOverride = "restricted" | "cleared"

export interface BorrowerRestrictionInputs {
  /// Persisted flag: the sync verified the borrower is gone from the
  /// archcontroller. Set once; cleared only by verified re-registration.
  removedFromArchController: boolean
  /// Manual admin override; takes precedence over the persisted flag.
  restrictionOverride: RestrictionOverride | null
}

export type RestrictionSource = "override" | "removal" | "none"

export interface BorrowerRestrictionState {
  restricted: boolean
  source: RestrictionSource
}

export const OVERRIDE_VALUES: RestrictionOverride[] = ["restricted", "cleared"]

export const isRestrictionOverride = (
  value: unknown,
): value is RestrictionOverride =>
  OVERRIDE_VALUES.includes(value as RestrictionOverride)

/// Precedence: manual override > persisted removal flag > unrestricted.
export function computeBorrowerRestriction({
  removedFromArchController,
  restrictionOverride,
}: BorrowerRestrictionInputs): BorrowerRestrictionState {
  if (restrictionOverride === "restricted") {
    return { restricted: true, source: "override" }
  }
  if (restrictionOverride === "cleared") {
    return { restricted: false, source: "override" }
  }
  if (removedFromArchController) {
    return { restricted: true, source: "removal" }
  }
  return { restricted: false, source: "none" }
}

/// Actions the restriction blocks. Repay and terminate are the carve-out and
/// must never appear here.
export type RestrictedAction =
  | "createMarket"
  | "editProfile"
  | "editMarketDescription"

export const RESTRICTED_ACTIONS: RestrictedAction[] = [
  "createMarket",
  "editProfile",
  "editMarketDescription",
]

export type RestrictionGateState = "blocked" | "unblocked" | "unknown"

/// Client-side gate with fail-closed semantics: a fetch failure keeps the
/// last known state, and a last-known "restricted" is never re-enabled by
/// downtime. With no last-known state and a failed read, the gate reports
/// "unknown" so callers can distinguish "verified fine" from "cannot tell".
export function computeRestrictionGateState({
  queryEnabled,
  querySucceeded,
  state,
  lastKnown,
}: {
  queryEnabled: boolean
  querySucceeded: boolean
  state: BorrowerRestrictionState | undefined
  lastKnown: BorrowerRestrictionState | undefined
}): RestrictionGateState {
  if (!queryEnabled) return "unblocked"
  if (querySucceeded && state) {
    return state.restricted ? "blocked" : "unblocked"
  }
  if (lastKnown) {
    return lastKnown.restricted ? "blocked" : "unblocked"
  }
  return "unknown"
}

/// Persistence transition for the sync route: given the verified onchain
/// registration answer and the stored row, decide what to write. Returns
/// null when nothing changes (idempotent syncs write nothing).
export function computeRemovalTransition({
  isRegisteredOnChain,
  removedFromArchController,
  restrictionOverride,
}: BorrowerRestrictionInputs & { isRegisteredOnChain: boolean }): {
  removedFromArchController: boolean
  notifyRestriction: boolean
} | null {
  if (!isRegisteredOnChain && !removedFromArchController) {
    // Removal observed for the first time: set the flag once, notify.
    return { removedFromArchController: true, notifyRestriction: true }
  }
  if (isRegisteredOnChain && removedFromArchController) {
    // Re-registered: auto-clear unless a manual override is set (the
    // override already wins in computeBorrowerRestriction, but a manual
    // "restricted" should also keep the flag for auditability).
    if (restrictionOverride === "restricted") return null
    return { removedFromArchController: false, notifyRestriction: false }
  }
  return null
}
