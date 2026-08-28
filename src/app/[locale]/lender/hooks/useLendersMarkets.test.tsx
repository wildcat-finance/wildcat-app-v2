/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type {
  Market,
  MarketAccount,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"

import {
  LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
  LENDER_DASHBOARD_LIVE_REFRESH_INTERVAL,
  useLendersMarkets,
} from "./useLendersMarkets"

const getLenderAccountsForAllMarketsMock = jest.fn()
const hasDeploymentAddressMock = jest.fn()
const getLensContractMock = jest.fn()
const refreshMarketAccountsV2LiveDataSafeMock = jest.fn()
const useCurrentNetworkMock = jest.fn()
const useEthersProviderMock = jest.fn()
const useSubgraphClientMock = jest.fn()
const loggerDebugMock = jest.fn()

const actualSdk = jest.requireActual(
  "@wildcatfi/wildcat-sdk",
) as typeof import("@wildcatfi/wildcat-sdk")

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getLenderAccountsForAllMarkets: (...args: unknown[]) =>
    getLenderAccountsForAllMarketsMock(...args),
  hasDeploymentAddress: (...args: unknown[]) =>
    hasDeploymentAddressMock(...args),
  getLensContract: (...args: unknown[]) => getLensContractMock(...args),
  logger: {
    debug: (...args: unknown[]) => loggerDebugMock(...args),
  },
}))

jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => useCurrentNetworkMock(),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => useEthersProviderMock(),
}))

jest.mock("@/providers/SubgraphProvider", () => ({
  useSubgraphClient: () => useSubgraphClientMock(),
}))

jest.mock("../../../../utils/marketV2Reads", () => ({
  refreshMarketAccountsV2LiveDataSafe: (...args: unknown[]) =>
    refreshMarketAccountsV2LiveDataSafeMock(...args),
}))

const SEPOLIA_CHAIN_ID = 11155111
const MARKET_ADDRESS = "0x1111111111111111111111111111111111111111"
const UNDERLYING_ADDRESS = "0x2222222222222222222222222222222222222222"
const LENDER_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const LENDER_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

const publicProvider = {
  call: jest.fn(),
} as unknown as SignerOrProvider
const liveProvider = {
  call: jest.fn(),
} as unknown as SignerOrProvider

type TestMarketAccount = MarketAccount & {
  generation: string
}

const asTestAccount = (account: MarketAccount): TestMarketAccount =>
  account as TestMarketAccount

const createIndexedAccount = (
  lender: string,
  generation: string,
): TestMarketAccount => {
  const marketToken = new actualSdk.Token(
    SEPOLIA_CHAIN_ID,
    MARKET_ADDRESS,
    "Wildcat Market",
    "wmTKN",
    18,
    false,
    publicProvider,
  )
  const underlyingToken = new actualSdk.Token(
    SEPOLIA_CHAIN_ID,
    UNDERLYING_ADDRESS,
    "Test Token",
    "TKN",
    18,
    true,
    publicProvider,
  )
  const market = Object.assign(Object.create(actualSdk.Market.prototype), {
    _provider: publicProvider,
    chainId: SEPOLIA_CHAIN_ID,
    address: MARKET_ADDRESS,
    version: actualSdk.MarketVersion.V2,
    borrower: "0x3333333333333333333333333333333333333333",
    marketToken,
    underlyingToken,
    deployedEvent: { blockNumber: 1 },
    stateSource: "indexed",
  }) as Market

  return Object.assign(Object.create(actualSdk.MarketAccount.prototype), {
    account: lender,
    market,
    role: actualSdk.LenderRole.Null,
    stateSource: "indexed",
    generation,
  }) as TestMarketAccount
}

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const createWrapper =
  (queryClient = createQueryClient()) =>
  ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

