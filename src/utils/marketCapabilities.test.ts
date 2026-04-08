import { DepositStatus, HooksKind } from "@wildcatfi/wildcat-sdk"

import {
  getFixedTermHooksConfig,
  getMarketPolicyAddress,
  isFixedTermMarket,
  isHooksManagedMarket,
  isSelfOnboardMarketAccount,
} from "./marketCapabilities"

describe("marketCapabilities", () => {
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

  it("classifies self-onboard markets through hooks-managed capability instead of version", () => {
    const account = {
      hasEverInteracted: false,
      depositAvailability: DepositStatus.Ready,
      market: {
        controller: undefined,
        hooksConfig: {
          kind: HooksKind.OpenTerm,
          hooksAddress: "0xhooks",
        },
      },
    }

    expect(isSelfOnboardMarketAccount(account)).toBe(true)
  })

  it("does not treat legacy/controller markets as self-onboard", () => {
    const account = {
      hasEverInteracted: false,
      depositAvailability: DepositStatus.Ready,
      market: {
        controller: "0xcontroller",
        hooksConfig: undefined,
      },
    }

    expect(isSelfOnboardMarketAccount(account)).toBe(false)
  })
})
