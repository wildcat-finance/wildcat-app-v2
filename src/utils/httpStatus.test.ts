import { isTerminalClientError } from "./httpStatus"

describe("isTerminalClientError", () => {
  it("keeps timeout, early-data and rate-limit responses retryable", () => {
    expect(isTerminalClientError(408)).toBe(false)
    expect(isTerminalClientError(425)).toBe(false)
    expect(isTerminalClientError(429)).toBe(false)
  })

  it("classifies definitive client errors as terminal", () => {
    expect(isTerminalClientError(400)).toBe(true)
    expect(isTerminalClientError(404)).toBe(true)
    expect(isTerminalClientError(409)).toBe(true)
    expect(isTerminalClientError(500)).toBe(false)
  })
})
