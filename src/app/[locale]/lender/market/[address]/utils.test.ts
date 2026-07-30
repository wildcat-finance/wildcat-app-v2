import { LenderStatus } from "./interface"
import {
  getLenderSurfaceState,
  resolveLenderActionState,
  resolveLenderAccessState,
  shouldShowLenderRequestBanner,
} from "./utils"

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
      expected: false,
    },
    {
      state: "connected and unauthorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      accessState: "unauthorized" as const,
      expected: true,
    },
    {
      state: "connected and authorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      accessState: "authorized" as const,
      expected: false,
    },
    {
      state: "connected with a chain mismatch",
      isConnected: true,
      isDifferentChain: true,
      accessState: "unauthorized" as const,
      expected: false,
    },
    {
      state: "connected while authorization is unresolved",
      isConnected: true,
      isDifferentChain: false,
      accessState: "resolving" as const,
      expected: false,
    },
    {
      state: "connected after the authoritative read failed",
      isConnected: true,
      isDifferentChain: false,
      accessState: "error" as const,
      expected: false,
    },
    {
      state: "connected with confirmed blocked access",
      isConnected: true,
      isDifferentChain: false,
      accessState: "blocked" as const,
      expected: false,
    },
  ])("$state", ({ isConnected, isDifferentChain, accessState, expected }) => {
    expect(
      shouldShowLenderRequestBanner({
        isConnected,
        isDifferentChain,
        accessState,
      }),
    ).toBe(expected)
  })
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
        canClaim: false,
      },
    },
    {
      state: "authorization error",
      input: { accessState: "error" as const },
      expected: {
        surface: "authorization-error",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: false,
      },
    },
    {
      state: "blocked",
      input: { accessState: "blocked" as const },
      expected: {
        surface: "blocked",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: false,
      },
    },
    {
      state: "unauthorized",
      input: { accessState: "unauthorized" as const },
      expected: {
        surface: "request-access",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: false,
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
