import {
  resolveLenderActionState,
  shouldShowLenderRequestBanner,
} from "./utils"

describe("shouldShowLenderRequestBanner", () => {
  it.each([
    {
      state: "disconnected",
      isConnected: false,
      isDifferentChain: false,
      authorizedInMarket: false,
      expected: false,
    },
    {
      state: "connected and unauthorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      authorizedInMarket: false,
      expected: true,
    },
    {
      state: "connected and authorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      authorizedInMarket: true,
      expected: false,
    },
    {
      state: "connected with a chain mismatch",
      isConnected: true,
      isDifferentChain: true,
      authorizedInMarket: false,
      expected: false,
    },
    {
      state: "connected while market authorization is unresolved",
      isConnected: true,
      isDifferentChain: false,
      authorizedInMarket: undefined,
      expected: false,
    },
  ])(
    "$state",
    ({ isConnected, isDifferentChain, authorizedInMarket, expected }) => {
      expect(
        shouldShowLenderRequestBanner({
          isConnected,
          isDifferentChain,
          authorizedInMarket,
        }),
      ).toBe(expected)
    },
  )
})

describe("lender market action state matrix", () => {
  const base = {
    isConnected: true,
    isDifferentChain: false,
    authorizedInMarket: true,
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
      input: { authorizedInMarket: undefined },
      expected: {
        surface: "authorization-loading",
        deposit: "hidden",
        canWithdraw: false,
        canClaim: false,
      },
    },
    {
      state: "unauthorized",
      input: { authorizedInMarket: false },
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
