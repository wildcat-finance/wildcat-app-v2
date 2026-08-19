import { QueueWithdrawalStatus } from "@wildcatfi/wildcat-sdk"

import { LenderStatus } from "./interface"
import {
  getLenderBannerState,
  getLenderSurfaceState,
  resolveLenderActionState,
  resolveLenderAccessState,
  resolveLenderWithdrawalActionState,
  shouldShowLenderTransactions,
  shouldShowLenderRequestBanner,
} from "./utils"

describe("getLenderBannerState", () => {
  const base = {
    isWalletHydrated: true,
    isConnected: true,
    isConnecting: false,
    isReconnecting: false,
    isDifferentChain: false,
    accessState: "authorized" as const,
    hasLenderTransactions: true,
    isWithdrawalActivityLoading: false,
  }

  it.each([
    {
      state: "wallet state is hydrating",
      input: { isWalletHydrated: false, isConnected: false },
      expected: "none",
    },
    {
      state: "wallet connection is starting",
      input: { isConnected: false, isConnecting: true },
      expected: "none",
    },
    {
      state: "wallet connection is being restored",
      input: { isConnected: false, isReconnecting: true },
      expected: "none",
    },
    {
      state: "wallet is disconnected",
      input: { isConnected: false },
      expected: "connect",
    },
    {
      state: "lender access is resolving",
      input: { accessState: "resolving" as const },
      expected: "none",
    },
    {
      state: "lender access failed to resolve",
      input: { accessState: "error" as const },
      expected: "authorization-error",
    },
    {
      state: "lender is blocked",
      input: { accessState: "blocked" as const },
      expected: "blocked",
    },
    {
      state: "lender is confirmed unauthorized",
      input: {
        accessState: "unauthorized" as const,
        hasLenderTransactions: false,
      },
      expected: "request-access",
    },
    {
      state: "lender is authorized",
      input: {},
      expected: "none",
    },
  ])("$state", ({ input, expected }) => {
    expect(getLenderBannerState({ ...base, ...input })).toBe(expected)
  })
})

describe("resolveLenderAccessState", () => {
  it.each([
    {
      state: "authoritative read is idle",
      authoritativeStatus: "idle" as const,
      role: LenderStatus.DepositAndWithdraw,
      expected: "resolving",
    },
    {
      state: "authoritative read is pending",
      authoritativeStatus: "resolving" as const,
      role: LenderStatus.DepositAndWithdraw,
      expected: "resolving",
    },
    {
      state: "authoritative read failed",
      authoritativeStatus: "error" as const,
      role: LenderStatus.DepositAndWithdraw,
      expected: "error",
    },
    {
      state: "deposit and withdraw access is confirmed",
      authoritativeStatus: "resolved" as const,
      role: LenderStatus.DepositAndWithdraw,
      expected: "authorized",
    },
    {
      state: "withdraw-only access is confirmed",
      authoritativeStatus: "resolved" as const,
      role: LenderStatus.WithdrawOnly,
      expected: "authorized",
    },
    {
      state: "blocked access is confirmed",
      authoritativeStatus: "resolved" as const,
      role: LenderStatus.Blocked,
      expected: "blocked",
    },
    {
      state: "no access is confirmed",
      authoritativeStatus: "resolved" as const,
      role: LenderStatus.Null,
      expected: "unauthorized",
    },
    {
      state: "a missing role is confirmed",
      authoritativeStatus: "resolved" as const,
      role: undefined,
      expected: "unauthorized",
    },
  ])("$state", ({ authoritativeStatus, role, expected }) => {
    expect(resolveLenderAccessState({ authoritativeStatus, role })).toBe(
      expected,
    )
  })
})

describe("getLenderSurfaceState", () => {
  it.each([
    {
      state: "disconnected",
      isConnected: false,
      isDifferentChain: false,
      accessState: "authorized" as const,
      expected: "connect",
    },
    {
      state: "wrong network",
      isConnected: true,
      isDifferentChain: true,
      accessState: "authorized" as const,
      expected: "switch-network",
    },
    {
      state: "authorization resolving",
      isConnected: true,
      isDifferentChain: false,
      accessState: "resolving" as const,
      expected: "authorization-loading",
    },
    {
      state: "authorization failed",
      isConnected: true,
      isDifferentChain: false,
      accessState: "error" as const,
      expected: "authorization-error",
    },
    {
      state: "lender is blocked",
      isConnected: true,
      isDifferentChain: false,
      accessState: "blocked" as const,
      expected: "blocked",
    },
    {
      state: "lender is unauthorized",
      isConnected: true,
      isDifferentChain: false,
      accessState: "unauthorized" as const,
      expected: "request-access",
    },
    {
      state: "lender is authorized",
      isConnected: true,
      isDifferentChain: false,
      accessState: "authorized" as const,
      expected: "actions",
    },
  ])("$state", ({ isConnected, isDifferentChain, accessState, expected }) => {
    expect(
      getLenderSurfaceState({
        isConnected,
        isDifferentChain,
        accessState,
      }),
    ).toBe(expected)
  })
})

