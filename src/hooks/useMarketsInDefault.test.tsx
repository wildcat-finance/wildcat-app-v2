/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import {
  getMarketDefaultStatus,
  Market,
  MarketDefaultStatus,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { getAppSubgraphClient } from "@/lib/gateway/client"

import { useMarketsInDefault } from "./useMarketsInDefault"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getMarketDefaultStatus: jest.fn(),
}))
jest.mock("@/lib/gateway/client", () => ({
  getAppSubgraphClient: jest.fn((chainId) => ({ chainId })),
}))

const getStatus = jest.mocked(getMarketDefaultStatus)
const getClient = jest.mocked(getAppSubgraphClient)
const clients: QueryClient[] = []

const market = (id: number, overrides: Partial<Market> = {}): Market =>
  ({
    address: `0x${id.toString(16).padStart(40, "0")}`,
    chainId: 1,
    defaultedAt: undefined,
    lastInterestAccruedTimestamp: 100,
    isClosed: false,
    isDelinquent: false,
    ...overrides,
  }) as Market

const status = (isDefaulted: boolean | undefined): MarketDefaultStatus => ({
  market: market(1).address,
  isDefaulted,
  source: "legacy-history",
})

const deferred = () => {
  let resolve!: (value: MarketDefaultStatus) => void
  const promise = new Promise<MarketDefaultStatus>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  clients.push(client)
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe("useMarketsInDefault", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getStatus.mockReset()
    getStatus.mockResolvedValue(status(false))
  })

  afterEach(() => {
    clients.splice(0).forEach((client) => client.clear())
    jest.useRealTimers()
  })

  it("distinguishes unloaded markets from a confirmed empty list without reads", () => {
    const { result, rerender } = renderHook(
      ({ markets }: { markets: Market[] | undefined }) =>
        useMarketsInDefault(markets, 1),
      {
        wrapper: setup().wrapper,
        initialProps: { markets: undefined as Market[] | undefined },
      },
    )
    expect(result.current).toBeUndefined()
    rerender({ markets: [] })
    expect(result.current).toBe(0)
    expect(getStatus).not.toHaveBeenCalled()
    expect(getClient).not.toHaveBeenCalled()
  })

  it("counts SDK results across recorded and legacy markets, including closed markets", async () => {
    const markets = [
      market(1, { defaultedAt: 0, timeDelinquent: 365 * 86_400 }),
      market(2, { defaultedAt: 50, isClosed: true }),
      market(3, { isClosed: true, timeDelinquent: 0 }),
    ]
    getStatus.mockImplementation(async (_client, { market: input }) =>
      status(input.address !== markets[0].address),
    )

    const { result } = renderHook(() => useMarketsInDefault(markets, 1), {
      wrapper: setup().wrapper,
    })
    await waitFor(() => expect(result.current).toBe(2))
    expect(getStatus).toHaveBeenCalledTimes(3)
    expect(getStatus).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 1 }),
      expect.objectContaining({
        market: expect.objectContaining({ defaultedAt: 0 }),
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it("leaves the entire count unavailable when any SDK result is unknown", async () => {
    getStatus.mockResolvedValueOnce(status(true))
    getStatus.mockResolvedValueOnce(status(undefined))
    const { client, wrapper } = setup()
    const { result } = renderHook(
      () => useMarketsInDefault([market(1), market(2)], 1),
      { wrapper },
    )
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(client.isFetching()).toBe(0))
    expect(result.current).toBeUndefined()
  })

  it("hides a cached count when a refresh fails and recovers on a successful retry", async () => {
    getStatus.mockResolvedValue(status(true))
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useMarketsInDefault([market(1)], 1), {
      wrapper,
    })
    await waitFor(() => expect(result.current).toBe(1))

    getStatus.mockRejectedValue(new Error("History unavailable"))
    await act(async () => {
      await client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_DEFAULT_COUNT(1),
      })
    })
    await waitFor(() => expect(result.current).toBeUndefined())

    getStatus.mockResolvedValue(status(false))
    await act(async () => {
      await client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_DEFAULT_COUNT(1),
      })
    })
    await waitFor(() => expect(result.current).toBe(0))
  })

  it("isolates chain changes and aborts a superseded history read", async () => {
    const oldRead = deferred()
    const newRead = deferred()
    getStatus.mockReturnValueOnce(oldRead.promise)
    getStatus.mockReturnValueOnce(newRead.promise)
    const { result, rerender } = renderHook(
      ({ chainId }: { chainId: 1 | 11155111 }) =>
        useMarketsInDefault([market(1, { chainId })], chainId),
      { wrapper: setup().wrapper, initialProps: { chainId: 1 } },
    )
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(1))
    const oldSignal = getStatus.mock.calls[0][1].signal
    rerender({ chainId: 11155111 })
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(2))
    expect(oldSignal?.aborted).toBe(true)
    expect(result.current).toBeUndefined()

    await act(async () => {
      oldRead.resolve(status(true))
    })
    expect(result.current).toBeUndefined()
    await act(async () => {
      newRead.resolve(status(false))
    })
    await waitFor(() => expect(result.current).toBe(0))
    expect(getClient).toHaveBeenCalledWith(1)
    expect(getClient).toHaveBeenCalledWith(11155111)
  })

  it("does not reuse another profile's count when the market list changes", async () => {
    const nextRead = deferred()
    getStatus.mockResolvedValueOnce(status(true))
    getStatus.mockReturnValueOnce(nextRead.promise)
    const { result, rerender } = renderHook(
      ({ markets }) => useMarketsInDefault(markets, 1),
      { wrapper: setup().wrapper, initialProps: { markets: [market(1)] } },
    )
    await waitFor(() => expect(result.current).toBe(1))
    rerender({ markets: [market(2)] })
    expect(result.current).toBeUndefined()
    await act(async () => {
      nextRead.resolve(status(false))
    })
    await waitFor(() => expect(result.current).toBe(0))
  })

  it("refreshes in-place lifecycle changes without mutating an in-flight SDK input", async () => {
    const mutable = market(1, { defaultedAt: 0 })
    getStatus.mockImplementation(async (_client, { market: input }) =>
      status(input.defaultedAt !== 0),
    )
    const { result, rerender } = renderHook(
      () => useMarketsInDefault([mutable], 1),
      { wrapper: setup().wrapper },
    )
    await waitFor(() => expect(result.current).toBe(0))
    const originalInput = getStatus.mock.calls[0][1].market

    mutable.defaultedAt = 50
    mutable.isClosed = true
    rerender()
    await waitFor(() => expect(result.current).toBe(1))
    expect(getStatus).toHaveBeenCalledTimes(2)
    expect(originalInput.defaultedAt).toBe(0)
  })

  it("deduplicates markets and keeps the cache stable across ordering and clock refreshes", async () => {
    const first = market(10)
    const second = market(11)
    getStatus.mockResolvedValue(status(true))
    const { result, rerender } = renderHook(
      ({ markets }) => useMarketsInDefault(markets, 1),
      { wrapper: setup().wrapper, initialProps: { markets: [first, second] } },
    )
    await waitFor(() => expect(result.current).toBe(2))
    second.lastInterestAccruedTimestamp += 10
    rerender({
      markets: [
        second,
        first,
        { ...first, address: first.address.toUpperCase() } as Market,
      ],
    })
    expect(result.current).toBe(2)
    expect(getStatus).toHaveBeenCalledTimes(2)
  })

  it("does not query a market from the wrong profile chain", () => {
    const { result } = renderHook(
      () => useMarketsInDefault([market(1, { chainId: 11155111 })], 1),
      { wrapper: setup().wrapper },
    )
    expect(result.current).toBeUndefined()
    expect(getStatus).not.toHaveBeenCalled()
  })

  it("bounds history concurrency and waits for every result before publishing the count", async () => {
    const reads = Array.from({ length: 8 }, deferred)
    reads.forEach((read) => getStatus.mockReturnValueOnce(read.promise))
    const { result } = renderHook(
      () =>
        useMarketsInDefault(
          reads.map((_read, index) => market(index + 1)),
          1,
        ),
      { wrapper: setup().wrapper },
    )
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(4))
    expect(result.current).toBeUndefined()
    await act(async () => {
      reads.slice(0, 4).forEach((read) => read.resolve(status(true)))
    })
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(8))
    expect(result.current).toBeUndefined()
    await act(async () => {
      reads.slice(4).forEach((read) => read.resolve(status(true)))
    })
    await waitFor(() => expect(result.current).toBe(8))
  })

  it("refreshes history once a minute rather than on every market poll", async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useMarketsInDefault([market(1)], 1), {
      wrapper: setup().wrapper,
    })
    await waitFor(() => expect(result.current).toBe(0))
    await act(async () => {
      jest.advanceTimersByTime(10_000)
    })
    expect(getStatus).toHaveBeenCalledTimes(1)
    await act(async () => {
      jest.advanceTimersByTime(50_000)
    })
    expect(getStatus).toHaveBeenCalledTimes(2)
  })
})
