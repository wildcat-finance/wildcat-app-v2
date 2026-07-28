const originalAnalyticsFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_UI

afterEach(() => {
  jest.resetModules()

  if (originalAnalyticsFlag === undefined) {
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_UI
  } else {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_UI = originalAnalyticsFlag
  }
})

describe("analyticsUiEnabled", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["TRUE", false],
    ["true", true],
  ])("maps %p to %p", async (value, expected) => {
    if (value === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_UI
    } else {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_UI = value
    }

    const featureFlags = await import("./featureFlags")

    expect(featureFlags.analyticsUiEnabled).toBe(expected)
  })
})
