/* eslint-disable import/no-extraneous-dependencies */
import { renderHook } from "@testing-library/react"
import { usePathname } from "next/navigation"

import { ROUTES } from "@/routes"
import { resolveLenderMarketBackLink } from "@/utils/lenderMarketOrigin"

import { useMarketHref } from "./useMarketHref"

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }))

const marketAddress = "0x1111111111111111111111111111111111111111"

describe("market link return navigation", () => {
  beforeEach(() => {
    jest.mocked(usePathname).mockReturnValue(ROUTES.lender.explore)
  })

  it.each([
    [ROUTES.lender.explore, "explore"],
    [ROUTES.lender.myMarkets, "my-markets"],
    [ROUTES.lender.allMarkets, "all-markets"],
  ])("carries %s through a native link into a fresh tab", (pathname, from) => {
    jest.mocked(usePathname).mockReturnValue(pathname)
    const { result, unmount } = renderHook(() => useMarketHref())
    const href = result.current(marketAddress, 11155111)
    unmount()

    // A new tab has only the clicked URL, with no source React or storage state.
    const destination = new URL(href, "https://app.example")
    expect(destination.pathname).toBe(`/lender/market/${marketAddress}`)
    expect(destination.searchParams.get("chainId")).toBe("11155111")
    expect(destination.searchParams.get("from")).toBe(from)
    expect(
      resolveLenderMarketBackLink(destination.searchParams.get("from")),
    ).toBe(pathname)
  })

  it("keeps the origin when a link has no explicit chain", () => {
    jest.mocked(usePathname).mockReturnValue(ROUTES.lender.myMarkets)
    const { result } = renderHook(() => useMarketHref())

    expect(result.current(marketAddress)).toBe(
      `/lender/market/${marketAddress}?from=my-markets`,
    )
  })

  it("uses the current list after client-side navigation", () => {
    jest.mocked(usePathname).mockReturnValue(ROUTES.lender.myMarkets)
    const { result, rerender } = renderHook(() => useMarketHref())
    expect(result.current(marketAddress)).toContain("from=my-markets")

    jest.mocked(usePathname).mockReturnValue(ROUTES.lender.allMarkets)
    rerender()

    expect(result.current(marketAddress)).toContain("from=all-markets")
  })

  it.each([
    ROUTES.borrower.root,
    ROUTES.lender.profile,
    `${ROUTES.lender.market}/${marketAddress}`,
  ])("leaves links outside the three lender lists unqualified: %s", (path) => {
    jest.mocked(usePathname).mockReturnValue(path)
    const { result } = renderHook(() => useMarketHref())

    expect(result.current(marketAddress, 1)).toBe(
      `/lender/market/${marketAddress}?chainId=1`,
    )
  })

  it("preserves borrower destinations in shared market cards", () => {
    jest.mocked(usePathname).mockReturnValue(ROUTES.lender.myMarkets)
    const { result } = renderHook(() => useMarketHref())

    expect(result.current(marketAddress, 1, ROUTES.borrower.market)).toBe(
      `/borrower/market/${marketAddress}?chainId=1`,
    )
  })
})