describe("shouldShowLenderRequestBanner", () => {
  it.each([
    {
      state: "disconnected",
      isConnected: false,
      isDifferentChain: false,
      accessState: "unauthorized" as const,
      hasLenderTransactions: false,
      isWithdrawalActivityLoading: false,
      expected: false,
    },
    {
      state: "connected and unauthorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      accessState: "unauthorized" as const,
      hasLenderTransactions: false,
      isWithdrawalActivityLoading: false,
      expected: true,
    },
    {
      state: "connected and unauthorized while withdrawals are loading",
      isConnected: true,
      isDifferentChain: false,
      accessState: "unauthorized" as const,
      hasLenderTransactions: false,
      isWithdrawalActivityLoading: true,
      expected: false,
    },
    {
      state: "connected and authorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      accessState: "authorized" as const,
      hasLenderTransactions: true,
      isWithdrawalActivityLoading: false,
      expected: false,
    },
    {
      state: "connected with a chain mismatch",
      isConnected: true,
      isDifferentChain: true,
      accessState: "unauthorized" as const,
      hasLenderTransactions: false,
      isWithdrawalActivityLoading: false,
      expected: false,
    },
    {
      state: "connected while authorization is unresolved",
      isConnected: true,
      isDifferentChain: false,
      accessState: "resolving" as const,
      hasLenderTransactions: false,
      isWithdrawalActivityLoading: true,
      expected: false,
    },
    {
      state: "connected after the authoritative read failed",
      isConnected: true,
      isDifferentChain: false,
      accessState: "error" as const,
      hasLenderTransactions: false,
      isWithdrawalActivityLoading: false,
      expected: false,
    },
    {
      state: "connected with confirmed blocked access",
      isConnected: true,
      isDifferentChain: false,
      accessState: "blocked" as const,
      hasLenderTransactions: true,
      isWithdrawalActivityLoading: false,
      expected: false,
    },
    {
      state: "unauthorized lender with an existing position",
      isConnected: true,
      isDifferentChain: false,
      accessState: "unauthorized" as const,
      hasLenderTransactions: true,
      isWithdrawalActivityLoading: false,
      expected: false,
    },
  ])(
    "$state",
    ({
      isConnected,
      isDifferentChain,
      accessState,
      hasLenderTransactions,
      isWithdrawalActivityLoading,
      expected,
    }) => {
      expect(
        shouldShowLenderRequestBanner({
          isConnected,
          isDifferentChain,
          accessState,
          hasLenderTransactions,
          isWithdrawalActivityLoading,
        }),
      ).toBe(expected)
    },
  )
})

describe("lender market action state matrix", () => {
  const base = {
    isConnected: true,
    isDifferentChain: false,
    accessState: "authorized" as const,
    depositAvailable: true,
    touGateState: "unblocked" as const,
    isAgreementFetching: false,
    depositAgreementState: "satisfied" as const,
    withdrawalAvailable: true,
    claimAvailable: true,
  }

  it.each([
    {
      state: "disconnected",
      input: { isConnected: false },
      expected: {
        surface: "connect",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: false,
      },
    },
    {
      state: "wrong network",
      input: { isDifferentChain: true },
      expected: {
        surface: "switch-network",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: false,
      },
    },
    {
      state: "authorization loading",
      input: { accessState: "resolving" as const },
      expected: {
        surface: "authorization-loading",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: true,
      },
    },
    {
      state: "authorization error",
      input: { accessState: "error" as const },
      expected: {
        surface: "authorization-error",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: true,
      },
    },
    {
      state: "blocked",
      input: { accessState: "blocked" as const },
      expected: {
        surface: "blocked",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: true,
      },
    },
    {
      state: "unauthorized",
      input: { accessState: "unauthorized" as const },
      expected: {
        surface: "request-access",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: true,
      },
    },
    {
      state: "deposit unavailable while exits remain",
      input: { depositAvailable: false },
      expected: {
        surface: "actions",
        deposit: "unavailable",
        canWithdraw: true,
        canClaim: true,
      },
    },
    {
      state: "ToU blocked while exits remain",
      input: { touGateState: "blocked" as const },
      expected: {
        surface: "actions",
        deposit: "tou-blocked",
        canWithdraw: true,
        canClaim: true,
      },
    },
    {
      state: "ToU loading while exits remain",
      input: {
        touGateState: "unknown" as const,
        isAgreementFetching: true,
      },
      expected: {
        surface: "actions",
        deposit: "checking-tou",
        canWithdraw: true,
        canClaim: true,
      },
    },
    {
      state: "ToU retry while exits remain",
      input: { touGateState: "unknown" as const },
      expected: {
        surface: "actions",
        deposit: "retry-tou",
        canWithdraw: true,
        canClaim: true,
      },
    },
    {
      state: "MLA signature required while exits remain",
      input: {
        depositAgreementState: "requires-mla-signature" as const,
      },
      expected: {
        surface: "actions",
        deposit: "requires-mla-signature",
        canWithdraw: true,
        canClaim: true,
      },
    },
    {
      state: "non-MLA acknowledgement required while exits remain",
      input: {
        depositAgreementState: "requires-non-mla-acknowledgement" as const,
      },
      expected: {
        surface: "actions",
        deposit: "requires-non-mla-acknowledgement",
        canWithdraw: true,
        canClaim: true,
      },
    },
    {
      state: "periodic withdrawal window closed",
      input: { withdrawalAvailable: false },
      expected: {
        surface: "actions",
        deposit: "satisfied",
        canWithdraw: false,
        canClaim: true,
      },
    },
    {
      state: "all actions ready",
      input: {},
      expected: {
        surface: "actions",
        deposit: "satisfied",
        canWithdraw: true,
        canClaim: true,
      },
    },
  ])("$state", ({ input, expected }) => {
    expect(resolveLenderActionState({ ...base, ...input })).toEqual(expected)
  })
})

