import { formatDeployDate } from "./deployInfo"

describe("formatDeployDate", () => {
  it("formats the build timestamp in UTC", () => {
    expect(formatDeployDate("2026-07-30T04:32:00.000Z")).toBe(
      "30.07.2026 04:32",
    )
  })

  it("omits the timestamp when no build time is available", () => {
    expect(formatDeployDate(undefined)).toBeNull()
  })
})
