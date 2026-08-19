import {
  DepositStatus,
  HooksKind,
  Market,
  MarketOnboardingMode,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

import {
  getLenderOnboardingType,
  getLenderMarketAction,
  getSubgraphMarketOnboardingMode,
  LenderOnboardingType,
  LenderMarketAction,
} from "./marketOnboarding"

describe("marketOnboarding", () => {
  it("uses provider indexes for indexed onboarding policy", () => {
    const market = {
      version: MarketVersion.V2,
      hooksConfig: {
        kind: HooksKind.OpenTerm,
        depositRequiresAccess: true,
        flags: { useOnDeposit: true },
      },
      roleProviders: [
        {
          isApproved: true,
          isPullProvider: true,
          pullProviderIndex: -1,
        },
      ],
    } as unknown as Market

    expect(getSubgraphMarketOnboardingMode(market)).toBe(
      MarketOnboardingMode.BorrowerApproval,
    )
    expect(
      getSubgraphMarketOnboardingMode({
        ...market,
        roleProviders: [
          {
            isApproved: true,
            isPullProvider: true,
            pullProviderIndex: 0,
          },
        ],
      } as unknown as Market),
    ).toBe(MarketOnboardingMode.SelfOnboard)
  })

  it.each([
    {
      label: "lender self-onboarding",
      onboardingMode: MarketOnboardingMode.SelfOnboard,
      expected: LenderOnboardingType.SelfOnboard,
    },
    {
      label: "borrower-operated allowlist",
      onboardingMode: MarketOnboardingMode.BorrowerApproval,
      expected: LenderOnboardingType.BorrowerAllowlist,
    },
    {
      label: "unresolved onboarding policy",
      onboardingMode: undefined,
      expected: LenderOnboardingType.Unknown,
    },
  ])("labels $label", ({ onboardingMode, expected }) => {
    expect(getLenderOnboardingType(onboardingMode)).toBe(expected)
  })

  it("shows deposit whenever the lender is currently eligible", () => {
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.BorrowerApproval,
        DepositStatus.Ready,
      ),
    ).toBe(LenderMarketAction.Deposit)
  })

  it("routes ineligible borrower-approval lenders to request access", () => {
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.BorrowerApproval,
        DepositStatus.RequiresAccess,
      ),
    ).toBe(LenderMarketAction.RequestAccess)
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.BorrowerApproval,
        DepositStatus.InsufficientRole,
      ),
    ).toBe(LenderMarketAction.RequestAccess)
  })

  it("does not misroute blocked, closed, or unknown markets", () => {
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.BorrowerApproval,
        DepositStatus.Blocked,
      ),
    ).toBe(LenderMarketAction.Unavailable)
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.SelfOnboard,
        DepositStatus.MarketClosed,
      ),
    ).toBe(LenderMarketAction.Unavailable)
    expect(getLenderMarketAction(undefined, DepositStatus.RequiresAccess)).toBe(
      LenderMarketAction.Unavailable,
    )
  })

  it("keeps provider-denied self-onboarding deposits visibly unavailable", () => {
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.SelfOnboard,
        DepositStatus.RequiresAccess,
      ),
    ).toBe(LenderMarketAction.DepositUnavailable)
  })
})
