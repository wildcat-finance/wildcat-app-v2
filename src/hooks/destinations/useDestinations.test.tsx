/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import type { DestinationsResponse } from "@/lib/destinations/types"

import { useDestinations } from "./useDestinations"

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useIsSelectedNetworkRehydrated: () => true,
}))
// The real key factory pulls in viem, which needs TextEncoder that jsdom lacks.
jest.mock("@/config/query-keys", () => ({
  QueryKeys: {
    Destinations: { BY_CHAIN: (chainId: number) => ["destinations", chainId] },
  },
}))

const MARKET = "0x00000000000000000000000000000000000000ab"

const response = (
  markets: DestinationsResponse["markets"],
): DestinationsResponse => ({
  chainId: SupportedChainId.Mainnet,
  stale: false,
  stalePlatforms: [],
  markets,
})

const destination = () =>
  ({
    platform: "morpho-blue",
    figures: { asOf: Math.floor(Date.now() / 1000) },
  }) as DestinationsResponse["markets"][string][number]

const render = (chainId: number) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useDestinations(chainId), { wrapper })
}

const mockFetch = (body: DestinationsResponse) => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => body,
  })) as unknown as typeof fetch
}

describe("useDestinations", () => {
  afterEach(() => {
    cleanup()
    jest.restoreAllMocks()
  })

  it("reserves space on a supported chain until destinations load", async () => {
    mockFetch(response({ [MARKET]: [destination()] }))
    const { result } = render(SupportedChainId.Mainnet)

    expect(result.current.isPending).toBe(true)
    expect(result.current.showDestinations).toBe(true)

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.showDestinations).toBe(true)
    expect(result.current.markets[MARKET]).toHaveLength(1)
  })

  it("stops reserving space once a chain turns out to have none", async () => {
    mockFetch(response({}))
    const { result } = render(SupportedChainId.Mainnet)

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.showDestinations).toBe(false)
  })

  it("neither fetches nor reserves space on an unsupported chain", () => {
    mockFetch(response({}))
    const { result } = render(SupportedChainId.Sepolia)

    expect(result.current.isPending).toBe(false)
    expect(result.current.showDestinations).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("keeps one state object across renders that change nothing", () => {
    mockFetch(response({}))
    const { result, rerender } = render(SupportedChainId.Sepolia)
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
