import { CloseMarketStatus, HooksKind } from "@wildcatfi/wildcat-sdk"

import { routeTermination } from "./terminationBlockReason"

const FIXED_TERM = {
  kind: HooksKind.FixedTerm,
  fixedTermEndTime: 1_790_000_000,
  allowTermReduction: false,
}

describe("routeTermination", () => {
  it("terminates directly when ready with zero debt", () => {
    expect(
      routeTermination({
        status: CloseMarketStatus.Ready,
        outstandingDebtIsZero: true,
      }),
    ).toEqual({ flow: "terminate" })
  })

  it("repays then terminates when ready with debt", () => {
    expect(
      routeTermination({
        status: CloseMarketStatus.Ready,
        outstandingDebtIsZero: false,
      }),
    ).toEqual({ flow: "repayAndTerminate" })
  })

  it.each([
    CloseMarketStatus.InsufficientBalance,
    CloseMarketStatus.InsufficientAllowance,
    CloseMarketStatus.UnpaidWithdrawalBatches,
  ])("routes %s to the repay flow", (status) => {
    expect(
      routeTermination({ status, outstandingDebtIsZero: false }).flow,
    ).toBe("repayAndTerminate")
  })

  it("blocks early closure with the maturity and term-reduction details", () => {
    expect(
      routeTermination({
        status: CloseMarketStatus.EarlyClosureNotAllowed,
        outstandingDebtIsZero: true,
        hooksConfig: FIXED_TERM,
      }),
    ).toEqual({
      flow: "blocked",
      block: {
        status: CloseMarketStatus.EarlyClosureNotAllowed,
        fixedTermEndTime: 1_790_000_000,
        allowTermReduction: false,
      },
    })
  })

  it("reports the term-reduction escape hatch when the config allows it", () => {
    const routing = routeTermination({
      status: CloseMarketStatus.EarlyClosureNotAllowed,
      outstandingDebtIsZero: true,
      hooksConfig: { ...FIXED_TERM, allowTermReduction: true },
    })
    expect(routing.block?.allowTermReduction).toBe(true)
  })

  it("blocks early closure even when debt is outstanding", () => {
    expect(
      routeTermination({
        status: CloseMarketStatus.EarlyClosureNotAllowed,
        outstandingDebtIsZero: false,
        hooksConfig: FIXED_TERM,
      }).flow,
    ).toBe("blocked")
  })

  it("leaves fixed-term details empty without a fixed-term config", () => {
    const routing = routeTermination({
      status: CloseMarketStatus.EarlyClosureNotAllowed,
      outstandingDebtIsZero: true,
      hooksConfig: { kind: HooksKind.OpenTerm },
    })
    expect(routing.block).toEqual({
      status: CloseMarketStatus.EarlyClosureNotAllowed,
    })
  })

  it("blocks a non-borrower instead of asking them to repay", () => {
    expect(
      routeTermination({
        status: CloseMarketStatus.NotBorrower,
        outstandingDebtIsZero: true,
      }),
    ).toEqual({
      flow: "blocked",
      block: { status: CloseMarketStatus.NotBorrower },
    })
  })

  it("covers every CloseMarketStatus value", () => {
    Object.values(CloseMarketStatus).forEach((status) => {
      const { flow } = routeTermination({
        status,
        outstandingDebtIsZero: true,
        hooksConfig: FIXED_TERM,
      })
      expect(["terminate", "repayAndTerminate", "blocked"]).toContain(flow)
    })
  })
})
