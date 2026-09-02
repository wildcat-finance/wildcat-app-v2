/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"
import { MarketVersion } from "@wildcatfi/wildcat-sdk"

import MarketDetails from "./page"

const mockDispatch = jest.fn()
let mockMarketIsClosed = false
let mockMarketMla: object | null = {}

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => "11155111" }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xborrower" }),
}))
jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}))
jest.mock("./hooks/useScrollHandler", () => ({
  __esModule: true,
  default: () => ({ checked: 1 }),
}))
jest.mock("@/hooks/useGetMarket", () => ({
  useGetMarket: () => ({
    data: {
      address: "0xmarket",
      borrower: "0xborrower",
      chainId: 11155111,
      isClosed: mockMarketIsClosed,
      version: MarketVersion.V2,
    },
    isLoading: false,
    error: null,
    apiLoading: false,
    isDiscoveringChainId: false,
    isAwaitingMarketData: false,
  }),
}))
jest.mock("@/hooks/useGetMarketAccount", () => ({
  useGetMarketAccountForBorrowerLegacy: () => ({
    data: {},
    isLoadingInitial: false,
  }),
}))
jest.mock("./hooks/useGetWithdrawals", () => ({
  useGetWithdrawals: () => ({
    data: {
      activeWithdrawal: undefined,
      batchesWithClaimableWithdrawals: [],
      expiredPendingWithdrawals: [],
    },
    isLoadingInitial: false,
  }),
}))
jest.mock("@/hooks/useMarketDetailPerformance", () => ({
  useMarketDetailPerformanceMark: jest.fn(),
}))
jest.mock(
  "@/components/PaginatedMarketRecordsTable/hooks/usePrefetchMarketRecords",
  () => ({ useIdlePrefetchMarketRecords: jest.fn() }),
)
jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => ({
    isWrongNetwork: false,
    isSelectionMismatch: false,
  }),
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 11155111 }),
}))
jest.mock("@/hooks/useMarketSummary", () => ({
  useMarketSummary: () => ({ data: { description: "" }, isLoading: false }),
}))
jest.mock("@/hooks/useMarketMla", () => ({
  useMarketMla: () => ({ data: mockMarketMla, isLoading: false }),
}))
jest.mock("@/hooks/wrapper/useWrapperForMarket", () => ({
  useWrapperForMarket: () => ({
    wrapper: undefined,
    hasWrapper: false,
    hasFactory: false,
    isLoading: false,
    isError: false,
  }),
}))

jest.mock("@/components/MarketHeader", () => ({ MarketHeader: () => null }))
jest.mock(
  "@/app/[locale]/lender/market/[address]/components/SwitchChainAlert",
  () => ({ SwitchChainAlert: () => null }),
)
jest.mock("@/components/LeadBanner", () => ({
  LeadBanner: () => <div>missing MLA prompt</div>,
}))
jest.mock("@/components/MarketDetailSkeletons", () => ({
  AccountRowsSkeleton: () => <div>account skeleton</div>,
  BorrowerTransactionsSkeleton: () => <div>transactions skeleton</div>,
  ChartSectionSkeleton: () => <div>chart skeleton</div>,
}))
jest.mock("./components/MarketTransactions", () => ({
  MarketTransactions: () => <div>market transactions</div>,
}))
jest.mock("./components/MarketStatusChart", () => ({
  MarketStatusChart: () => <div>market status</div>,
}))
jest.mock("@/components/MarketParameters", () => ({
  MarketParameters: () => <div>market parameters</div>,
}))
jest.mock("./components/BorrowerMarketSummary", () => ({
  BorrowerMarketSummary: () => null,
}))
jest.mock("./components/MarketWithdrawalRequests", () => ({
  MarketWithdrawalRequests: () => null,
}))
jest.mock("./components/MarketAuthorisedLenders", () => ({
  MarketAuthorisedLenders: () => null,
}))
jest.mock("./components/MarketMLA", () => ({ MarketMLA: () => null }))
jest.mock("@/components/PaginatedMarketRecordsTable", () => ({
  PaginatedMarketRecordsTable: () => null,
}))
jest.mock("./components/WrapDebtToken", () => ({ WrapDebtToken: () => null }))

describe("borrower market terminated-market landing", () => {
  beforeEach(() => {
    mockDispatch.mockClear()
    mockMarketIsClosed = false
    mockMarketMla = {}
    window.sessionStorage.clear()
  })

  it("keeps an open market on Borrow and Repay", () => {
    render(<MarketDetails params={{ address: "0xmarket" }} />)

    expect(screen.getByText("market transactions")).not.toBeNull()
    expect(screen.queryByText("market parameters")).toBeNull()
  })

  it("lands a terminated V2 market on Status and Details", () => {
    mockMarketIsClosed = true
    mockMarketMla = null

    render(<MarketDetails params={{ address: "0xmarket" }} />)

    expect(screen.queryByText("market transactions")).toBeNull()
    expect(screen.queryByText("transactions skeleton")).toBeNull()
    expect(screen.queryByText("missing MLA prompt")).toBeNull()
    expect(screen.getByText("market status")).not.toBeNull()
    expect(screen.getByText("market parameters")).not.toBeNull()
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "highlightSidebar/setCheckBlock",
      payload: 2,
    })
  })
})
