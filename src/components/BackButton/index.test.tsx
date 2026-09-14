/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import { BackButton } from "@/components/BackButton"
import { LenderMarketSidebar } from "@/components/Sidebar/LenderMarketSidebar"
import { ROUTES } from "@/routes"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// svgr turns these into components at build time; jest resolves them to a
// static asset object, so each one is stubbed the way this repo's other
// component tests stub the modules they do not exercise.
jest.mock("@/assets/icons/backArrow_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/borrowAndRepay_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/lenderBorrower_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/marketEvents_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/statusAndDetails_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/summary_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/tokenWrap_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/withdrawalAndRequests_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))

// A working router is mocked in deliberately, even though BackButton no longer
// calls one. If someone reintroduces history navigation here, these tests
// should fail on the destination rather than on a missing app-router context,
// which would read as a test-setup problem instead of the defect in issue 32.
let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useParams: () => ({ address: "0xmarket" }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock("@/hooks/useGetMarket", () => ({
  useGetMarket: () => ({ data: undefined }),
}))
jest.mock(
  "@/components/PaginatedMarketRecordsTable/hooks/usePrefetchMarketRecords",
  () => ({ usePrefetchMarketRecords: () => jest.fn() }),
)

const mockSidebarState = {
  lenderMarketRouting: {
    currentSection: "transactions",
    isLoading: false,
    isLender: true,
    withdrawalsCount: 0,
  },
  hideMarketSections: { description: false },
}

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector(mockSidebarState),
}))

describe("BackButton", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
  })

  afterEach(() => jest.restoreAllMocks())

  it("gives the lender market sidebar a link to the markets page", () => {
    render(<LenderMarketSidebar />)

    const control = screen.getByRole("link", { name: /nav.backMarkets/i })

    expect(control.getAttribute("href")).toBe(ROUTES.lender.root)
  })

  it.each([
    ["explore", ROUTES.lender.explore],
    ["my-markets", ROUTES.lender.myMarkets],
    ["all-markets", ROUTES.lender.allMarkets],
  ])("returns a fresh market page to %s without tab storage", (from, path) => {
    mockSearchParams = new URLSearchParams({ chainId: "11155111", from })
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage is blocked")
    })

    render(<LenderMarketSidebar />)

    expect(
      screen
        .getByRole("link", { name: /nav.backMarkets/i })
        .getAttribute("href"),
    ).toBe(path)
  })

  it.each([
    "",
    "https://example.com",
    "//example.com",
    // eslint-disable-next-line no-script-url -- Verify script URLs are rejected.
    "javascript:alert(1)",
    "/lender/my-markets",
    "constructor",
    "__proto__",
    "toString",
  ])("falls back to Explore for the unrecognised origin %j", (from) => {
    mockSearchParams = new URLSearchParams({ from })

    render(<LenderMarketSidebar />)

    expect(
      screen
        .getByRole("link", { name: /nav.backMarkets/i })
        .getAttribute("href"),
    ).toBe(ROUTES.lender.root)
  })

  it("updates Back when navigation changes the URL origin without remounting", () => {
    mockSearchParams = new URLSearchParams({ from: "my-markets" })
    const { rerender } = render(<LenderMarketSidebar />)
    mockSearchParams = new URLSearchParams({ from: "all-markets" })

    rerender(<LenderMarketSidebar />)

    expect(
      screen
        .getByRole("link", { name: /nav.backMarkets/i })
        .getAttribute("href"),
    ).toBe(ROUTES.lender.allMarkets)
  })

  it("renders a supplied link as an anchor", () => {
    render(<BackButton title="Back" link="/lender/my-markets" />)

    expect(
      screen.getByRole("link", { name: /Back/i }).getAttribute("href"),
    ).toBe("/lender/my-markets")
    expect(screen.queryByRole("button", { name: /Back/i })).toBeNull()
  })

  it("falls back to the borrower root when no link is given", () => {
    render(<BackButton title="Back" />)

    expect(
      screen.getByRole("link", { name: /Back/i }).getAttribute("href"),
    ).toBe(ROUTES.borrower.root)
  })

  it("calls onClick when activated", () => {
    const onClick = jest.fn()

    render(<BackButton title="Back" link="/lender" onClick={onClick} />)

    fireEvent.click(screen.getByRole("link", { name: /Back/i }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
