/* eslint-disable import/no-extraneous-dependencies */
import { configureStore } from "@reduxjs/toolkit"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { LenderRole, Market, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { Provider } from "react-redux"

import lenderMarketRouting, {
  LenderMarketSections,
  setSection,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import wrapDebtTokenFlow from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"

import LenderMarketDetails from "./page"

const mockUseGetMarket = jest.fn()
const mockUseAccount = jest.fn()
const mockUseLenderMarketAccount = jest.fn()
const mockUseGetLenderWithdrawals = jest.fn()
const mockUseWrapperForMarket = jest.fn()
const mockUseWrapperAccountState = jest.fn()
const mockUseMarketSummary = jest.fn()
const mockUseNetworkGate = jest.fn()
const mockRefetchAccess = jest.fn()
let mockWalletHydrated = true
let mockMobile = false

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("chainId=11155111"),
}))
jest.mock("next/dynamic", () => () => () => null)
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("wagmi", () => ({ useAccount: () => mockUseAccount() }))
jest.mock("@/hooks/useGetMarket", () => ({
  useGetMarket: () => mockUseGetMarket(),
}))
jest.mock("./hooks/useLenderMarketAccount", () => ({
  useLenderMarketAccount: () => mockUseLenderMarketAccount(),
}))
jest.mock("./hooks/useGetLenderWithdrawals", () => ({
  useGetLenderWithdrawals: () => mockUseGetLenderWithdrawals(),
}))
jest.mock("@/hooks/wrapper/useWrapperForMarket", () => ({
  useWrapperForMarket: () => mockUseWrapperForMarket(),
}))
jest.mock("@/hooks/wrapper/useWrapperAccountState", () => ({
  useWrapperAccountState: () => mockUseWrapperAccountState(),
}))
jest.mock("@/hooks/useMarketSummary", () => ({
  useMarketSummary: () => mockUseMarketSummary(),
}))
jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => mockUseNetworkGate(),
}))
jest.mock("@/hooks/useWagmiHydrated", () => ({
  useWagmiHydrated: () => mockWalletHydrated,
}))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: () => mockMobile,
}))
jest.mock("@/hooks/useEthersSigner", () => ({ useEthersProvider: () => ({}) }))
jest.mock("@/hooks/useMarketMla", () => ({
  useMarketMla: () => ({ data: undefined, isLoading: false }),
}))
jest.mock("@/hooks/useMarketDetailPerformance", () => ({
  useMarketDetailPerformanceMark: jest.fn(),
}))
jest.mock(
  "@/components/PaginatedMarketRecordsTable/hooks/usePrefetchMarketRecords",
  () => ({ useIdlePrefetchMarketRecords: jest.fn() }),
)
jest.mock("./hooks/useBorrowerPenaltyWarning", () => ({
  useBorrowerPenaltyWarning: () => ({ state: "clear" }),
}))
jest.mock("./hooks/useLenderMarketAnalytics", () => ({
  useLenderMarketAnalytics: () => ({}),
}))
jest.mock("./hooks/useMarketDailyFlows", () => ({
  useMarketDailyFlows: () => ({}),
}))
jest.mock("./hooks/useMarketDelinquencyHistory", () => ({
  useMarketDelinquencyHistory: () => ({}),
}))
jest.mock("@/config/featureFlags", () => ({ analyticsUiEnabled: false }))
jest.mock("@/utils/formatters", () => ({
  buildBorrowerProfileHref: () => "/profile/borrower",
  formatTokenWithCommas: () => "0",
}))

