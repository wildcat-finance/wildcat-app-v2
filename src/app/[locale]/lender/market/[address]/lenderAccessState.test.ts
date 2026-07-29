import { QueueWithdrawalStatus } from "@wildcatfi/wildcat-sdk"

import { LenderStatus } from "./interface"
import {
  canActInMarket,
  shouldRouteOnAccess,
  LenderAccessInputs,
  LenderAccessState,
  resolveLenderAccess,
  resolveWithdrawAvailability,
  WithdrawUnavailableReason,
} from "./lenderAccessState"

/** An authorized, fully-reconciled lender. Override per case. */
const base: LenderAccessInputs = {
  hasAccount: true,
  isConnected: true,
  isWrongNetwork: false,
  role: LenderStatus.WithdrawOnly,
  isAuthoritative: true,
  isResolving: false,
  hasResolutionError: false,
}

describe("resolveLenderAccess", () => {
  it("authorizes a withdraw-only lender", () => {
    expect(resolveLenderAccess(base)).toBe(LenderAccessState.Authorized)
  })

  it("authorizes a deposit-and-withdraw lender", () => {
    expect(
      resolveLenderAccess({
        ...base,
        role: LenderStatus.DepositAndWithdraw,
      }),
    ).toBe(LenderAccessState.Authorized)
  })

  it("reports an authoritatively roleless lender as unauthorized", () => {
    expect(resolveLenderAccess({ ...base, role: LenderStatus.Null })).toBe(
      LenderAccessState.Unauthorized,
    )
  })

  it("reports a blocked lender as blocked, not merely unauthorized", () => {
    expect(resolveLenderAccess({ ...base, role: LenderStatus.Blocked })).toBe(
      LenderAccessState.Blocked,
    )
  })

  // This is the regression the module exists to prevent.
  it("does not deny access when only subgraph data has loaded", () => {
    const subgraphOnly = resolveLenderAccess({
      ...base,
      role: LenderStatus.Null,
      isAuthoritative: false,
    })

    expect(subgraphOnly).toBe(LenderAccessState.Resolving)
    expect(subgraphOnly).not.toBe(LenderAccessState.Unauthorized)
    expect(canActInMarket(subgraphOnly)).toBe(false)
    expect(shouldRouteOnAccess(subgraphOnly)).toBe(false)
  })

  it("treats an in-flight query as resolving rather than unauthorized", () => {
    expect(
      resolveLenderAccess({
        ...base,
        role: undefined,
        isResolving: true,
        isAuthoritative: false,
      }),
    ).toBe(LenderAccessState.Resolving)
  })

  it("treats a missing account as resolving", () => {
    expect(
      resolveLenderAccess({
        ...base,
        hasAccount: false,
        role: undefined,
        isAuthoritative: false,
      }),
    ).toBe(LenderAccessState.Resolving)
  })

  it("reports a failed authoritative read as indeterminate", () => {
    expect(
      resolveLenderAccess({
        ...base,
        role: LenderStatus.Null,
        hasResolutionError: true,
      }),
    ).toBe(LenderAccessState.Indeterminate)
  })

  it("reports a disconnected wallet as indeterminate", () => {
    expect(resolveLenderAccess({ ...base, isConnected: false })).toBe(
      LenderAccessState.Indeterminate,
    )
  })

  it("reports the wrong network as indeterminate, not unauthorized", () => {
    expect(
      resolveLenderAccess({
        ...base,
        isWrongNetwork: true,
        role: LenderStatus.Null,
      }),
    ).toBe(LenderAccessState.Indeterminate)
  })

  it("prefers a connection problem over a stale role verdict", () => {
    expect(
      resolveLenderAccess({
        ...base,
        isConnected: false,
        role: LenderStatus.WithdrawOnly,
      }),
    ).toBe(LenderAccessState.Indeterminate)
  })

  it("never authorizes without authoritative data, whatever the role says", () => {
    const roles = [
      LenderStatus.DepositAndWithdraw,
      LenderStatus.WithdrawOnly,
      LenderStatus.Blocked,
      LenderStatus.Null,
      undefined,
    ]

    roles.forEach((role) => {
      expect(
        canActInMarket(
          resolveLenderAccess({ ...base, role, isAuthoritative: false }),
        ),
      ).toBe(false)
    })
  })
})

describe("canActInMarket", () => {
  it("permits action only when authorized", () => {
    expect(canActInMarket(LenderAccessState.Authorized)).toBe(true)

    const denied = [
      LenderAccessState.Resolving,
      LenderAccessState.Indeterminate,
      LenderAccessState.Blocked,
      LenderAccessState.Unauthorized,
    ]
    denied.forEach((state) => expect(canActInMarket(state)).toBe(false))
  })
})

describe("shouldRouteOnAccess", () => {
  it("blocks routing only while resolving", () => {
    expect(shouldRouteOnAccess(LenderAccessState.Resolving)).toBe(false)
  })

  it("permits routing for every settled or indeterminate state", () => {
    const routable = [
      LenderAccessState.Authorized,
      LenderAccessState.Unauthorized,
      LenderAccessState.Blocked,
      // A disconnected or wrong-network visitor cannot act either way, so the
      // status section remains the correct destination for them.
      LenderAccessState.Indeterminate,
    ]
    routable.forEach((state) => expect(shouldRouteOnAccess(state)).toBe(true))
  })
})

describe("resolveWithdrawAvailability", () => {
  it("shows the control for a funded, ready lender", () => {
    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Authorized,
        hasMarketBalance: true,
        withdrawalAvailability: QueueWithdrawalStatus.Ready,
      }),
    ).toBe(WithdrawUnavailableReason.None)
  })

  it("distinguishes an empty position from a missing credential", () => {
    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Authorized,
        hasMarketBalance: false,
        withdrawalAvailability: QueueWithdrawalStatus.Ready,
      }),
    ).toBe(WithdrawUnavailableReason.NoBalance)

    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Unauthorized,
        hasMarketBalance: true,
        withdrawalAvailability: QueueWithdrawalStatus.RequiresAccess,
      }),
    ).toBe(WithdrawUnavailableReason.RequiresAccess)
  })

  it("reports a fixed term and a closed window separately", () => {
    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Authorized,
        hasMarketBalance: true,
        withdrawalAvailability: QueueWithdrawalStatus.MarketInClosedTerm,
      }),
    ).toBe(WithdrawUnavailableReason.MarketInClosedTerm)

    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Authorized,
        hasMarketBalance: true,
        withdrawalAvailability: QueueWithdrawalStatus.WithdrawalWindowClosed,
      }),
    ).toBe(WithdrawUnavailableReason.WithdrawalWindowClosed)
  })

  it("reports resolving while access is unsettled, not a false reason", () => {
    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Resolving,
        hasMarketBalance: false,
        withdrawalAvailability: QueueWithdrawalStatus.RequiresAccess,
      }),
    ).toBe(WithdrawUnavailableReason.Resolving)

    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Indeterminate,
        hasMarketBalance: true,
        withdrawalAvailability: QueueWithdrawalStatus.RequiresAccess,
      }),
    ).toBe(WithdrawUnavailableReason.Resolving)
  })

  it("reports resolving when availability is not yet known", () => {
    expect(
      resolveWithdrawAvailability({
        accessState: LenderAccessState.Authorized,
        hasMarketBalance: true,
        withdrawalAvailability: undefined,
      }),
    ).toBe(WithdrawUnavailableReason.Resolving)
  })
})