describe("useLendersMarkets", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasDeploymentAddressMock.mockReturnValue(false)
    useCurrentNetworkMock.mockReturnValue({
      chainId: SEPOLIA_CHAIN_ID,
      targetChainId: SEPOLIA_CHAIN_ID,
    })
    useEthersProviderMock.mockReturnValue({
      address: LENDER_A,
      provider: liveProvider,
      signer: undefined,
      isWrongNetwork: false,
    })
    useSubgraphClientMock.mockReturnValue({ chainId: SEPOLIA_CHAIN_ID })
  })

  it("exposes indexed rows while live hydration is still pending", async () => {
    const indexed = createIndexedAccount(LENDER_A, "indexed-1")
    const liveGate = createDeferred<void>()
    getLenderAccountsForAllMarketsMock.mockResolvedValue([indexed])
    refreshMarketAccountsV2LiveDataSafeMock.mockImplementation(
      async (_chainId, _provider, _lender, accounts: TestMarketAccount[]) => {
        await liveGate.promise
        accounts[0].stateSource = "live"
        accounts[0].generation = "live-1"
        return accounts
      },
    )

    const { result } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data).toEqual([indexed]))
    await waitFor(() =>
      expect(refreshMarketAccountsV2LiveDataSafeMock).toHaveBeenCalledTimes(1),
    )

    expect(result.current.isLoadingInitial).toBe(false)
    expect(result.current.isLoadingUpdate).toBe(true)
    expect(result.current.hasLiveData).toBe(false)

    const [, providerForLiveRefresh, lenderForLiveRefresh, [liveAccount]] =
      refreshMarketAccountsV2LiveDataSafeMock.mock.calls[0]
    expect(providerForLiveRefresh).toBe(liveProvider)
    expect(lenderForLiveRefresh).toBe(LENDER_A)
    expect(liveAccount).not.toBe(indexed)
    expect(liveAccount.market).not.toBe(indexed.market)
    expect(liveAccount.market.marketToken).not.toBe(indexed.market.marketToken)
    expect(liveAccount.market.underlyingToken).not.toBe(
      indexed.market.underlyingToken,
    )
    expect(liveAccount.market.provider).toBe(liveProvider)
    expect(indexed.market.provider).toBe(publicProvider)

    await act(async () => liveGate.resolve())

    await waitFor(() =>
      expect(asTestAccount(result.current.data[0]).generation).toBe("live-1"),
    )
    expect(result.current.data[0]).toBe(liveAccount)
    expect(result.current.hasLiveData).toBe(true)
    expect(indexed.stateSource).toBe("indexed")
    expect(indexed.generation).toBe("indexed-1")
    expect(indexed.market.provider).toBe(publicProvider)
  })

  it("hydrates every successful indexed generation at one-minute cadences", async () => {
    const first = createIndexedAccount(LENDER_A, "indexed-1")
    const second = createIndexedAccount(LENDER_A, "indexed-2")
    const queryClient = createQueryClient()
    getLenderAccountsForAllMarketsMock
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([second])
    refreshMarketAccountsV2LiveDataSafeMock.mockImplementation(
      async (_chainId, _provider, _lender, accounts: TestMarketAccount[]) => {
        accounts[0].stateSource = "live"
        accounts[0].generation = accounts[0].generation.replace(
          "indexed",
          "live",
        )
        return accounts
      },
    )

    const { result } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() =>
      expect(asTestAccount(result.current.data[0]).generation).toBe("live-1"),
    )

    const initialQuery = queryClient.getQueryCache().find({
      queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(
        SEPOLIA_CHAIN_ID,
        LENDER_A,
      ),
      exact: true,
    })
    const liveQuery = queryClient
      .getQueryCache()
      .findAll({
        queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.PREFIX(
          SEPOLIA_CHAIN_ID,
          LENDER_A,
        ),
      })
      .find((query) => query.queryKey.includes("update"))

    const initialQueryOptions = initialQuery?.options as
      | { refetchInterval?: unknown }
      | undefined
    const liveQueryOptions = liveQuery?.options as
      | { refetchInterval?: unknown }
      | undefined

    expect(initialQueryOptions?.refetchInterval).toBe(
      LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
    )
    expect(liveQueryOptions?.refetchInterval).toBe(
      LENDER_DASHBOARD_LIVE_REFRESH_INTERVAL,
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 2)
    })
    await act(async () => {
      await result.current.refetchInitial()
    })

    await waitFor(() =>
      expect(refreshMarketAccountsV2LiveDataSafeMock).toHaveBeenCalledTimes(2),
    )
    await waitFor(() =>
      expect(asTestAccount(result.current.data[0]).generation).toBe("live-2"),
    )

    const secondLiveAccount =
      refreshMarketAccountsV2LiveDataSafeMock.mock.calls[1][3][0]
    expect(secondLiveAccount).not.toBe(second)
    expect(secondLiveAccount.generation).toBe("live-2")
    expect(first.generation).toBe("indexed-1")
    expect(second.generation).toBe("indexed-2")
  })

  it("keeps the last live generation visible while new indexed data hydrates", async () => {
    const first = createIndexedAccount(LENDER_A, "indexed-1")
    const second = createIndexedAccount(LENDER_A, "indexed-2")
    const secondLiveGate = createDeferred<void>()

    getLenderAccountsForAllMarketsMock
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([second])
    refreshMarketAccountsV2LiveDataSafeMock.mockImplementation(
      async (_chainId, _provider, _lender, accounts: TestMarketAccount[]) => {
        if (accounts[0].generation === "indexed-2") {
          await secondLiveGate.promise
        }
        accounts[0].stateSource = "live"
        accounts[0].generation = accounts[0].generation.replace(
          "indexed",
          "live",
        )
        return accounts
      },
    )

    const { result } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(),
    })

    await waitFor(() =>
      expect(asTestAccount(result.current.data[0]).generation).toBe("live-1"),
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 2)
    })
    await act(async () => {
      await result.current.refetchInitial()
    })

    await waitFor(() =>
      expect(refreshMarketAccountsV2LiveDataSafeMock).toHaveBeenCalledTimes(2),
    )
    expect(asTestAccount(result.current.data[0]).generation).toBe("live-1")

    await act(async () => secondLiveGate.resolve())
    await waitFor(() =>
      expect(asTestAccount(result.current.data[0]).generation).toBe("live-2"),
    )
  })

  it("refreshes an invalidated inactive overview when it remounts", async () => {
    const first = createIndexedAccount(LENDER_A, "indexed-1")
    const second = createIndexedAccount(LENDER_A, "indexed-2")
    const queryClient = createQueryClient()

    getLenderAccountsForAllMarketsMock
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([second])
    refreshMarketAccountsV2LiveDataSafeMock.mockImplementation(
      async (_chainId, _provider, _lender, accounts: TestMarketAccount[]) => {
        const isTerminated = accounts[0].generation === "indexed-2"
        accounts[0].stateSource = "live"
        accounts[0].generation = accounts[0].generation.replace(
          "indexed",
          "live",
        )
        accounts[0].market.isClosed = isTerminated
        return accounts
      },
    )

    const firstView = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() =>
      expect(asTestAccount(firstView.result.current.data[0]).generation).toBe(
        "live-1",
      ),
    )
    expect(firstView.result.current.data[0].market.isClosed).toBe(false)
    firstView.unmount()

    await queryClient.invalidateQueries({
      queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.PREFIX(SEPOLIA_CHAIN_ID),
      refetchType: "none",
    })

    const secondView = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() =>
      expect(asTestAccount(secondView.result.current.data[0]).generation).toBe(
        "live-2",
      ),
    )
    expect(secondView.result.current.data[0].market.isClosed).toBe(true)
    expect(getLenderAccountsForAllMarketsMock).toHaveBeenCalledTimes(2)
  })

  it("keeps the last live generation when new indexed data fails to hydrate", async () => {
    const first = createIndexedAccount(LENDER_A, "indexed-1")
    const second = createIndexedAccount(LENDER_A, "indexed-2")

    getLenderAccountsForAllMarketsMock
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([second])
    refreshMarketAccountsV2LiveDataSafeMock
      .mockImplementationOnce(
        async (_chainId, _provider, _lender, accounts: TestMarketAccount[]) => {
          accounts[0].stateSource = "live"
          accounts[0].generation = "live-1"
          return accounts
        },
      )
      .mockRejectedValueOnce(new Error("RPC unavailable"))

    const { result } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(),
    })

    await waitFor(() =>
      expect(asTestAccount(result.current.data[0]).generation).toBe("live-1"),
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 2)
    })
    await act(async () => {
      await result.current.refetchInitial()
    })

    await waitFor(() => expect(result.current.isErrorUpdate).toBe(true))
    expect(asTestAccount(result.current.data[0]).generation).toBe("live-1")
    expect(result.current.hasLiveData).toBe(true)
  })

  it("keeps indexed rows visible when live hydration fails", async () => {
    const indexed = createIndexedAccount(LENDER_A, "indexed-1")
    getLenderAccountsForAllMarketsMock.mockResolvedValue([indexed])
    refreshMarketAccountsV2LiveDataSafeMock.mockRejectedValue(
      new Error("RPC unavailable"),
    )

    const { result } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isErrorUpdate).toBe(true))
    expect(result.current.errorUpdate).toEqual(
      expect.objectContaining({ message: "RPC unavailable" }),
    )
    expect(result.current.data).toEqual([indexed])
    expect(result.current.isLoadingInitial).toBe(false)
    expect(result.current.hasLiveData).toBe(false)
  })

  it("derives indexed onboarding from provider indexes, not a bad pull-provider boolean", async () => {
    const indexed = createIndexedAccount(LENDER_A, "indexed-1")
    Object.assign(indexed.market, {
      hooksConfig: {
        kind: actualSdk.HooksKind.OpenTerm,
        hooksAddress: "0x4444444444444444444444444444444444444444",
        depositRequiresAccess: true,
        flags: { useOnDeposit: true },
      },
      roleProviders: [
        {
          isApproved: true,
          isPullProvider: true,
          pullProviderIndex: -1,
        },
      ],
    })
    getLenderAccountsForAllMarketsMock.mockResolvedValue([indexed])
    refreshMarketAccountsV2LiveDataSafeMock.mockResolvedValue([indexed])

    const { result } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.onboardingStatus).toBe("ready"))
    expect(result.current.onboardingByMarket[MARKET_ADDRESS]).toBe(
      actualSdk.MarketOnboardingMode.Managed,
    )
  })

  it("retains the last live snapshot when a background refresh fails", async () => {
    const indexed = createIndexedAccount(LENDER_A, "indexed-1")
    getLenderAccountsForAllMarketsMock.mockResolvedValue([indexed])
    refreshMarketAccountsV2LiveDataSafeMock
      .mockImplementationOnce(
        async (_chainId, _provider, _lender, accounts: TestMarketAccount[]) => {
          accounts[0].stateSource = "live"
          accounts[0].generation = "live-1"
          return accounts
        },
      )
      .mockRejectedValueOnce(new Error("RPC unavailable"))

    const { result } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(),
    })

    await waitFor(() =>
      expect(asTestAccount(result.current.data[0]).generation).toBe("live-1"),
    )

    await act(async () => {
      await result.current.refetchUpdate()
    })

    await waitFor(() => expect(result.current.isErrorUpdate).toBe(true))
    expect(asTestAccount(result.current.data[0]).generation).toBe("live-1")
    expect(result.current.hasLiveData).toBe(true)
  })

  it("does not expose a previous lender's live row during an identity change", async () => {
    const indexedA = createIndexedAccount(LENDER_A, "indexed-a")
    const indexedB = createIndexedAccount(LENDER_B, "indexed-b")
    const liveBGate = createDeferred<void>()
    let lender = LENDER_A

    useEthersProviderMock.mockImplementation(() => ({
      address: lender,
      provider: liveProvider,
      signer: undefined,
      isWrongNetwork: false,
    }))
    getLenderAccountsForAllMarketsMock.mockImplementation(
      (_client: unknown, options: { lender: string }) =>
        Promise.resolve([options.lender === LENDER_A ? indexedA : indexedB]),
    )
    refreshMarketAccountsV2LiveDataSafeMock.mockImplementation(
      async (
        _chainId,
        _provider,
        currentLender: string,
        accounts: TestMarketAccount[],
      ) => {
        if (currentLender === LENDER_B) await liveBGate.promise
        accounts[0].stateSource = "live"
        return accounts
      },
    )

    const { result, rerender } = renderHook(() => useLendersMarkets(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data[0].stateSource).toBe("live"))
    expect(result.current.data[0].account).toBe(LENDER_A)
    expect(result.current.hasLiveData).toBe(true)

    lender = LENDER_B
    rerender()

    await waitFor(() => expect(result.current.data[0]).toBe(indexedB))
    expect(result.current.data[0].account).toBe(LENDER_B)
    expect(result.current.data[0].stateSource).toBe("indexed")
    expect(result.current.hasLiveData).toBe(false)

    await act(async () => liveBGate.resolve())
    await waitFor(() => expect(result.current.data[0].stateSource).toBe("live"))
    expect(result.current.data[0].account).toBe(LENDER_B)
    expect(result.current.hasLiveData).toBe(true)
  })
})