jest.mock("@/components/MarketHeader", () => ({
  MarketHeader: () => <div data-testid="market-header" />,
}))
jest.mock("@/components/MarketDetailSkeletons", () => ({
  MarketHeaderSkeleton: () => <div data-testid="header-skeleton" />,
  LenderTransactionsSkeleton: () => <div data-testid="transactions-skeleton" />,
  ChartSectionSkeleton: () => <div data-testid="charts-skeleton" />,
  AccountRowsSkeleton: () => null,
  DescriptionSkeleton: () => null,
  MarketRecordsSkeleton: () => null,
}))
jest.mock("@/components/LeadBanner", () => ({
  LeadBanner: ({
    title,
    buttonText,
    buttonOnClick,
  }: {
    title: string
    buttonText?: string
    buttonOnClick?: () => void
  }) => (
    <div>
      {title}
      {buttonText && <button onClick={buttonOnClick}>{buttonText}</button>}
    </div>
  ),
}))
jest.mock("@/components/Header/HeaderButton/ConnectWalletDialog", () => ({
  ConnectWalletDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">connect wallet</div> : null,
}))
jest.mock("./components/SwitchChainAlert", () => ({
  SwitchChainAlert: () => <div>switch network</div>,
}))
jest.mock("./components/BarCharts", () => ({
  BarCharts: () => <div data-testid="status-charts" />,
}))
jest.mock("./components/BarCharts/CapacityBarChart", () => ({
  CapacityBarChart: () => <div data-testid="capacity-chart" />,
}))
jest.mock("./components/MarketActions", () => ({
  MarketActions: () => <div data-testid="market-actions" />,
}))
jest.mock("@/components/MarketParameters", () => ({
  MarketParameters: () => <div data-testid="market-parameters" />,
}))
jest.mock("./components/MarketSummary", () => ({
  MarketSummary: ({ isLoading }: { isLoading: boolean }) => (
    <div data-testid={isLoading ? "summary-skeleton" : "market-summary"} />
  ),
}))
jest.mock("./components/WithdrawalRequests", () => ({
  WithdrawalRequests: () => null,
}))
jest.mock("@/components/PaginatedMarketRecordsTable", () => ({
  PaginatedMarketRecordsTable: () => <div data-testid="market-history" />,
}))
jest.mock("./components/WrapDebtToken", () => ({ WrapDebtToken: () => null }))
jest.mock("@/components/WrapDebtToken/WrapperSkeleton", () => ({
  WrapperSkeleton: () => null,
}))
jest.mock("./components/LenderAnalyticsSummary", () => ({
  LenderAnalyticsSummary: () => null,
}))
jest.mock("@/components/Profile/ProfileSection", () => ({
  ProfileSection: () => <div data-testid="borrower-profile" />,
}))
jest.mock("@/components/Footer", () => ({ Footer: () => null }))
jest.mock("./components/BorrowerPenaltyWarning", () => ({
  BorrowerPenaltyWarning: () => null,
}))
jest.mock("@/components/PendingAprReductionBanner", () => ({
  PendingAprReductionBanner: () => null,
}))
jest.mock("@/components/MobileConnectWallet", () => ({
  MobileConnectWallet: () => null,
}))
jest.mock("./components/mobile/MobileLenderBanner", () => ({
  MobileLenderBanner: () => null,
}))
jest.mock("./components/mobile/MobileMarketActions", () => ({
  MobileMarketActions: () => null,
}))
jest.mock("./components/mobile/MobileMlaAlert", () => ({
  MobileMlaAlert: () => null,
}))
jest.mock("./components/mobile/MobileMlaModal/MobileMlaModal", () => ({
  MobileMlaModal: () => null,
}))
jest.mock("./components/Modals/DepositModal", () => ({
  DepositModal: () => null,
}))
jest.mock("./components/Modals/WithdrawModal", () => ({
  WithdrawModal: () => null,
}))
jest.mock("./components/Modals/NonMlaAcknowledgementModal", () => ({
  NonMlaAcknowledgementModal: () => null,
}))
jest.mock("./components/Modals/MobileMarketDescriptionModal", () => ({
  MobileMarketDescriptionModal: () => null,
}))
jest.mock("./components/Modals/MobileMarketHistoryModal", () => ({
  MobileMarketHistoryModal: () => null,
}))

const zero = { gt: () => false, format: () => "0" }
const market = {
  address: "0x1111111111111111111111111111111111111111",
  borrower: "0x2222222222222222222222222222222222222222",
  chainId: 11155111,
  underlyingToken: { symbol: "USDC", getAmount: () => zero },
} as unknown as Market
const account = (role = LenderRole.Null) =>
  ({ inferredRole: role, marketBalance: zero }) as unknown as MarketAccount

const marketResult = {
  data: market,
  isLoading: false,
  error: null,
  apiLoading: false,
  isDiscoveringChainId: false,
  isAwaitingMarketData: false,
}
const accountResult = {
  data: account(),
  authoritativeAccount: account(),
  authoritativeStatus: "resolved",
  isLoadingInitial: false,
  isLoadingUpdate: false,
  isPendingUpdate: false,
  refetchUpdate: mockRefetchAccess,
}
const withdrawalsResult = {
  data: { activeWithdrawal: undefined, expiredPendingWithdrawals: [] },
  isLoadingInitial: false,
}
const wrapperResult = {
  wrapper: undefined,
  hasWrapper: false,
  hasFactory: true,
  isLoading: false,
  isError: false,
}
const walletResult = {
  address: "0x3333333333333333333333333333333333333333",
  isConnected: true,
  isConnecting: false,
  isReconnecting: false,
}

