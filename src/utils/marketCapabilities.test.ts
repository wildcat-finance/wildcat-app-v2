import { HooksKind, MarketOnboardingMode } from "@wildcatfi/wildcat-sdk"

import {
  getFixedTermHooksConfig,
  getMarketPolicyAddress,
  hasActivePullRoleProvider,
  isFixedTermMarket,
  isHooksManagedMarket,
  isSelfOnboardMarketAccount,
} from "./marketCapabilities"

describe("marketCapabilities", () => {
  it("classifies self-onboarding from active pull-provider metadata", () => {
    const borrowerPushProvider = {
      isApproved: true,
      isPullProvider: false,
    }
    const removedPullProvider = {
      isApproved: false,
      isPullProvider: true,
    }
    const activePullProvider = {
      isApproved: true,
      isPullProvider: true,
    }

    expect(hasActivePullRoleProvider([borrowerPushProvider])).toBe(false)
    expect(
      hasActivePullRoleProvider([borrowerPushProvider, removedPullProvider]),
    ).toBe(false)
    expect(
      hasActivePullRoleProvider([borrowerPushProvider, activePullProvider]),
    ).toBe(true)
  })

  it("prefers hooks policy addresses when present", () => {
    const market = {
      controller: "0xcontroller",
      hooksConfig: {
        kind: HooksKind.OpenTerm,
        hooksAddress: "0xhooks",
      },
    }

    expect(isHooksManagedMarket(market)).toBe(true)
    expect(getMarketPolicyAddress(market)).toBe("0xhooks")
  })

  it("falls back to controller policy addresses for legacy markets", () => {
    const market = {
      controller: "0xcontroller",
      hooksConfig: undefined,
    }

    expect(isHooksManagedMarket(market)).toBe(false)
    expect(getMarketPolicyAddress(market)).toBe("0xcontroller")
  })

  it("detects fixed-term hooks configs without overloading implementation type", () => {
    const market = {
      controller: undefined,
      hooksConfig: {
        kind: HooksKind.FixedTerm,
        hooksAddress: "0xhooks",
        fixedTermEndTime: 12345,
      },
    }

    expect(isFixedTermMarket(market)).toBe(true)
    expect(getFixedTermHooksConfig(market)).toEqual(market.hooksConfig)
  })

  it("uses stable market policy rather than lender-specific deposit availability", () => {
    const account = {
      market: {
        controller: undefined,
        onboardingMode: MarketOnboardingMode.SelfOnboard,
        hooksConfig: {
          kind: HooksKind.OpenTerm,
          hooksAddress: "0xhooks",
        },
      },
    }

    expect(isSelfOnboardMarketAccount(account)).toBe(true)

    const deniedLender = {
      ...account,
      depositAvailability: "RequiresAccess",
    }
    expect(isSelfOnboardMarketAccount(deniedLender)).toBe(true)
  })

  it("does not treat borrower-approval or unknown markets as self-onboard", () => {
    const account = {
      market: {
        controller: "0xcontroller",
        onboardingMode: MarketOnboardingMode.BorrowerApproval,
        hooksConfig: undefined,
      },
    }

    expect(isSelfOnboardMarketAccount(account)).toBe(false)
    expect(
      isSelfOnboardMarketAccount({
        market: {
          ...account.market,
          onboardingMode: undefined,
        },
      }),
    ).toBe(false)
  })
})
