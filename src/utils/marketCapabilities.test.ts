import {
  HooksKind,
  Market,
  RoleProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import {
  getEffectiveMarketAccess,
  hasActivePullRoleProvider,
} from "./marketCapabilities"

/**
 * Fixtures are copied verbatim from the Sepolia subgraph. `borrowerFromSubgraph`
 * is the sole provider of policy 0x4b320698991271bb89b2afa1662c12412d7acda6,
 * which was deployed with `existingProviders: []` - a borrower operated
 * allowlist - yet read back as lender self-onboarding on every screen.
 *
 * Note `isPullProvider: true` next to `pullProviderIndex: -1`. The hooks
 * constructor registers the borrower as a push-only provider on every policy;
 * the subgraph's boolean is wrong for that entry, the index is not. Do not
 * "simplify" this fixture to `isPullProvider: false` - that is the assumption
 * that hid the bug.
 */
const borrowerFromSubgraph: RoleProvider = {
  providerAddress: "0x5f55005b15b9e00ec52528fe672eb30f450151f5",
  isPullProvider: true,
  isPushProvider: true,
  isApproved: true,
  pullProviderIndex: -1,
  pushProviderIndex: 0,
  timeToLive: -1,
}

/** The same borrower entry as the on-chain lens reports it: the "no pull slot"
 *  sentinel is the raw max uint24 instead of -1. */
const borrowerFromLens: RoleProvider = {
  ...borrowerFromSubgraph,
  pullProviderIndex: 2 ** 24 - 1,
}

/** OpenAccessRoleProvider on a genuinely self-onboarding policy. */
const openAccessFromSubgraph: RoleProvider = {
  providerAddress: "0x9acde253f7a51456c48604185c0cea4fc9e58e3a",
  isPullProvider: true,
  isPushProvider: false,
  isApproved: true,
  pullProviderIndex: 0,
  pushProviderIndex: 2 ** 24 - 1,
  timeToLive: 7_776_000,
}

const mainnetOpenAccessFromSubgraph: RoleProvider = {
  ...openAccessFromSubgraph,
  providerAddress: "0x5620553d8881335f74ad19259daacd1d9b373101",
}

type HooksConfigOverrides = {
  flags?: Partial<{
    useOnDeposit: boolean
    useOnQueueWithdrawal: boolean
    useOnTransfer: boolean
  }>
  transfersDisabled?: boolean
}

const makeMarket = (
  roleProviders: readonly RoleProvider[],
  overrides: HooksConfigOverrides = {},
) => {
  const { flags, ...configOverrides } = overrides

  return {
    chainId: SupportedChainId.Mainnet,
    hooksConfig: {
      kind: HooksKind.OpenTerm,
      depositRequiresAccess: true,
      queueWithdrawalRequiresAccess: true,
      transferRequiresAccess: true,
      transfersDisabled: false,
      ...configOverrides,
      flags: {
        useOnDeposit: true,
        useOnQueueWithdrawal: true,
        useOnTransfer: true,
        ...flags,
      },
    },
    hooksInstance: { roleProviders },
  } as unknown as Pick<Market, "chainId" | "hooksConfig" | "hooksInstance">
}

describe("hasActivePullRoleProvider", () => {
  it("reports no pull provider for a borrower operated allowlist", () => {
    expect(hasActivePullRoleProvider([borrowerFromSubgraph])).toBe(false)
  })

  it("reads the same policy from lens data identically", () => {
    expect(hasActivePullRoleProvider([borrowerFromLens])).toBe(false)
  })

  it("reports a pull provider for a self-onboarding policy", () => {
    expect(
      hasActivePullRoleProvider([borrowerFromSubgraph, openAccessFromSubgraph]),
    ).toBe(true)
    expect(hasActivePullRoleProvider([openAccessFromSubgraph])).toBe(true)
  })

  it("ignores a revoked pull provider", () => {
    expect(
      hasActivePullRoleProvider([
        borrowerFromSubgraph,
        { ...openAccessFromSubgraph, isApproved: false },
      ]),
    ).toBe(false)
  })

  it("reports no pull provider when a policy has none at all (V1)", () => {
    expect(hasActivePullRoleProvider([])).toBe(false)
  })

  it("does not key on the isPullProvider boolean", () => {
    // Guards the actual regression: on this exact data the boolean claims the
    // borrower entry is a pull provider, which classified every policy as
    // self-onboarding.
    expect(borrowerFromSubgraph.isPullProvider).toBe(true)
    expect(hasActivePullRoleProvider([borrowerFromSubgraph])).toBe(false)
  })

  it("does not key on the number of providers", () => {
    // One provider does not mean manual and two do not mean self-onboarding:
    // whether the borrower entry is enumerated depends on the data source.
    expect(hasActivePullRoleProvider([openAccessFromSubgraph])).toBe(true)
    expect(hasActivePullRoleProvider([borrowerFromSubgraph])).toBe(false)
  })
})

describe("getEffectiveMarketAccess", () => {
  it("reports open access when credential checks use the open provider", () => {
    expect(
      getEffectiveMarketAccess(makeMarket([mainnetOpenAccessFromSubgraph])),
    ).toEqual({
      depositAccess: "open",
      withdrawalAccess: "open",
      transferAccess: "open",
    })
  })

  it("keeps borrower allowlists restricted", () => {
    expect(
      getEffectiveMarketAccess(makeMarket([borrowerFromSubgraph])),
    ).toEqual({
      depositAccess: "restricted",
      withdrawalAccess: "restricted",
      transferAccess: "restricted",
    })
  })

  it("does not treat arbitrary or revoked pull providers as open access", () => {
    expect(
      getEffectiveMarketAccess(makeMarket([openAccessFromSubgraph]))
        .depositAccess,
    ).toBe("restricted")
    expect(
      getEffectiveMarketAccess(
        makeMarket([{ ...mainnetOpenAccessFromSubgraph, isApproved: false }]),
      ).depositAccess,
    ).toBe("restricted")
  })

  it("reports access as open when the relevant checks are disabled", () => {
    expect(
      getEffectiveMarketAccess(
        makeMarket([borrowerFromSubgraph], {
          flags: {
            useOnDeposit: false,
            useOnQueueWithdrawal: false,
            useOnTransfer: false,
          },
        }),
      ),
    ).toEqual({
      depositAccess: "open",
      withdrawalAccess: "open",
      transferAccess: "open",
    })
  })

  it("keeps disabled transfers distinct from restricted transfers", () => {
    expect(
      getEffectiveMarketAccess(
        makeMarket([mainnetOpenAccessFromSubgraph], {
          transfersDisabled: true,
        }),
      ).transferAccess,
    ).toBe("disabled")
  })
})
