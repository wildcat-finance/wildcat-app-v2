/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import {
  Market,
  RAY,
  SignerOrProvider,
  SupportedChainId,
  Token,
} from "@wildcatfi/wildcat-sdk"

import { getMarketTotalDebt } from "@/utils/marketDebt"

import { useBorrowerAggregateStats } from "./useBorrowerAggregateStats"

const mockGetMarkets = jest.fn()
const mockGetPrices = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getBorrowerAnalyticsProfile: async () => ({ stats: {} }),
  getIndexedMarketList: (...args: unknown[]) => mockGetMarkets(...args),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => ({ provider: {} }),
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 11155111 }),
}))
jest.mock("@/hooks/useTokenUsdPrices", () => ({
  fetchIndexedTokenUsdPrices: (...args: unknown[]) => mockGetPrices(...args),
}))
jest.mock("@/lib/subgraphCapabilities", () => ({
  getConfiguredSubgraphClient: () => ({}),
  isSubgraphPricingConfigured: () => true,
}))

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "USD Coin",
  "USDC",
  6,
  false,
  {} as SignerOrProvider,
)

const makeMarket = (id: number, supply: string, aprBips: number): Market =>
  Object.assign(Object.create(Market.prototype), {
    address: `0x${id.toString(16).padStart(40, "0")}`,
    name: `Market ${id}`,
    underlyingToken: token,
    totalSupply: token.parseAmount(supply),
    maxTotalSupply: token.parseAmount("1000"),
    // Includes an unfunded withdrawal cycle. Already funded claims and fees
    // are separate SDK liabilities and must not inflate displayed lender debt.
    scaledPendingWithdrawals: 40_000_000n,
    scaleFactor: RAY,
    normalizedUnclaimedWithdrawals: token.parseAmount("1000"),
    lastAccruedProtocolFees: token.parseAmount("100"),
    annualInterestBips: aprBips,
    isClosed: false,
  })

const mountStats = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderHook(
    () =>
      useBorrowerAggregateStats("0x0000000000000000000000000000000000000009"),
    {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  )
}

it("uses lender debt for both the USD summary and APR weighting", async () => {
  const first = makeMarket(1, "100", 1000)
  const second = makeMarket(2, "300", 2000)
  const closed = makeMarket(3, "900", 3000)
  closed.isClosed = true
  mockGetMarkets.mockResolvedValue([first, second, closed])
  mockGetPrices.mockResolvedValue({
    prices: { [token.address]: 2 },
    unpriced: {},
  })

  // Exercise the actual SDK liability getter; the regression was using it
  // for the profile while the tables correctly displayed the remaining supply.
  expect(first.totalDebts.raw).toBe(token.parseAmount("1200").raw)
  expect(getMarketTotalDebt(first).raw).toBe(token.parseAmount("100").raw)
  expect(first.outstandingTotalSupply.raw).toBe(token.parseAmount("60").raw)

  const { result } = mountStats()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.totalDebt).toBe(800)
  expect(result.current.data?.avgApr).toBe(17.5)
  expect(result.current.data?.activeMarkets).toBe(2)
})

it("keeps missing-price debt and weighted APR unknown", async () => {
  mockGetMarkets.mockResolvedValue([makeMarket(1, "100", 1000)])
  mockGetPrices.mockResolvedValue({
    prices: {},
    unpriced: { [token.address]: true },
  })
  const { result } = mountStats()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.totalDebt).toBeUndefined()
  expect(result.current.data?.avgApr).toBeUndefined()
})
