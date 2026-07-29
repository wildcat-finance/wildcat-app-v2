/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"

import { useEthersProvider } from "@/hooks/useEthersSigner"

import { usePrefetchMarketDetailMetadata } from "./usePrefetchMarketDetailMetadata"

const getIndexedMarketMock = jest.fn()
const getSubgraphClientMock = jest.fn((chainId: unknown) => ({
  name: `subgraph-${String(chainId)}`,
}))

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
  markMarketDetailPerformance: jest.fn(),
  useMarketDetailPerformanceMark: jest.fn(),
}))

jest.mock("../utils/marketV2Reads", () => ({
  refreshMarketsV2LiveDataSafe: jest.fn(),
}))

const useEthersProviderMock = useEthersProvider as jest.MockedFunction<
  typeof useEthersProvider
>

const marketAddress = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const provider = { request: jest.fn() }

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

describe("usePrefetchMarketDetailMetadata", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: fetchMock,
    })
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    getIndexedMarketMock.mockResolvedValue({
      address: marketAddress,
      stateSource: "indexed",
    })
    useEthersProviderMock.mockReturnValue({
      provider,
      signer: undefined,
      targetChainId: 11155111,
    } as unknown as ReturnType<typeof useEthersProvider>)
  })

  it("warms the indexed detail query rather than the discovery endpoint", async () => {
    const { result } = renderHook(() => usePrefetchMarketDetailMetadata(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current({
        marketAddress,
        chainId: 11155111,
      })
    })

    await waitFor(() => expect(getIndexedMarketMock).toHaveBeenCalledTimes(1))

    expect(getIndexedMarketMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        chainId: 11155111,
        market: marketAddress,
        shouldSkipRecords: true,
        fetchPolicy: "network-only",
      }),
    )
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).startsWith("/api/market/get"),
      ),
    ).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/market-summary/${marketAddress}?chainId=11155111`,
    )
  })
})
