/// Pure ToU acceptance-state machine, shared by server routes and client hooks.
/// No prisma / wagmi imports allowed here.

export type ToUAcceptanceState =
  /// Accepted the current version. Acceptance is final for this version.
  | "signedCurrent"
  /// Accepted an older version; no re-acceptance campaign is active
  /// (reacceptanceDeadline is NULL) so nothing is enforced yet.
  | "stale"
  /// Accepted an older version; campaign active and the deadline is in the
  /// future - show the dismissible re-acceptance prompt.
  | "staleWithinGrace"
  /// Accepted an older version and the deadline has passed - blocking prompt,
  /// restricted actions (no deposits / new markets / borrowing).
  | "staleExpired"
  /// Never accepted any version - the existing hard gate (/agreement) applies.
  | "neverSigned"
  /// Signed a refusal of the current version and has not accepted it since.
  | "declined"

/// States in which deposits (lender) and create-market / borrow (borrower)
/// are blocked. Withdrawals are never blocked.
export const TOU_BLOCKED_STATES: ToUAcceptanceState[] = [
  "staleExpired",
  "declined",
]

export const isToUBlockedState = (
  state: ToUAcceptanceState | undefined,
): boolean => !!state && TOU_BLOCKED_STATES.includes(state)

export type ToUGateState = "blocked" | "unblocked" | "unknown"

export function computeToUGateState({
  queryEnabled,
  querySucceeded,
  state,
}: {
  queryEnabled: boolean
  querySucceeded: boolean
  state: ToUAcceptanceState | undefined
}): ToUGateState {
  if (!queryEnabled) return "unblocked"
  if (!querySucceeded || !state) return "unknown"
  return isToUBlockedState(state) ? "blocked" : "unblocked"
}

export function applyToUDeadlineBoundary(
  state: ToUAcceptanceState | undefined,
  reacceptanceDeadline: Date | null,
  now: Date,
): ToUAcceptanceState | undefined {
  if (
    state === "staleWithinGrace" &&
    reacceptanceDeadline &&
    now.getTime() >= reacceptanceDeadline.getTime()
  ) {
    return "staleExpired"
  }
  return state
}

export type ComputeToUStateInput = {
  /// Latest acceptance of the current version (any party).
  acceptedCurrentAt: Date | null
  /// Account has an acceptance of any version (any party).
  hasAnyAcceptance: boolean
  /// Latest refusal of the current version (any party).
  declinedCurrentAt: Date | null
  /// The current version's re-acceptance deadline; null = no campaign.
  reacceptanceDeadline: Date | null
  /// Injected for testability; callers pass new Date().
  now: Date
}

export function computeToUAcceptanceState({
  acceptedCurrentAt,
  hasAnyAcceptance,
  declinedCurrentAt,
  reacceptanceDeadline,
  now,
}: ComputeToUStateInput): ToUAcceptanceState {
  if (acceptedCurrentAt) return "signedCurrent"
  if (declinedCurrentAt) return "declined"
  if (!hasAnyAcceptance) return "neverSigned"
  if (!reacceptanceDeadline) return "stale"
  return now.getTime() < reacceptanceDeadline.getTime()
    ? "staleWithinGrace"
    : "staleExpired"
}