describe("lender queue-withdrawal action state", () => {
  const base = {
    accessState: "authorized" as const,
    hasMarketAccount: true,
    hasMarketBalance: true,
    withdrawalAvailability: QueueWithdrawalStatus.Ready,
    periodicWindowClosed: false,
  }

  it.each([
    {
      state: "access is still resolving",
      input: { accessState: "resolving" as const },
      expected: "resolving",
    },
    {
      state: "access resolution failed",
      input: { accessState: "error" as const },
      expected: "resolution-error",
    },
    {
      state: "market account is not available",
      input: { hasMarketAccount: false },
      expected: "resolving",
    },
    {
      state: "lender has no market-token balance",
      input: { hasMarketBalance: false },
      expected: "no-balance",
    },
    {
      state: "periodic withdrawal window is closed",
      input: { periodicWindowClosed: true },
      expected: "withdrawal-window-closed",
    },
    {
      state: "credential is required",
      input: {
        withdrawalAvailability: QueueWithdrawalStatus.RequiresAccess,
      },
      expected: "requires-access",
    },
    {
      state: "fixed term has not ended",
      input: {
        withdrawalAvailability: QueueWithdrawalStatus.MarketInClosedTerm,
      },
      expected: "fixed-term",
    },
    {
      state: "SDK reports a closed periodic window",
      input: {
        withdrawalAvailability: QueueWithdrawalStatus.WithdrawalWindowClosed,
      },
      expected: "withdrawal-window-closed",
    },
    {
      state: "balance is insufficient",
      input: {
        withdrawalAvailability: QueueWithdrawalStatus.InsufficientBalance,
      },
      expected: "insufficient-balance",
    },
    {
      state: "role is insufficient",
      input: {
        withdrawalAvailability: QueueWithdrawalStatus.InsufficientRole,
      },
      expected: "insufficient-role",
    },
    {
      state: "indexed availability is ready but live access is unauthorized",
      input: {
        accessState: "unauthorized" as const,
      },
      expected: "insufficient-role",
    },
    {
      state: "withdrawal is ready",
      input: {},
      expected: "ready",
    },
  ])("$state", ({ input, expected }) => {
    expect(resolveLenderWithdrawalActionState({ ...base, ...input })).toBe(
      expected,
    )
  })

  it("changes from unavailable to ready when a periodic window opens", () => {
    expect(
      resolveLenderWithdrawalActionState({
        ...base,
        periodicWindowClosed: true,
      }),
    ).toBe("withdrawal-window-closed")

    expect(
      resolveLenderWithdrawalActionState({
        ...base,
        periodicWindowClosed: false,
      }),
    ).toBe("ready")
  })
})

describe("shouldShowLenderTransactions", () => {
  it.each([
    {
      state: "authorized lender without a current position",
      accessState: "authorized" as const,
      hasMarketPosition: false,
      hasWithdrawalActivity: false,
      expected: true,
    },
    {
      state: "unauthorized wallet holding market tokens",
      accessState: "unauthorized" as const,
      hasMarketPosition: true,
      hasWithdrawalActivity: false,
      expected: true,
    },
    {
      state: "blocked wallet with an existing withdrawal",
      accessState: "blocked" as const,
      hasMarketPosition: false,
      hasWithdrawalActivity: true,
      expected: true,
    },
    {
      state: "account resolution pending with a claimable withdrawal",
      accessState: "resolving" as const,
      hasMarketPosition: false,
      hasWithdrawalActivity: true,
      expected: true,
    },
    {
      state: "account resolution failed with a claimable withdrawal",
      accessState: "error" as const,
      hasMarketPosition: false,
      hasWithdrawalActivity: true,
      expected: true,
    },
    {
      state: "unauthorized wallet without a position or withdrawal",
      accessState: "unauthorized" as const,
      hasMarketPosition: false,
      hasWithdrawalActivity: false,
      expected: false,
    },
  ])(
    "$state",
    ({ accessState, hasMarketPosition, hasWithdrawalActivity, expected }) => {
      expect(
        shouldShowLenderTransactions({
          accessState,
          hasMarketPosition,
          hasWithdrawalActivity,
        }),
      ).toBe(expected)
    },
  )
})
