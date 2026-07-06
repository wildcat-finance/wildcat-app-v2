import {
  computeToUAcceptanceState,
  isToUBlockedState,
} from "./serviceAgreementState"

const NOW = new Date("2026-07-01T12:00:00Z")
const FUTURE = new Date("2026-07-15T12:00:00Z")
const PAST = new Date("2026-06-15T12:00:00Z")

const base = {
  hasAcceptedCurrent: false,
  hasAnyAcceptance: false,
  hasDeclinedCurrent: false,
  reacceptanceDeadline: null as Date | null,
  now: NOW,
}

describe("computeToUAcceptanceState", () => {
  it("returns signedCurrent when the current version is accepted", () => {
    expect(
      computeToUAcceptanceState({
        ...base,
        hasAcceptedCurrent: true,
        hasAnyAcceptance: true,
      }),
    ).toBe("signedCurrent")
  })

  it("acceptance of the current version supersedes a recorded decline", () => {
    expect(
      computeToUAcceptanceState({
        ...base,
        hasAcceptedCurrent: true,
        hasAnyAcceptance: true,
        hasDeclinedCurrent: true,
        reacceptanceDeadline: PAST,
      }),
    ).toBe("signedCurrent")
  })

  it("returns declined when the current version was refused and not accepted", () => {
    expect(
      computeToUAcceptanceState({
        ...base,
        hasAnyAcceptance: true,
        hasDeclinedCurrent: true,
      }),
    ).toBe("declined")
  })

  it("declined applies even with no prior acceptance", () => {
    expect(
      computeToUAcceptanceState({
        ...base,
        hasDeclinedCurrent: true,
      }),
    ).toBe("declined")
  })

  it("returns neverSigned with no acceptance at all", () => {
    expect(computeToUAcceptanceState(base)).toBe("neverSigned")
  })

  it("returns stale when acceptance is old and no campaign is active", () => {
    expect(
      computeToUAcceptanceState({
        ...base,
        hasAnyAcceptance: true,
      }),
    ).toBe("stale")
  })

  it("returns staleWithinGrace before the deadline", () => {
    expect(
      computeToUAcceptanceState({
        ...base,
        hasAnyAcceptance: true,
        reacceptanceDeadline: FUTURE,
      }),
    ).toBe("staleWithinGrace")
  })

  it("returns staleExpired at/after the deadline", () => {
    expect(
      computeToUAcceptanceState({
        ...base,
        hasAnyAcceptance: true,
        reacceptanceDeadline: PAST,
      }),
    ).toBe("staleExpired")
    expect(
      computeToUAcceptanceState({
        ...base,
        hasAnyAcceptance: true,
        reacceptanceDeadline: NOW,
      }),
    ).toBe("staleExpired")
  })
})

describe("isToUBlockedState", () => {
  it("blocks only staleExpired and declined", () => {
    expect(isToUBlockedState("staleExpired")).toBe(true)
    expect(isToUBlockedState("declined")).toBe(true)
    expect(isToUBlockedState("signedCurrent")).toBe(false)
    expect(isToUBlockedState("stale")).toBe(false)
    expect(isToUBlockedState("staleWithinGrace")).toBe(false)
    expect(isToUBlockedState("neverSigned")).toBe(false)
    expect(isToUBlockedState(undefined)).toBe(false)
  })
})
