/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { Market } from "@wildcatfi/wildcat-sdk"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { useEthersProvider } from "@/hooks/useEthersSigner"

import { useBorrowerPenaltyWarning } from "./useBorrowerPenaltyWarning"
import { borrowerPenaltyWarningThresholdSeconds } from "../utils"

const getIndexedMarketListMock = jest.fn()
const getSubgraphClientMock = jest.fn((_chainId: unknown) => ({
  name: "subgraph",
}))

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getIndexedMarketList: (...args: unknown[]) =>
    getIndexedMarketListMock(...args),
  getSubgraphClient: (chainId: unknown) => getSubgraphClientMock(chainId),
}))

jest.mock("@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets", () => ({
  updateMarkets: jest.fn(),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: jest.fn(),
}))

jest.mock("@/config/network", () => ({
  NETWORKS_BY_ID: {
    11155111: { chainId: 11155111 },
  },
}))

const updateMarketsMock = updateMarkets as jest.MockedFunction<
  typeof updateMarkets
>
const useEthersProviderMock = useEthersProvider as jest.MockedFunction<
  typeof useEthersProvider
>

const borrower = "0x0000000000000000000000000000000000000001"
const market = {
  address: "0x0000000000000000000000000000000000000002",
  borrower,
  chainId: 11155111,
} as Market
const indexedMarket = {
  address: "0x0000000000000000000000000000000000000003",
  borrower,
} as Market

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

describe("useBorrowerPenaltyWarning", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useEthersProviderMock.mockReturnValue({
      provider: { request: jest.fn() },
      signer: undefined,
    } as unknown as ReturnType<typeof useEthersProvider>)
    getIndexedMarketListMock.mockResolvedValue([indexedMarket])
  })

  it("discovers only open markets and requires successful live hydration", async () => {
    const triggeringMarket = {
      ...indexedMarket,
      isClosed: false,
      isIncurringPenalties: true,
      delinquencyGracePeriod: 0,
      timeDelinquent: borrowerPenaltyWarningThresholdSeconds,
    } as Market
    updateMarketsMock.mockResolvedValue([triggeringMarket])

    const { result } = renderHook(() => useBorrowerPenaltyWarning(market), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.state).toBe("warning"))

    expect(getIndexedMarketListMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        filter: expect.objectContaining({
          borrower,
          isClosed: false,
        }),
      }),
    )
    expect(updateMarketsMock).toHaveBeenCalledWith(
      [indexedMarket],
      expect.anything(),
      expect.objectContaining({ chainId: 11155111 }),
      { throwOnError: true },
    )
  })

  it("returns unknown when the decision-time live refresh fails", async () => {
    const clearMarket = {
      ...indexedMarket,
      isClosed: false,
      isIncurringPenalties: false,
      delinquencyGracePeriod: 0,
      timeDelinquent: 0,
    } as Market
    updateMarketsMock.mockResolvedValueOnce([clearMarket])

    const { result } = renderHook(() => useBorrowerPenaltyWarning(market), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.state).toBe("clear"))

    updateMarketsMock.mockRejectedValueOnce(new Error("RPC unavailable"))
    let refreshedState = "clear"
    await act(async () => {
      refreshedState = await result.current.refresh()
    })

    expect(refreshedState).toBe("unknown")
    await waitFor(() => expect(result.current.state).toBe("unknown"))
    expect(result.current.shouldWarn).toBe(false)
  })

  it("does not poll the borrower-wide market list", async () => {
    updateMarketsMock.mockResolvedValue([indexedMarket])

    const { result } = renderHook(() => useBorrowerPenaltyWarning(market), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.state).toBe("clear"))
    expect(getIndexedMarketListMock).toHaveBeenCalledTimes(1)

    jest.useFakeTimers()
    act(() => {
      jest.advanceTimersByTime(30_000)
    })
    expect(getIndexedMarketListMock).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })
})
