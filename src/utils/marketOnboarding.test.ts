import { DepositStatus, MarketOnboardingMode } from "@wildcatfi/wildcat-sdk"

import { getLenderMarketAction, LenderMarketAction } from "./marketOnboarding"

describe("marketOnboarding", () => {
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