const mountPage = () => {
  const store = configureStore({
    reducer: { lenderMarketRouting, wrapDebtTokenFlow },
  })
  const page = (address = market.address) => (
    <Provider store={store}>
      <LenderMarketDetails params={{ address }} />
    </Provider>
  )
  const result = render(page())
  return {
    store,
    rerender: (address?: string) => result.rerender(page(address)),
  }
}

const expectInitialLoading = () => {
  expect(screen.getByTestId("header-skeleton")).not.toBeNull()
  expect(screen.getByTestId("transactions-skeleton")).not.toBeNull()
  expect(screen.queryByTestId("market-header")).toBeNull()
  expect(screen.queryByTestId("charts-skeleton")).toBeNull()
}

const expectAccountLoading = () => {
  expect(screen.getByTestId("market-header")).not.toBeNull()
  expect(screen.queryByTestId("header-skeleton")).toBeNull()
  expect(screen.getByTestId("transactions-skeleton")).not.toBeNull()
  expect(screen.queryByTestId("charts-skeleton")).toBeNull()
  expect(screen.queryByTestId("capacity-chart")).toBeNull()
  expect(screen.queryByTestId("status-charts")).toBeNull()
  expect(screen.queryByTestId("market-actions")).toBeNull()
  expect(
    screen.queryByText("marketDetails.lender.lendThroughWildcat"),
  ).toBeNull()
}

