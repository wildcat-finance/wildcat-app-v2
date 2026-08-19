/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { Market, MarketRecord } from "@wildcatfi/wildcat-sdk"

import { useMarketRecords } from "./useMarketRecords"
import { useIdlePrefetchMarketRecords } from "./usePrefetchMarketRecords"

const getMarketRecordsMock = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getMarketRecords: (...args: unknown[]) => getMarketRecordsMock(...args),
  getSubgraphClient: (chainId: number) => ({ chainId }),
}))

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 11155111 }),
}))

const marketAddress = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"

const makeMarket = (eventIndex: number) =>
  ({
    address: marketAddress,
    chainId: 11155111,
    eventIndex,
  }) as Market

const makeRecords = (eventIndex: number) =>
  Array.from({ length: eventIndex }, (_, index) => ({
    __typename: "Deposit",
    eventIndex: index,
    transactionHash: `0x${index.toString(16).padStart(64, "0")}`,
  })) as MarketRecord[]

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

describe("useMarketRecords", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getMarketRecordsMock.mockImplementation(
      (_client: unknown, { endEventIndex }: { endEventIndex: number }) =>
        Promise.resolve(makeRecords(endEventIndex)),
    )
  })

  it("loads a fresh history window when the market event index advances", async () => {
    const { result, rerender } = renderHook(
      ({ eventIndex }) =>
        useMarketRecords({
          market: makeMarket(eventIndex),
          page: 0,
          pageSize: 20,
        }),
      {
        initialProps: { eventIndex: 2 },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(result.current.data.records).toHaveLength(2))

    rerender({ eventIndex: 6 })

    await waitFor(() => expect(result.current.data.records).toHaveLength(6))
    expect(getMarketRecordsMock).toHaveBeenCalledTimes(2)
    expect(getMarketRecordsMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ endEventIndex: 6 }),
    )
  })

  it("prefetches again when the market event index advances", async () => {
    const requestIdleCallback = jest
      .fn()
      .mockImplementation((callback: () => void) => {
        callback()
        return 1
      })

    Object.defineProperty(window, "requestIdleCallback", {
      configurable: true,
      value: requestIdleCallback,
    })

    const { rerender } = renderHook(
      ({ eventIndex }) => useIdlePrefetchMarketRecords(makeMarket(eventIndex)),
      {
        initialProps: { eventIndex: 2 },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(getMarketRecordsMock).toHaveBeenCalledTimes(1))

    rerender({ eventIndex: 6 })

    await waitFor(() => expect(getMarketRecordsMock).toHaveBeenCalledTimes(2))
    expect(getMarketRecordsMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ endEventIndex: 6 }),
    )
  })
})
