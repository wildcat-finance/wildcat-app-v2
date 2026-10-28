/* eslint-disable import/no-extraneous-dependencies */
import { configureStore } from "@reduxjs/toolkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import {
  getLenderAccountForMarket,
  getLensV2Contract,
  HooksKind,
  Market,
  MarketAccount,
  MarketVersion,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { constants, providers } from "ethers"
import { Provider } from "react-redux"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useWagmiHydrated } from "@/hooks/useWagmiHydrated"
import { useWrapperBalances } from "@/hooks/wrapper/useWrapperBalances"
import hideMarketSections from "@/store/slices/hideMarketSectionsSlice/hideMarketSectionsSlice"
import lenderMarketRouting, {
  LenderMarketSections,
  setSection,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import wrapDebtTokenFlow from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"

import { useGetLenderWithdrawals } from "./hooks/useGetLenderWithdrawals"
import LenderMarketDetails from "./page"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getSubgraphClient: jest.fn(() => ({})),
  getLenderAccountForMarket: jest.fn(),
  getLensV2Contract: jest.fn(),
}))
jest.mock("@/hooks/useWagmiHydrated", () => ({ useWagmiHydrated: jest.fn() }))
jest.mock("@/hooks/wrapper/useWrapperBalances", () => ({
  useWrapperBalances: jest.fn(),
}))
jest.mock("wagmi", () => ({ useAccount: jest.fn() }))
jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}))
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("chainId=1"),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/hooks/useEthersSigner", () => ({ useEthersProvider: jest.fn() }))
jest.mock("@/hooks/useGetMarket", () => ({ useGetMarket: jest.fn() }))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: jest.fn(),
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
}))
jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => ({
    isWrongNetwork: false,
    isSelectionMismatch: false,
    selectedChainId: 1,
  }),
}))
jest.mock("@/hooks/useMarketSummary", () => ({
  useMarketSummary: () => ({}),
}))
jest.mock("@/hooks/useMarketMla", () => ({ useMarketMla: () => ({}) }))
jest.mock("@/hooks/wrapper/useWrapperForMarket", () => ({
  useWrapperForMarket: () => ({}),
}))
jest.mock("./hooks/useBorrowerPenaltyWarning", () => ({
  useBorrowerPenaltyWarning: () => ({ shouldWarn: false }),
}))
jest.mock("./hooks/useGetLenderWithdrawals", () => ({
  useGetLenderWithdrawals: jest.fn(),
}))
jest.mock("@/components/Footer", () => ({ Footer: () => null }))
jest.mock("@/components/Header/HeaderButton/ConnectWalletDialog", () => ({
  ConnectWalletDialog: () => null,
}))
jest.mock("@/components/LeadBanner", () => ({
  LeadBanner: ({ title }: { title: string }) => <div>{title}</div>,
}))
jest.mock("./components/mobile/MobileLenderBanner", () => ({
  MobileLenderBanner: ({ title }: { title: string }) => <div>{title}</div>,
}))
jest.mock("@/components/MarketHeader", () => ({
  MarketHeader: ({ isLiveMarketReady }: { isLiveMarketReady: boolean }) => (
    <div data-live={isLiveMarketReady}>Market header</div>
  ),
}))
jest.mock("@/components/MarketParameters", () => ({
  MarketParameters: () => null,
}))
jest.mock("@/components/MobileConnectWallet", () => ({
  MobileConnectWallet: () => null,
}))
jest.mock("@/components/PaginatedMarketRecordsTable", () => ({
  PaginatedMarketRecordsTable: () => null,
}))
jest.mock("@/components/Profile/ProfileSection", () => ({
  ProfileSection: () => null,
}))
jest.mock("./components/MarketActions", () => ({
  MarketActions: ({ isLiveMarketReady }: { isLiveMarketReady: boolean }) => (
    <div data-live={isLiveMarketReady}>Account actions</div>
  ),
}))
jest.mock("./components/mobile/MobileMarketActions", () => ({
  MobileMarketActions: ({
    isLiveMarketReady,
  }: {
    isLiveMarketReady: boolean
  }) => <div data-live={isLiveMarketReady}>Account actions</div>,
}))
jest.mock("./components/BarCharts", () => ({ BarCharts: () => null }))
jest.mock("./components/BarCharts/CapacityBarChart", () => ({
  CapacityBarChart: () => null,
}))
jest.mock("./components/MarketSummary", () => ({ MarketSummary: () => null }))
jest.mock("./components/WrapDebtToken", () => ({ WrapDebtToken: () => null }))
jest.mock("./components/BorrowerPenaltyWarning", () => ({
  BorrowerPenaltyWarning: () => null,
}))
jest.mock("./components/SwitchChainAlert", () => ({
  SwitchChainAlert: () => null,
}))
jest.mock("./components/WithdrawalRequests", () => ({
  WithdrawalRequests: () => null,
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
jest.mock("./components/Modals/MobileMarketDescriptionModal", () => ({
  MobileMarketDescriptionModal: () => null,
}))
jest.mock("./components/Modals/MobileMarketHistoryModal", () => ({
  MobileMarketHistoryModal: () => null,
}))
jest.mock("./components/Modals/NonMlaAcknowledgementModal", () => ({
  NonMlaAcknowledgementModal: () => null,
}))

type LiveResponse = Awaited<
  ReturnType<
    ReturnType<typeof getLensV2Contract>["getMarketDataWithLenderStatus"]
  >
>

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const wallet = "0x0000000000000000000000000000000000000001"
const marketAddress = "0x0000000000000000000000000000000000000002"
const provider = {} as providers.Provider
const readLive = jest.fn<Promise<LiveResponse>, [string, string]>()
const liveResponse = (authorized: boolean) =>
  ({
    market: {},
    lenderStatus: {
      canRefresh: false,
      isBlockedFromDeposits: false,
      lastApprovalTimestamp: authorized ? Math.floor(Date.now() / 1000) : 0,
      lastProvider: {
        providerAddress: wallet,
        pullProviderIndex: 0,
        pushProviderIndex: 0,
        timeToLive: 86400,
      },
      isKnownLender: false,
      scaledBalance: constants.Zero,
      normalizedBalance: constants.Zero,
      underlyingBalance: constants.Zero,
      underlyingApproval: constants.Zero,
    },
  }) as unknown as LiveResponse

describe("lender market authorization loading", () => {
  let client: QueryClient
  let market: Market
  let live: ReturnType<typeof deferred<LiveResponse>>

  const setWallet = (address: string | undefined) => {
    jest.mocked(useAccount).mockReturnValue({
      address,
      isConnected: !!address,
    } as ReturnType<typeof useAccount>)
  }
  const setMarket = (value: Market, liveReady = true) => {
    market = value
    jest.mocked(useGetMarket).mockReturnValue({
      data: liveReady ? market : undefined,
      indexedMarket: market,
      apiLoading: false,
      isDiscoveringChainId: false,
    } as ReturnType<typeof useGetMarket>)
  }
  const mountPage = () => {
    const store = configureStore({
      reducer: { lenderMarketRouting, wrapDebtTokenFlow, hideMarketSections },
    })
    const tree = () => (
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <LenderMarketDetails params={{ address: market.address }} />
        </QueryClientProvider>
      </Provider>
    )
    const view = render(tree())
    return {
      store,
      rerender: () => view.rerender(tree()),
      routing: () => store.getState().lenderMarketRouting,
    }
  }
  const expectNoInvitation = () => {
    expect(screen.queryByText("Lend through Wildcat")).toBeNull()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useWagmiHydrated).mockReturnValue(true)
    jest
      .mocked(useWrapperBalances)
      .mockReturnValue({ isLoading: false } as ReturnType<
        typeof useWrapperBalances
      >)
    jest
      .mocked(useGetLenderWithdrawals)
      .mockReturnValue({ data: {}, isLoadingInitial: false } as ReturnType<
        typeof useGetLenderWithdrawals
      >)
    jest
      .spyOn(MarketAccount, "getMarketAccountV2")
      .mockImplementation(
        async (_chain, _provider, accountAddress, address) => {
          const currentMarket = market
          const response = await readLive(accountAddress, address as string)
          const account = MarketAccount.fromMarketDataOnly(
            currentMarket,
            accountAddress,
            false,
          )
          account.updateWith(response.lenderStatus)
          return account
        },
      )
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    })
    live = deferred<LiveResponse>()
    readLive.mockReset().mockReturnValue(live.promise)
    jest.mocked(getLensV2Contract).mockReturnValue({
      getMarketDataWithLenderStatus: readLive,
    } as unknown as ReturnType<typeof getLensV2Contract>)
    jest
      .mocked(getLenderAccountForMarket)
      .mockImplementation(async (_client, args) =>
        MarketAccount.fromMarketDataOnly(
          args.market as Market,
          args.lender,
          false,
        ),
      )
    // The wallet client has not loaded; public reads must still use the wallet.
    jest.mocked(useEthersProvider).mockReturnValue({
      provider,
      targetChainId: 1,
    })
    jest.mocked(useMobileResolution).mockReturnValue(false)
    setWallet(wallet)
    const token = new Token(1, wallet, "Test USD", "USDC", 6, false, provider)
    setMarket({
      address: marketAddress,
      borrower: wallet,
      chainId: 1,
      version: MarketVersion.V2,
      provider,
      isClosed: false,
      isInFixedTerm: false,
      hooksConfig: {
        kind: HooksKind.OpenTerm,
        depositRequiresAccess: true,
        flags: { useOnDeposit: true, useOnQueueWithdrawal: true },
      },
      underlyingToken: token,
      marketToken: token,
      updateWith: jest.fn(),
    } as unknown as Market)
  })

  afterEach(() => {
    cleanup()
    client.clear()
  })

  it.each([false, true])(
    "waits for live permissions without flashing the invitation (mobile: %s)",
    async (isMobile) => {
      jest.mocked(useMobileResolution).mockReturnValue(isMobile)
      const { routing } = mountPage()
      await waitFor(() =>
        expect(readLive).toHaveBeenCalledWith(wallet, marketAddress),
      )
      expect(getLenderAccountForMarket).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lender: wallet }),
      )
      expect(screen.getByText("Market header")).toBeTruthy()
      expect(screen.queryByText("Account actions")).toBeNull()
      expectNoInvitation()
      expect(routing()).toMatchObject({
        isLoading: false,
        currentSection: LenderMarketSections.TRANSACTIONS,
      })

      await act(async () => live.resolve(liveResponse(true)))
      await waitFor(() =>
        expect(screen.getByText("Account actions")).toBeTruthy(),
      )
      expectNoInvitation()
      expect(routing()).toMatchObject({ isLoading: false, isLender: true })
    },
  )

  it("shows the invitation only after a live denial", async () => {
    const { routing } = mountPage()
    await waitFor(() => expect(readLive).toHaveBeenCalledTimes(1))
    expectNoInvitation()
    await act(async () => live.resolve(liveResponse(false)))
    await waitFor(() =>
      expect(screen.getByText("Lend through Wildcat")).toBeTruthy(),
    )
    expect(routing()).toMatchObject({
      isLoading: false,
      isLender: false,
      currentSection: LenderMarketSections.STATUS,
    })
  })

  it("does not interpret a disabled account query as a denial", () => {
    jest.mocked(useEthersProvider).mockReturnValue({ targetChainId: 1 })
    const { routing } = mountPage()
    expectNoInvitation()
    expect(routing().isLoading).toBe(false)
    expect(getLenderAccountForMarket).not.toHaveBeenCalled()
    expect(readLive).not.toHaveBeenCalled()
  })

  it.each(["indexed", "live"])(
    "does not interpret a failed %s read as a denial",
    async (phase) => {
      if (phase === "indexed") {
        jest
          .mocked(getLenderAccountForMarket)
          .mockRejectedValue(new Error("Offline"))
      }
      const { routing } = mountPage()
      if (phase === "live") {
        await waitFor(() => expect(readLive).toHaveBeenCalledTimes(1))
        await act(async () => live.reject(new Error("Offline")))
      }
      await waitFor(() => {
        expect(
          client
            .getQueryCache()
            .getAll()
            .some((q) => q.state.status === "error"),
        ).toBe(true)
      })
      expectNoInvitation()
      expect(routing().isLoading).toBe(false)
    },
  )

  it("keeps resolved permissions and the selected section during refresh and a refresh error", async () => {
    readLive.mockResolvedValueOnce(liveResponse(true))
    const { store, routing, rerender } = mountPage()
    await waitFor(() => expect(routing().isLender).toBe(true))
    act(() => store.dispatch(setSection(LenderMarketSections.MARKET_HISTORY)))
    rerender()

    await act(async () => {
      await client.refetchQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.INITIAL(
          1,
          marketAddress,
          wallet,
        ),
      })
    })
    let refreshing: Promise<void>
    act(() => {
      refreshing = client.refetchQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.UPDATE(
          1,
          marketAddress,
          wallet,
        ),
      })
    })
    await waitFor(() => expect(readLive).toHaveBeenCalledTimes(2))
    expectNoInvitation()
    expect(routing()).toMatchObject({
      isLoading: false,
      isLender: true,
      currentSection: LenderMarketSections.MARKET_HISTORY,
    })
    await act(async () => {
      live.reject(new Error("Offline"))
      await refreshing
    })
    expectNoInvitation()
    expect(routing()).toMatchObject({
      isLoading: false,
      isLender: true,
      currentSection: LenderMarketSections.MARKET_HISTORY,
    })
  })

  it("applies a confirmed permission change after a background read", async () => {
    readLive.mockResolvedValueOnce(liveResponse(true))
    const { routing } = mountPage()
    await waitFor(() => expect(routing().isLender).toBe(true))
    readLive.mockResolvedValueOnce(liveResponse(false))
    await act(async () => {
      await client.refetchQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.UPDATE(
          1,
          marketAddress,
          wallet,
        ),
      })
    })
    await waitFor(() =>
      expect(screen.getByText("Lend through Wildcat")).toBeTruthy(),
    )
    expect(routing()).toMatchObject({ isLoading: false, isLender: false })
  })

  it.each(["wallet", "market", "chain"])(
    "does not reuse another %s's live permissions",
    async (identity) => {
      readLive.mockResolvedValueOnce(liveResponse(true))
      const { routing, rerender } = mountPage()
      await waitFor(() => expect(routing().isLender).toBe(true))
      if (identity === "wallet")
        setWallet("0x0000000000000000000000000000000000000003")
      if (identity === "market")
        setMarket({
          ...market,
          address: "0x0000000000000000000000000000000000000004",
        } as Market)
      if (identity === "chain")
        setMarket({ ...market, chainId: 11155111 } as Market)
      rerender()
      await waitFor(() => expect(readLive).toHaveBeenCalledTimes(2))
      expectNoInvitation()
      expect(screen.queryByText("Account actions")).toBeNull()
      expect(routing().isLoading).toBe(false)
      await act(async () => live.resolve(liveResponse(false)))
      await waitFor(() =>
        expect(screen.getByText("Lend through Wildcat")).toBeTruthy(),
      )
      expect(routing()).toMatchObject({ isLoading: false, isLender: false })
    },
  )
  it.each([false, true])(
    "shows indexed identity before either account read completes (mobile: %s)",
    async (isMobile) => {
      jest.mocked(useMobileResolution).mockReturnValue(isMobile)
      jest
        .mocked(getLenderAccountForMarket)
        .mockReturnValue(new Promise(() => {}))
      setMarket(market, false)
      const { rerender } = mountPage()
      expect(screen.getByText("Market header").getAttribute("data-live")).toBe(
        "false",
      )
      await waitFor(() => expect(readLive).toHaveBeenCalledTimes(1))
      expectNoInvitation()
      await act(async () => live.resolve(liveResponse(true)))
      await waitFor(() =>
        expect(screen.getByText("Account actions")).toBeTruthy(),
      )
      expect(
        screen.getByText("Account actions").getAttribute("data-live"),
      ).toBe("false")
      setMarket(market)
      rerender()
      expect(
        screen.getByText("Account actions").getAttribute("data-live"),
      ).toBe("true")
    },
  )

  it("resolves access even if indexed account history fails", async () => {
    jest
      .mocked(getLenderAccountForMarket)
      .mockRejectedValue(new Error("Indexer unavailable"))
    mountPage()
    await waitFor(() => expect(readLive).toHaveBeenCalledTimes(1))
    await act(async () => live.resolve(liveResponse(true)))
    await waitFor(() =>
      expect(screen.getByText("Account actions")).toBeTruthy(),
    )
    expectNoInvitation()
  })

  it.each([false, true])(
    "retries a failed live account read (mobile: %s)",
    async (isMobile) => {
      jest.mocked(useMobileResolution).mockReturnValue(isMobile)
      readLive.mockRejectedValueOnce(new Error("RPC unavailable"))
      const { routing } = mountPage()
      await waitFor(() =>
        expect(screen.getByText("Unable to load market access")).toBeTruthy(),
      )
      expect(routing().isLoading).toBe(false)
      expectNoInvitation()
      readLive.mockResolvedValueOnce(liveResponse(true))
      fireEvent.click(screen.getByRole("button", { name: "Retry" }))
      await waitFor(() =>
        expect(screen.getByText("Account actions")).toBeTruthy(),
      )
      expect(screen.queryByText("Unable to load market access")).toBeNull()
    },
  )

  it.each(["hydrating", "connecting", "reconnecting"])(
    "suppresses banners while %s",
    async (phase) => {
      setWallet(undefined)
      if (phase === "hydrating")
        jest.mocked(useWagmiHydrated).mockReturnValue(false)
      else
        jest.mocked(useAccount).mockReturnValue({
          isConnected: false,
          isConnecting: phase === "connecting",
          isReconnecting: phase === "reconnecting",
        } as ReturnType<typeof useAccount>)
      const { rerender } = mountPage()
      expect(screen.getByText("Market header")).toBeTruthy()
      expect(screen.queryByText("Connect Your Wallet")).toBeNull()
      expectNoInvitation()
      jest.mocked(useWagmiHydrated).mockReturnValue(true)
      setWallet(undefined)
      rerender()
      expect(screen.getByText("Connect Your Wallet")).toBeTruthy()
    },
  )

  it("preserves a section selected before access resolves", async () => {
    const { store, routing } = mountPage()
    act(() => store.dispatch(setSection(LenderMarketSections.MARKET_HISTORY)))
    await act(async () => live.resolve(liveResponse(false)))
    await waitFor(() =>
      expect(screen.getByText("Lend through Wildcat")).toBeTruthy(),
    )
    expect(routing().currentSection).toBe(LenderMarketSections.MARKET_HISTORY)
  })

  it("shows blocked access separately from an invitation", async () => {
    const response = liveResponse(false)
    response.lenderStatus.isBlockedFromDeposits = true
    readLive.mockResolvedValueOnce(response)
    mountPage()
    await waitFor(() =>
      expect(
        screen.getByText("This wallet is blocked from deposits"),
      ).toBeTruthy(),
    )
    expectNoInvitation()
  })

  it.each(["raw", "wrapped", "withdrawal"])(
    "keeps an existing %s position out of the acquisition banner",
    async (kind) => {
      const response = liveResponse(false)
      if (kind === "raw")
        response.lenderStatus.normalizedBalance = constants.One
      if (kind === "wrapped")
        jest.mocked(useWrapperBalances).mockReturnValue({
          data: { shareBalance: market.underlyingToken.getAmount(1) },
        } as ReturnType<typeof useWrapperBalances>)
      if (kind === "withdrawal")
        jest.mocked(useGetLenderWithdrawals).mockReturnValue({
          data: { activeWithdrawal: { requests: [] } },
          isLoadingInitial: false,
        } as unknown as ReturnType<typeof useGetLenderWithdrawals>)
      readLive.mockResolvedValueOnce(response)
      const { routing } = mountPage()
      await waitFor(() => expect(routing().isLender).toBe(true))
      expectNoInvitation()
      await waitFor(() =>
        expect(screen.getByText("Account actions")).toBeTruthy(),
      )
    },
  )

  it("does not show an invitation until withdrawal activity is known", async () => {
    jest
      .mocked(useGetLenderWithdrawals)
      .mockReturnValue({ data: {}, isLoadingInitial: true } as ReturnType<
        typeof useGetLenderWithdrawals
      >)
    readLive.mockResolvedValueOnce(liveResponse(false))
    const { rerender } = mountPage()
    await waitFor(() => expect(readLive).toHaveBeenCalledTimes(1))
    expectNoInvitation()
    jest
      .mocked(useGetLenderWithdrawals)
      .mockReturnValue({ data: {}, isLoadingInitial: false } as ReturnType<
        typeof useGetLenderWithdrawals
      >)
    rerender()
    await waitFor(() =>
      expect(screen.getByText("Lend through Wildcat")).toBeTruthy(),
    )
  })
  it.each([false, true])(
    "keeps indexed permissions out of transaction controls after an RPC failure (mobile: %s)",
    async (isMobile) => {
      jest.mocked(useMobileResolution).mockReturnValue(isMobile)
      jest.mocked(useGetLenderWithdrawals).mockReturnValue({
        data: { activeWithdrawal: { requests: [] } },
        isLoadingInitial: false,
      } as unknown as ReturnType<typeof useGetLenderWithdrawals>)
      readLive.mockRejectedValueOnce(new Error("RPC unavailable"))
      mountPage()
      await waitFor(() =>
        expect(screen.getByText("Unable to load market access")).toBeTruthy(),
      )
      expectNoInvitation()
      expect(screen.queryByText("Account actions")).toBeNull()
    },
  )
})