describe("lender market progressive loading", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWalletHydrated = true
    mockMobile = false
    mockUseGetMarket.mockReturnValue(marketResult)
    mockUseAccount.mockReturnValue(walletResult)
    mockUseLenderMarketAccount.mockReturnValue(accountResult)
    mockUseGetLenderWithdrawals.mockReturnValue(withdrawalsResult)
    mockUseWrapperForMarket.mockReturnValue(wrapperResult)
    mockUseWrapperAccountState.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    mockUseMarketSummary.mockReturnValue({ data: undefined, isLoading: false })
    mockUseNetworkGate.mockReturnValue({
      isWrongNetwork: false,
      isSelectionMismatch: false,
      selectedChainId: market.chainId,
    })
    mockRefetchAccess.mockResolvedValue({})
  })

  it.each([LenderRole.Null, LenderRole.DepositAndWithdraw])(
    "reveals public content first and settles the account area once for role %s",
    (role) => {
      mockUseGetMarket.mockReturnValue({
        ...marketResult,
        data: undefined,
        isLoading: true,
      })
      mockUseLenderMarketAccount.mockReturnValue({
        ...accountResult,
        data: undefined,
        authoritativeAccount: undefined,
        authoritativeStatus: "idle",
      })
      const { store, rerender } = mountPage()
      expectInitialLoading()

      mockUseGetMarket.mockReturnValue(marketResult)
      mockUseLenderMarketAccount.mockReturnValue({
        ...accountResult,
        authoritativeAccount: undefined,
        authoritativeStatus: "resolving",
        isLoadingUpdate: true,
      })
      mockUseGetLenderWithdrawals.mockReturnValue({
        ...withdrawalsResult,
        isLoadingInitial: true,
      })
      mockUseWrapperForMarket.mockReturnValue({
        ...wrapperResult,
        isLoading: true,
      })
      rerender()
      expectAccountLoading()
      expect(store.getState().lenderMarketRouting.isLoading).toBe(false)

      mockUseLenderMarketAccount.mockReturnValue({
        ...accountResult,
        data: account(role),
        authoritativeAccount: account(role),
      })
      rerender()
      expectAccountLoading()
      expect(store.getState().lenderMarketRouting.currentSection).toBe(
        LenderMarketSections.TRANSACTIONS,
      )

      mockUseGetLenderWithdrawals.mockReturnValue(withdrawalsResult)
      rerender()
      expectAccountLoading()

      mockUseWrapperForMarket.mockReturnValue(wrapperResult)
      rerender()
      expect(screen.queryByTestId("header-skeleton")).toBeNull()
      expect(screen.queryByTestId("transactions-skeleton")).toBeNull()
      expect(screen.getByTestId("market-header")).not.toBeNull()
      expect(store.getState().lenderMarketRouting.isLoading).toBe(false)
      if (role === LenderRole.Null) {
        expect(screen.getByTestId("status-charts")).not.toBeNull()
        expect(
          screen.getByText("marketDetails.lender.lendThroughWildcat"),
        ).not.toBeNull()
      } else {
        expect(screen.getByTestId("market-actions")).not.toBeNull()
        expect(screen.getByTestId("capacity-chart")).not.toBeNull()
      }
    },
  )

  it("waits for wrapper balances before choosing the landing section", () => {
    const discoveredWrapper = {
      ...wrapperResult,
      wrapper: {},
      hasWrapper: true,
    }
    mockUseWrapperForMarket.mockReturnValue(discoveredWrapper)
    mockUseWrapperAccountState.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    const { rerender } = mountPage()
    expectAccountLoading()

    mockUseWrapperAccountState.mockReturnValue({
      data: { balances: { shareBalance: { gt: () => true } } },
      isLoading: false,
    })
    rerender()
    expect(screen.getByTestId("market-actions")).not.toBeNull()
    expect(screen.queryByTestId("status-charts")).toBeNull()
    expect(
      screen.queryByText("marketDetails.lender.lendThroughWildcat"),
    ).toBeNull()
  })

  it("does not hold the header, navigation or account area behind description metadata", () => {
    mockUseMarketSummary.mockReturnValue({ data: undefined, isLoading: true })
    const { store, rerender } = mountPage()
    expect(screen.getByTestId("market-header")).not.toBeNull()
    expect(screen.getByTestId("status-charts")).not.toBeNull()
    expect(store.getState().lenderMarketRouting.isLoading).toBe(false)
    expect(screen.queryByTestId("transactions-skeleton")).toBeNull()

    mockUseMarketSummary.mockReturnValue({ data: undefined, isLoading: false })
    rerender()
    expect(screen.getByTestId("market-header")).not.toBeNull()
    expect(store.getState().lenderMarketRouting.isLoading).toBe(false)
  })

  it("reveals public content during wallet hydration and connect before anonymous reads finish", () => {
    mockWalletHydrated = false
    mockUseAccount.mockReturnValue({
      ...walletResult,
      address: undefined,
      isConnected: false,
    })
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      data: undefined,
      authoritativeAccount: undefined,
      authoritativeStatus: "resolving",
      isLoadingInitial: true,
      isLoadingUpdate: true,
    })
    mockUseWrapperForMarket.mockReturnValue({
      ...wrapperResult,
      isLoading: true,
    })
    const { store, rerender } = mountPage()
    expectAccountLoading()
    expect(store.getState().lenderMarketRouting.isLoading).toBe(false)
    expect(
      screen.queryByRole("button", { name: "common.labels.connectWallet" }),
    ).toBeNull()

    mockWalletHydrated = true
    rerender()
    expectAccountLoading()
    expect(
      screen.getByRole("button", { name: "common.labels.connectWallet" }),
    ).not.toBeNull()

    mockUseLenderMarketAccount.mockReturnValue(accountResult)
    rerender()
    expect(screen.getByTestId("market-header")).not.toBeNull()
    expect(screen.getByTestId("capacity-chart")).not.toBeNull()
    expect(
      screen.getByRole("button", { name: "common.labels.connectWallet" }),
    ).not.toBeNull()
  })

  it("keeps wallet connection available after anonymous account reads fail", () => {
    mockUseAccount.mockReturnValue({
      ...walletResult,
      address: undefined,
      isConnected: false,
    })
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      data: undefined,
      authoritativeAccount: undefined,
      authoritativeStatus: "error",
    })
    mountPage()
    fireEvent.click(
      screen.getByRole("button", { name: "common.labels.connectWallet" }),
    )
    expect(screen.getByRole("dialog")).not.toBeNull()
  })

  it("exposes access retry without waiting for other reads", () => {
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      authoritativeAccount: undefined,
      authoritativeStatus: "error",
    })
    mockUseWrapperForMarket.mockReturnValue({
      ...wrapperResult,
      isLoading: true,
    })
    mockUseGetLenderWithdrawals.mockReturnValue({
      ...withdrawalsResult,
      isLoadingInitial: true,
    })
    mountPage()
    fireEvent.click(
      screen.getByRole("button", { name: "common.buttons.retry" }),
    )
    expect(mockRefetchAccess).toHaveBeenCalledTimes(1)
  })

  it("does not hold network recovery behind account loading", () => {
    mockUseNetworkGate.mockReturnValue({
      isWrongNetwork: true,
      isSelectionMismatch: false,
      selectedChainId: market.chainId,
    })
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      data: undefined,
      authoritativeAccount: undefined,
      authoritativeStatus: "idle",
      isLoadingInitial: true,
    })
    const { store } = mountPage()
    expect(screen.getByText("switch network")).not.toBeNull()
    expect(store.getState().lenderMarketRouting.isLoading).toBe(false)
  })

  it("does not hold cached content behind a paused authoritative read", () => {
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      authoritativeAccount: undefined,
      authoritativeStatus: "resolving",
      isPendingUpdate: true,
    })
    mountPage()
    expect(screen.getByTestId("market-header")).not.toBeNull()
    expect(screen.queryByTestId("header-skeleton")).toBeNull()
  })

  it("keeps an open connection dialog mounted after the page has settled", () => {
    mockUseAccount.mockReturnValue({
      ...walletResult,
      address: undefined,
      isConnected: false,
    })
    const { rerender } = mountPage()
    fireEvent.click(
      screen.getByRole("button", { name: "common.labels.connectWallet" }),
    )
    expect(screen.getByRole("dialog")).not.toBeNull()

    mockUseAccount.mockReturnValue({
      ...walletResult,
      address: undefined,
      isConnected: false,
      isConnecting: true,
    })
    rerender()
    expect(screen.getByRole("dialog")).not.toBeNull()
    expect(screen.queryByTestId("header-skeleton")).toBeNull()
  })

  it("preserves the selected section after initial loading", () => {
    const { store, rerender } = mountPage()
    act(() => {
      store.dispatch(setSection(LenderMarketSections.MARKET_HISTORY))
    })
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      isLoadingInitial: true,
    })
    rerender()
    expect(screen.getByTestId("market-history")).not.toBeNull()
    expect(screen.queryByTestId("header-skeleton")).toBeNull()
  })

  it.each([
    [LenderMarketSections.STATUS, "market-parameters"],
    [LenderMarketSections.MARKET_HISTORY, "market-history"],
    [LenderMarketSections.SUMMARY, "summary-skeleton"],
    [LenderMarketSections.BORROWER_PROFILE, "borrower-profile"],
  ])(
    "allows selecting %s during account loading and preserves it when access resolves",
    (section, testId) => {
      mockUseMarketSummary.mockReturnValue({ data: undefined, isLoading: true })
      mockUseLenderMarketAccount.mockReturnValue({
        ...accountResult,
        data: undefined,
        authoritativeAccount: undefined,
        authoritativeStatus: "resolving",
        isLoadingUpdate: true,
      })
      const { store, rerender } = mountPage()
      expectAccountLoading()
      expect(store.getState().lenderMarketRouting.isLoading).toBe(false)

      act(() => {
        store.dispatch(setSection(section as LenderMarketSections))
      })
      expect(screen.getByTestId(testId)).not.toBeNull()
      if (section !== LenderMarketSections.STATUS) {
        expect(screen.queryByTestId("transactions-skeleton")).toBeNull()
      }

      mockUseLenderMarketAccount.mockReturnValue({
        ...accountResult,
        data: account(LenderRole.DepositAndWithdraw),
        authoritativeAccount: account(LenderRole.DepositAndWithdraw),
      })
      rerender()
      expect(store.getState().lenderMarketRouting.currentSection).toBe(section)
      expect(store.getState().lenderMarketRouting.isLender).toBe(true)
      expect(screen.getByTestId(testId)).not.toBeNull()
      expect(screen.queryByTestId("transactions-skeleton")).toBeNull()
    },
  )

  it("keeps the public page available when another market's account is loading", () => {
    const { rerender } = mountPage()
    expect(screen.getByTestId("market-header")).not.toBeNull()

    const nextMarket = {
      ...market,
      address: "0x4444444444444444444444444444444444444444",
    }
    mockUseGetMarket.mockReturnValue({ ...marketResult, data: nextMarket })
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      data: undefined,
      authoritativeAccount: undefined,
      authoritativeStatus: "resolving",
      isLoadingUpdate: true,
    })
    rerender(nextMarket.address)
    expectAccountLoading()

    mockUseLenderMarketAccount.mockReturnValue(accountResult)
    rerender(nextMarket.address)
    expect(screen.getByTestId("market-header")).not.toBeNull()
    expect(screen.queryByTestId("header-skeleton")).toBeNull()
  })

  it("preserves the mobile page's existing loading behavior", () => {
    mockMobile = true
    mockUseLenderMarketAccount.mockReturnValue({
      ...accountResult,
      data: undefined,
      authoritativeAccount: undefined,
      authoritativeStatus: "resolving",
      isLoadingUpdate: true,
    })
    const { store } = mountPage()
    expect(screen.getByTestId("market-header")).not.toBeNull()
    expect(screen.queryByTestId("header-skeleton")).toBeNull()
    expect(store.getState().lenderMarketRouting.isLoading).toBe(false)
  })
})
