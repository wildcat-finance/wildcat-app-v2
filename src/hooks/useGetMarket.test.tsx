/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { Market, SignerOrProvider } from "@wildcatfi/wildcat-sdk"

import { useEthersProvider } from "@/hooks/useEthersSigner"

import {
  MARKET_DETAIL_INITIAL_RETRY_INTERVAL,
  MARKET_DETAIL_MAX_RETRY_INTERVAL,
  MarketDetailUnavailableError,
  getMarketDetailRetryInterval,
  useGetMarket,
} from "./useGetMarket"
import { refreshMarketsV2LiveDataSafe } from "../utils/marketV2Reads"

const getIndexedMarketMock = jest.fn()
const getSubgraphClientMock = jest.fn((chainId: unknown) => ({
  name: `subgraph-${String(chainId)}`,
}))
const actualSdk = jest.requireActual(
  "@wildcatfi/wildcat-sdk",
) as typeof import("@wildcatfi/wildcat-sdk")

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getIndexedMarket: (...args: unknown[]) => getIndexedMarketMock(...args),
  getSubgraphClient: (chainId: unknown) => getSubgraphClientMock(chainId),
  isSupportedChainId: (chainId: number) => chainId === 11155111,
  MarketVersion: {
    V1: "v1",
    V2: "v2",
  },
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: jest.fn(),
}))

jest.mock("@/hooks/useMarketDetailPerformance", () => ({
  useMarketDetailPerformanceMark: jest.fn(),
}))

jest.mock("../utils/marketV2Reads", () => ({
  refreshMarketsV2LiveDataSafe: jest.fn(),
}))

const useEthersProviderMock = useEthersProvider as jest.MockedFunction<
  typeof useEthersProvider
>
const refreshMarketsV2LiveDataSafeMock =
  refreshMarketsV2LiveDataSafe as jest.MockedFunction<
    typeof refreshMarketsV2LiveDataSafe
  >

const marketAddress = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const publicProvider = { request: jest.fn() }
const liveProvider = { request: jest.fn() }

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const createIndexedMarket = (version: "v1" | "v2" = "v2") => {
  const sdkProvider = publicProvider as unknown as SignerOrProvider
  const marketToken = new actualSdk.Token(
    11155111,
    marketAddress,
    "Wildcat Market",
    "wmTKN",
    18,
    false,
    sdkProvider,
  )
  const underlyingToken = new actualSdk.Token(
    11155111,
    "0x1111111111111111111111111111111111111111",
    "Test Token",
    "TKN",
    18,
    true,
    sdkProvider,
  )

  return Object.assign(Object.create(actualSdk.Market.prototype), {
    _provider: sdkProvider,
    address: marketAddress,
    version,
    marketToken,
    underlyingToken,
    stateSource: "indexed",
  }) as Market
}

