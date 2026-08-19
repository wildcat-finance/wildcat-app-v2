import {
  computeBorrowerRestriction,
  computeRemovalTransition,
  computeRestrictionGateState,
  isRestrictionOverride,
  RESTRICTED_ACTIONS,
} from "./borrowerRestrictionState"

describe("computeBorrowerRestriction", () => {
  it("is unrestricted with no flag and no override", () => {
    expect(
      computeBorrowerRestriction({
        removedFromArchController: false,
        restrictionOverride: null,
      }),
    ).toEqual({ restricted: false, source: "none" })
  })

  it("restricts on the persisted removal flag", () => {
    expect(
      computeBorrowerRestriction({
        removedFromArchController: true,
        restrictionOverride: null,
      }),
    ).toEqual({ restricted: true, source: "removal" })
  })

  it("manual restricted wins even when onchain flag is clear", () => {
    expect(
      computeBorrowerRestriction({
        removedFromArchController: false,
        restrictionOverride: "restricted",
      }),
    ).toEqual({ restricted: true, source: "override" })
  })

  it("manual cleared wins over the removal flag", () => {
    expect(
      computeBorrowerRestriction({
        removedFromArchController: true,
        restrictionOverride: "cleared",
      }),
    ).toEqual({ restricted: false, source: "override" })
  })
})

describe("computeRestrictionGateState", () => {
  const restricted = { restricted: true, source: "removal" as const }
  const unrestricted = { restricted: false, source: "none" as const }

  it("is unblocked when the query is not enabled", () => {
    expect(
      computeRestrictionGateState({
        queryEnabled: false,
        querySucceeded: false,
        state: undefined,
        lastKnown: restricted,
      }),
    ).toBe("unblocked")
  })

  it("follows a successful read", () => {
    expect(
      computeRestrictionGateState({
        queryEnabled: true,
        querySucceeded: true,
        state: restricted,
        lastKnown: undefined,
      }),
    ).toBe("blocked")
    expect(
      computeRestrictionGateState({
        queryEnabled: true,
        querySucceeded: true,
        state: unrestricted,
        lastKnown: restricted,
      }),
    ).toBe("unblocked")
  })

  it("falls back to last known state on failure and stays blocked", () => {
    expect(
      computeRestrictionGateState({
        queryEnabled: true,
        querySucceeded: false,
        state: undefined,
        lastKnown: restricted,
      }),
    ).toBe("blocked")
  })

  it("reports unknown with no read and no last known state", () => {
    expect(
      computeRestrictionGateState({
        queryEnabled: true,
        querySucceeded: false,
        state: undefined,
        lastKnown: undefined,
      }),
    ).toBe("unknown")
  })
})

describe("computeRemovalTransition", () => {
  it("sets the flag once and notifies on first observed removal", () => {
    expect(
      computeRemovalTransition({
        isRegisteredOnChain: false,
        removedFromArchController: false,
        restrictionOverride: null,
      }),
    ).toEqual({ removedFromArchController: true, notifyRestriction: true })
  })

  it("is idempotent when the removal is already persisted", () => {
    expect(
      computeRemovalTransition({
        isRegisteredOnChain: false,
        removedFromArchController: true,
        restrictionOverride: null,
      }),
    ).toBeNull()
  })

  it("auto-clears on verified re-registration", () => {
    expect(
      computeRemovalTransition({
        isRegisteredOnChain: true,
        removedFromArchController: true,
        restrictionOverride: null,
      }),
    ).toEqual({ removedFromArchController: false, notifyRestriction: false })
  })

  it("keeps the flag when a manual restriction is set", () => {
    expect(
      computeRemovalTransition({
        isRegisteredOnChain: true,
        removedFromArchController: true,
        restrictionOverride: "restricted",
      }),
    ).toBeNull()
  })

  it("writes nothing for a registered, unflagged borrower", () => {
    expect(
      computeRemovalTransition({
        isRegisteredOnChain: true,
        removedFromArchController: false,
        restrictionOverride: null,
      }),
    ).toBeNull()
  })
})

describe("guards", () => {
  it("accepts only the two override values", () => {
    expect(isRestrictionOverride("restricted")).toBe(true)
    expect(isRestrictionOverride("cleared")).toBe(true)
    expect(isRestrictionOverride("banned")).toBe(false)
    expect(isRestrictionOverride(null)).toBe(false)
  })

  it("never lists repay or terminate as restricted actions", () => {
    expect(RESTRICTED_ACTIONS).toEqual([
      "createMarket",
      "editProfile",
      "editMarketDescription",
    ])
  })
})
