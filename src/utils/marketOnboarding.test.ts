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
  isSelfServiceMarketOnboardingMode,
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
      MarketOnboardingMode.Managed,
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
    ).toBe(MarketOnboardingMode.Self)

    expect(
      getSubgraphMarketOnboardingMode({
        ...market,
        roleProviders: [
          {
            kind: "access-list",
            isApproved: true,
            isPullProvider: true,
            pullProviderIndex: 0,
          },
        ],
      } as unknown as Market),
    ).toBe(MarketOnboardingMode.Managed)
  })

  it.each([
    {
      label: "open deposits",
      onboardingMode: MarketOnboardingMode.Open,
      expected: LenderOnboardingType.Open,
    },
    {
      label: "lender self-onboarding",
      onboardingMode: MarketOnboardingMode.Self,
      expected: LenderOnboardingType.Self,
    },
    {
      label: "managed access",
      onboardingMode: MarketOnboardingMode.Managed,
      expected: LenderOnboardingType.Managed,
    },
    {
      label: "unresolved onboarding policy",
      onboardingMode: undefined,
      expected: LenderOnboardingType.Unknown,
    },
  ])("labels $label", ({ onboardingMode, expected }) => {
    expect(getLenderOnboardingType(onboardingMode)).toBe(expected)
  })

  it("groups open and self onboarding as self-service", () => {
    expect(isSelfServiceMarketOnboardingMode(MarketOnboardingMode.Open)).toBe(
      true,
    )
    expect(isSelfServiceMarketOnboardingMode(MarketOnboardingMode.Self)).toBe(
      true,
    )
    expect(
      isSelfServiceMarketOnboardingMode(MarketOnboardingMode.Managed),
    ).toBe(false)
  })

  it("shows deposit whenever the lender is currently eligible", () => {
    expect(
      getLenderMarketAction(MarketOnboardingMode.Managed, DepositStatus.Ready),
    ).toBe(LenderMarketAction.Deposit)
  })

  it("routes ineligible borrower-approval lenders to request access", () => {
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.Managed,
        DepositStatus.RequiresAccess,
      ),
    ).toBe(LenderMarketAction.RequestAccess)
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.Managed,
        DepositStatus.InsufficientRole,
      ),
    ).toBe(LenderMarketAction.RequestAccess)
  })

  it("does not misroute blocked, closed, or unknown markets", () => {
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.Managed,
        DepositStatus.Blocked,
      ),
    ).toBe(LenderMarketAction.Unavailable)
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.Self,
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
        MarketOnboardingMode.Self,
        DepositStatus.RequiresAccess,
      ),
    ).toBe(LenderMarketAction.DepositUnavailable)
  })
})