describe("useGetMarket", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: fetchMock,
    })
    useEthersProviderMock.mockReturnValue({
      provider: liveProvider,
      signer: undefined,
    } as unknown as ReturnType<typeof useEthersProvider>)
    refreshMarketsV2LiveDataSafeMock.mockImplementation(
      async (_chainId, markets) => {
        const [market] = markets
        market.stateSource = "live"
        return markets
      },
    )
  })

  it("skips discovery for a supported route chain and omits records", async () => {
    const indexedMarket = createIndexedMarket()
    getIndexedMarketMock.mockResolvedValue(indexedMarket)

    const { result } = renderHook(
      () => useGetMarket({ address: marketAddress, chainId: 11155111 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.data).toBeDefined())

    expect(fetchMock).not.toHaveBeenCalled()
    expect(getSubgraphClientMock).toHaveBeenCalledWith(11155111)
    expect(getIndexedMarketMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        chainId: 11155111,
        market: marketAddress,
        shouldSkipRecords: true,
        fetchPolicy: "network-only",
      }),
    )
    expect(refreshMarketsV2LiveDataSafeMock).toHaveBeenCalledTimes(1)

    const [, [marketForLiveRefresh], providerForLiveRefresh] =
      refreshMarketsV2LiveDataSafeMock.mock.calls[0]
    expect(marketForLiveRefresh).not.toBe(indexedMarket)
    expect(marketForLiveRefresh.marketToken).not.toBe(indexedMarket.marketToken)
    expect(marketForLiveRefresh.underlyingToken).not.toBe(
      indexedMarket.underlyingToken,
    )
    expect(marketForLiveRefresh.provider).toBe(liveProvider)
    expect(marketForLiveRefresh.marketToken.provider).toBe(liveProvider)
    expect(marketForLiveRefresh.underlyingToken.provider).toBe(liveProvider)
    expect(providerForLiveRefresh).toBe(liveProvider)
    expect(indexedMarket.provider).toBe(publicProvider)
    expect(indexedMarket.marketToken.provider).toBe(publicProvider)
    expect(indexedMarket.underlyingToken.provider).toBe(publicProvider)
    expect(indexedMarket.stateSource).toBe("indexed")
    expect(result.current.data?.stateSource).toBe("live")
  })

  it("retains cross-chain discovery for a chainless deep link", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        chainId: 11155111,
        market: { id: marketAddress },
      }),
    })
    getIndexedMarketMock.mockResolvedValue(createIndexedMarket())

    const { result } = renderHook(
      () => useGetMarket({ address: marketAddress }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.data).toBeDefined())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `http://localhost/api/market/get?address=${marketAddress}`,
    )
    expect(result.current.discoveredChainId).toBe(11155111)
  })

  it("refreshes historical V1 markets without mutating the indexed cache", async () => {
    const indexedMarket = createIndexedMarket("v1")
    const update = jest.fn(async function updateMarket(this: Market) {
      this.stateSource = "live"
    })
    indexedMarket.update = update
    getIndexedMarketMock.mockResolvedValue(indexedMarket)

    const { result } = renderHook(
      () => useGetMarket({ address: marketAddress, chainId: 11155111 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.data).toBeDefined())

    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.contexts[0]).not.toBe(indexedMarket)
    expect(refreshMarketsV2LiveDataSafeMock).not.toHaveBeenCalled()
    expect(indexedMarket.stateSource).toBe("indexed")
    expect(indexedMarket.provider).toBe(publicProvider)
    expect(result.current.data).not.toBe(indexedMarket)
    expect(result.current.data?.stateSource).toBe("live")
    expect(result.current.data?.provider).toBe(liveProvider)
  })

  it("surfaces unsupported chains without attempting discovery", async () => {
    const { result } = renderHook(
      () => useGetMarket({ address: marketAddress, chainId: 999 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(
      expect.objectContaining({
        name: "MarketDetailUnavailableError",
        message: "Unsupported chain: 999",
      }),
    )
    expect(result.current.isAwaitingMarketData).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(getIndexedMarketMock).not.toHaveBeenCalled()
  })

  it("surfaces a subgraph miss instead of leaving an endless skeleton", async () => {
    getIndexedMarketMock.mockResolvedValue(undefined)

    const { result } = renderHook(
      () => useGetMarket({ address: marketAddress, chainId: 11155111 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(MarketDetailUnavailableError)
    expect(result.current.isAwaitingMarketData).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(getIndexedMarketMock).toHaveBeenCalledTimes(1)
    expect(refreshMarketsV2LiveDataSafeMock).not.toHaveBeenCalled()
  })

  it("automatically recovers when an initially missing market becomes indexed", async () => {
    const indexedMarket = createIndexedMarket()
    getIndexedMarketMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue(indexedMarket)

    const { result } = renderHook(
      () => useGetMarket({ address: marketAddress, chainId: 11155111 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isAwaitingMarketData).toBe(true))
    await waitFor(() => expect(result.current.data).toBeDefined(), {
      timeout: MARKET_DETAIL_INITIAL_RETRY_INTERVAL + 2_000,
    })

    expect(getIndexedMarketMock).toHaveBeenCalledTimes(2)
    expect(result.current.isAwaitingMarketData).toBe(false)
  })

  it("keeps a live-read failure in the auto-recovering state", async () => {
    const indexedMarket = createIndexedMarket()
    getIndexedMarketMock.mockResolvedValue(indexedMarket)
    refreshMarketsV2LiveDataSafeMock.mockRejectedValue(
      new Error("RPC unavailable"),
    )

    const { result } = renderHook(
      () => useGetMarket({ address: marketAddress, chainId: 11155111 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 2_000,
    })

    expect(result.current.error).toEqual(
      expect.objectContaining({ message: "RPC unavailable" }),
    )
    expect(result.current.isAwaitingMarketData).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(refreshMarketsV2LiveDataSafeMock).toHaveBeenCalledTimes(2)
    expect(indexedMarket.stateSource).toBe("indexed")
  })
})

describe("getMarketDetailRetryInterval", () => {
  it.each([
    {
      dataUpdateCount: 0,
      errorUpdateCount: 0,
      expected: MARKET_DETAIL_INITIAL_RETRY_INTERVAL,
    },
    {
      dataUpdateCount: 0,
      errorUpdateCount: 2,
      expected: MARKET_DETAIL_INITIAL_RETRY_INTERVAL * 2,
    },
    {
      dataUpdateCount: 4,
      errorUpdateCount: 0,
      expected: MARKET_DETAIL_INITIAL_RETRY_INTERVAL * 8,
    },
    {
      dataUpdateCount: 100,
      errorUpdateCount: 100,
      expected: MARKET_DETAIL_MAX_RETRY_INTERVAL,
    },
  ])(
    "backs off from $dataUpdateCount successful misses and $errorUpdateCount errors",
    ({ dataUpdateCount, errorUpdateCount, expected }) => {
      expect(
        getMarketDetailRetryInterval({
          dataUpdateCount,
          errorUpdateCount,
        }),
      ).toBe(expected)
    },
  )
})
