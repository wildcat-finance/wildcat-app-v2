/** @jest-environment node */

import { NextRequest, NextResponse } from "next/server"
import { i18nRouter } from "next-i18n-router"

import { middleware } from "./middleware"

jest.mock("next-i18n-router", () => ({
  i18nRouter: jest.fn(),
}))

const mockedI18nRouter = jest.mocked(i18nRouter)

describe("middleware", () => {
  beforeEach(() => {
    mockedI18nRouter.mockReset()
    mockedI18nRouter.mockReturnValue(NextResponse.next())
  })

  it("serves embed routes without locale routing", async () => {
    const response = await middleware(
      new NextRequest("https://app.wildcat.finance/embed/landing-stats"),
    )

    expect(mockedI18nRouter).not.toHaveBeenCalled()
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })

  it("retains locale routing for ordinary application routes", async () => {
    const request = new NextRequest("https://app.wildcat.finance/lender")

    await middleware(request)

    expect(mockedI18nRouter).toHaveBeenCalledTimes(1)
    expect(mockedI18nRouter).toHaveBeenCalledWith(request, expect.any(Object))
  })

  it("does not bypass locale routing for similarly prefixed routes", async () => {
    const request = new NextRequest("https://app.wildcat.finance/embedded")

    await middleware(request)

    expect(mockedI18nRouter).toHaveBeenCalledTimes(1)
    expect(mockedI18nRouter).toHaveBeenCalledWith(request, expect.any(Object))
  })
})
