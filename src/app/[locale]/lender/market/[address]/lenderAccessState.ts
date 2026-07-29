import { QueueWithdrawalStatus } from "@wildcatfi/wildcat-sdk"

import { LenderStatus } from "./interface"

/**
 * Why the lender market page cannot (or can) offer actions.
 *
 * The point of this enum is to keep "we do not know yet" separate from "we
 * know, and the answer is no". Collapsing the two makes a lender who is
 * perfectly authorized look denied while data is still arriving.
 */
export enum LenderAccessState {
  /** Still resolving. Render a loading state, never a verdict. */
  Resolving = "Resolving",
  /**
   * Cannot be determined right now: no wallet, wrong network, or the
   * authoritative (on-chain) read failed. Distinct from Unauthorized, because
   * the lender may well have access.
   */
  Indeterminate = "Indeterminate",
  /** Authoritatively blocked. */
  Blocked = "Blocked",
  /** Authoritatively holds a role that permits action. */
  Authorized = "Authorized",
  /** Authoritatively holds no such role. */
  Unauthorized = "Unauthorized",
}

export type LenderAccessInputs = {
  /** A MarketAccount object exists (may still be subgraph-only). */
  hasAccount: boolean
  isConnected: boolean
  isWrongNetwork: boolean
  /** Role derived from whatever account data is currently loaded. */
  role: LenderStatus | undefined
  /**
   * True once the account has been reconciled against the on-chain lens.
   *
   * Subgraph-only data is not sufficient to deny access: an unindexed lender
   * (common for a wallet that received market tokens by transfer rather than
   * by depositing) arrives with a zero balance and no credential, which is
   * indistinguishable from having no access.
   */
  isAuthoritative: boolean
  /** Either query is still in flight. */
  isResolving: boolean
  /** The authoritative read errored. */
  hasResolutionError: boolean
}

/**
 * Resolve what the page knows about a lender's access.
 *
 * Order matters: connection and network problems are reported before anything
 * is read, and the authoritative-data check comes before any verdict so that
 * subgraph-only state can never produce Unauthorized.
 */
export function resolveLenderAccess({
  hasAccount,
  isConnected,
  isWrongNetwork,
  role,
  isAuthoritative,
  isResolving,
  hasResolutionError,
}: LenderAccessInputs): LenderAccessState {
  if (!isConnected || isWrongNetwork) return LenderAccessState.Indeterminate
  if (isResolving || !hasAccount) return LenderAccessState.Resolving
  if (hasResolutionError) return LenderAccessState.Indeterminate
  if (!isAuthoritative) return LenderAccessState.Resolving

  if (role === LenderStatus.Blocked) return LenderAccessState.Blocked
  if (
    role === LenderStatus.DepositAndWithdraw ||
    role === LenderStatus.WithdrawOnly
  ) {
    return LenderAccessState.Authorized
  }
  return LenderAccessState.Unauthorized
}

/** Whether the lender may be offered market actions. */
export const canActInMarket = (state: LenderAccessState): boolean =>
  state === LenderAccessState.Authorized

/**
 * Whether the page may route on this state.
 *
 * Anything except Resolving is routable: Indeterminate still means we cannot
 * offer actions, so the status section is the right destination for a
 * disconnected or wrong-network visitor. Routing while Resolving is the bug
 * this module exists to prevent, because it turns a loading state into a
 * refusal the lender cannot get back out of.
 */
export const shouldRouteOnAccess = (state: LenderAccessState): boolean =>
  state !== LenderAccessState.Resolving

/** Why the withdraw control is unavailable, so the UI can say so. */
export enum WithdrawUnavailableReason {
  /** Control should be shown. */
  None = "None",
  Resolving = "Resolving",
  NoBalance = "NoBalance",
  RequiresAccess = "RequiresAccess",
  MarketInClosedTerm = "MarketInClosedTerm",
  WithdrawalWindowClosed = "WithdrawalWindowClosed",
  InsufficientBalance = "InsufficientBalance",
  InsufficientRole = "InsufficientRole",
}

export type WithdrawAvailabilityInputs = {
  accessState: LenderAccessState
  hasMarketBalance: boolean
  withdrawalAvailability: QueueWithdrawalStatus | undefined
}

/**
 * Explain why the withdraw control is hidden.
 *
 * Previously the control was hidden with no reason given, so a lender could
 * not tell "you have nothing to withdraw" from "we have not loaded your
 * position yet" from "you need a credential".
 */
export function resolveWithdrawAvailability({
  accessState,
  hasMarketBalance,
  withdrawalAvailability,
}: WithdrawAvailabilityInputs): WithdrawUnavailableReason {
  if (
    accessState === LenderAccessState.Resolving ||
    accessState === LenderAccessState.Indeterminate ||
    withdrawalAvailability === undefined
  ) {
    return WithdrawUnavailableReason.Resolving
  }

  if (!hasMarketBalance) return WithdrawUnavailableReason.NoBalance

  switch (withdrawalAvailability) {
    case QueueWithdrawalStatus.Ready:
      return WithdrawUnavailableReason.None
    case QueueWithdrawalStatus.RequiresAccess:
      return WithdrawUnavailableReason.RequiresAccess
    case QueueWithdrawalStatus.MarketInClosedTerm:
      return WithdrawUnavailableReason.MarketInClosedTerm
    case QueueWithdrawalStatus.WithdrawalWindowClosed:
      return WithdrawUnavailableReason.WithdrawalWindowClosed
    case QueueWithdrawalStatus.InsufficientBalance:
      return WithdrawUnavailableReason.InsufficientBalance
    case QueueWithdrawalStatus.InsufficientRole:
      return WithdrawUnavailableReason.InsufficientRole
    default:
      return WithdrawUnavailableReason.Resolving
  }
}
