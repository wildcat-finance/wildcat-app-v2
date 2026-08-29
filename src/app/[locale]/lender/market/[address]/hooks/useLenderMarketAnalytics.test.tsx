/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { Market } from "@wildcatfi/wildcat-sdk"

import { useLenderMarketAnalytics } from "./useLenderMarketAnalytics"

const collectIndexedPagesMock = jest.fn()
const getLenderPositionPageMock = jest.fn()
const getLenderWithdrawalStatusPageMock = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  collectIndexedPages: (...args: unknown[]) => collectIndexedPagesMock(...args),
  getLenderPositionPage: (...args: unknown[]) =>
    getLenderPositionPageMock(...args),
  getLenderWithdrawalStatusPage: (...args: unknown[]) =>
    getLenderWithdrawalStatusPageMock(...args),
  getSubgraphClient: (chainId: number) => ({ chainId }),
  isSupportedChainId: (chainId: number) => chainId === 11155111,
  SubgraphDeploymentRequirementsByChain: {
    11155111: { analyticsEnabled: true },
  },
}))

const SEPOLIA_CHAIN_ID = 11155111
const MARKET_ADDRESS = "0x1111111111111111111111111111111111111111"

const market = {
  address: MARKET_ADDRESS,
  chainId: SEPOLIA_CHAIN_ID,
  underlyingToken: {
    getAmount: jest.fn(),
  },
} as unknown as Market

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

describe("useLenderMarketAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectIndexedPagesMock.mockImplementation(
      (getPage: (request: { first: number }) => unknown) =>
        getPage({ first: 1000 }),
    )
  })

  it("loads the visible lender count when extended analytics are disabled", async () => {
    getLenderPositionPageMock.mockResolvedValue([{}, {}])

    const { result } = renderHook(
      () => useLenderMarketAnalytics(market, undefined, false),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.activeLendersCount).toBe(2))

    expect(getLenderPositionPageMock).toHaveBeenCalledWith(
      { chainId: SEPOLIA_CHAIN_ID },
      expect.objectContaining({
        markets: [MARKET_ADDRESS],
        activeOnly: true,
        fetchPolicy: "network-only",
      }),
    )
    expect(getLenderWithdrawalStatusPageMock).not.toHaveBeenCalled()
  })
})
