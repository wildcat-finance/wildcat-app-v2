describe("isTestMode", () => {
  const original = process.env.NEXT_PUBLIC_TEST_MODE
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_TEST_MODE
    else process.env.NEXT_PUBLIC_TEST_MODE = original
    jest.resetModules()
  })
  it("is false when unset", () => {
    delete process.env.NEXT_PUBLIC_TEST_MODE
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      expect(require("./testMode").isTestMode).toBe(false)
    })
  })
  it("is true only for the exact value '1'", () => {
    process.env.NEXT_PUBLIC_TEST_MODE = "1"
    jest.isolateModules(() =>
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      expect(require("./testMode").isTestMode).toBe(true),
    )
    process.env.NEXT_PUBLIC_TEST_MODE = "true"
    jest.isolateModules(() =>
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      expect(require("./testMode").isTestMode).toBe(false),
    )
  })
})
