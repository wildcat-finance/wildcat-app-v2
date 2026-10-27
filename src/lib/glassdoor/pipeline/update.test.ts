/** @jest-environment node */

import { dayToClose } from "./update"

describe("dayToClose", () => {
  it("closes the last publication's day once a later day is finalized", () => {
    expect(dayToClose("2026-10-21", "2026-10-22", false)).toBe("2026-10-21")
  })

  it("closes one missed day per run after an outage", () => {
    expect(dayToClose("2026-10-21", "2026-10-26", true)).toBe("2026-10-22")
    expect(dayToClose("2026-10-25", "2026-10-26", true)).toBeUndefined()
    expect(dayToClose("2026-10-31", "2026-11-03", true)).toBe("2026-11-01")
  })

  it("closes nothing while the latest block is still on the same day", () => {
    expect(dayToClose("2026-10-26", "2026-10-26", false)).toBeUndefined()
  })
})
