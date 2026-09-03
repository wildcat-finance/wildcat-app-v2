/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"

import { MarketSidebar } from "./index"

const dispatchMock = jest.fn()
let marketIsClosedMock = false

jest.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en", address: "0xmarket" }),
  useSearchParams: () => ({ get: () => "11155111" }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xborrower" }),
}))
jest.mock("@/components/BackButton", () => ({ BackButton: () => null }))
jest.mock("@/assets/icons/borrowAndRepay_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/collateralContract_icon.svg", () => ({
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
jest.mock("@/hooks/useGetMarket", () => ({
  useGetMarket: () => ({
    data: {
      address: "0xmarket",
      borrower: "0xborrower",
      chainId: 11155111,
      isClosed: marketIsClosedMock,
    },
  }),
}))
jest.mock("@/hooks/useGetMarketAccount", () => ({
  useGetMarketAccountForBorrowerLegacy: () => ({ data: null }),
}))
jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => ({
    isWrongNetwork: false,
    isSelectionMismatch: false,
  }),
}))
jest.mock(
  "@/components/PaginatedMarketRecordsTable/hooks/usePrefetchMarketRecords",
  () => ({ usePrefetchMarketRecords: () => jest.fn() }),
)
jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket",
  () => ({ TerminateMarket: () => null }),
)
jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      highlightSidebar: {
        sidebarState: {
          borrowRepay: true,
          statusDetails: false,
          marketSummary: false,
          withdrawals: false,
          lenders: false,
          mla: false,
          marketHistory: false,
          tokenWrapper: false,
        },
        withdrawalsCount: 0,
      },
      hideMarketSections: { description: false },
    }),
}))

const borrowRepayButton = () =>
  screen.queryByRole("button", {
    name: "marketDetails.borrower.sidebar.borrowRepay",
  })

describe("MarketSidebar terminated-market sections", () => {
  beforeEach(() => {
    marketIsClosedMock = false
    dispatchMock.mockClear()
  })

  it("shows Borrow and Repay for the borrower of an open market", () => {
    render(<MarketSidebar />)

    expect(borrowRepayButton()).not.toBeNull()
  })

  it("hides Borrow and Repay once the market is terminated", () => {
    marketIsClosedMock = true

    render(<MarketSidebar />)

    expect(borrowRepayButton()).toBeNull()
  })
})
