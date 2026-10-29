/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import {
  getLenderAccountForMarket,
  Market,
  MarketAccount,
  MarketVersion,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber, providers } from "ethers"

import { useMarketAccountQuery } from "./useMarketAccount"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getSubgraphClient: jest.fn(() => ({})),
  getLenderAccountForMarket: jest.fn(),
}))
jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}))
jest.mock("wagmi", () => ({ useAccount: jest.fn() }))
jest.mock("@/hooks/useEthersSigner", () => ({ useEthersProvider: jest.fn() }))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
}))

const address = "0x0000000000000000000000000000000000000001"
const wallet = "0x0000000000000000000000000000000000000002"
const provider = {} as providers.Provider
const token = new Token(1, address, "Test USD", "USDC", 6, false, provider)
const ray = BigNumber.from(10).pow(27)
const makeMarket = (version: MarketVersion) =>
  ({
    address,
    chainId: 1,
    version,
    provider,
    underlyingToken: token,
    marketToken: token,
    scaleFactor: ray,
    lastInterestAccruedTimestamp: 20,
  }) as Market

describe("independent live market accounts", () => {
  let client: QueryClient
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  beforeEach(() => {
    jest.clearAllMocks()
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    })
    jest
      .mocked(getLenderAccountForMarket)
      .mockReturnValue(new Promise(() => {}))
  })
  afterEach(() => {
    cleanup()
    client.clear()
    jest.restoreAllMocks()
  })

  it.each([MarketVersion.V1, MarketVersion.V2])(
    "selects the version %s reader before indexed history completes",
    async (version) => {
      const market = makeMarket(version)
      const live = MarketAccount.fromMarketDataOnly(market, wallet, true)
      const v1 = jest
        .spyOn(MarketAccount, "getMarketAccount")
        .mockResolvedValue(live)
      const v2 = jest
        .spyOn(MarketAccount, "getMarketAccountV2")
        .mockResolvedValue(live)
      const { result } = renderHook(
        () =>
          useMarketAccountQuery({
            market,
            account: wallet,
            provider,
            enabled: true,
          }),
        { wrapper },
      )
      await waitFor(() =>
        expect(result.current.authoritativeStatus).toBe("resolved"),
      )
      expect(version === MarketVersion.V1 ? v1 : v2).toHaveBeenCalledWith(
        1,
        provider,
        wallet,
        address,
      )
      expect(version === MarketVersion.V1 ? v2 : v1).not.toHaveBeenCalled()
      expect(result.current.liveAccount).toBe(live)
      expect(result.current.isLoadingInitial).toBe(true)
    },
  )

  it("adds late indexed history without replacing live balances or mutating either cache", async () => {
    const market = makeMarket(MarketVersion.V1)
    const live = MarketAccount.fromMarketDataOnly(market, wallet, true)
    live.marketBalance = token.getAmount(12)
    live.scaledMarketBalance = BigNumber.from(12)
    jest.spyOn(MarketAccount, "getMarketAccount").mockResolvedValue(live)
    let finishHistory!: (value: MarketAccount) => void
    jest.mocked(getLenderAccountForMarket).mockReturnValue(
      new Promise((resolve) => {
        finishHistory = resolve
      }),
    )
    const { result } = renderHook(
      () =>
        useMarketAccountQuery({
          market,
          account: wallet,
          provider,
          enabled: true,
        }),
      { wrapper },
    )
    await waitFor(() =>
      expect(result.current.authoritativeStatus).toBe("resolved"),
    )
    const indexed = MarketAccount.fromMarketDataOnly(market, wallet, false)
    indexed.totalDeposited = token.getAmount(8)
    indexed.totalInterestEarned = token.getAmount(2)
    indexed.lastScaleFactor = ray
    indexed.lastUpdatedTimestamp = 10
    indexed.numPendingWithdrawalBatches = 3
    await act(async () => finishHistory(indexed))
    await waitFor(() =>
      expect(result.current.data?.totalDeposited?.raw.toNumber()).toBe(8),
    )
    expect(result.current.data).toBeInstanceOf(MarketAccount)
    expect(result.current.data?.marketBalance.raw.toNumber()).toBe(12)
    expect(result.current.data?.isAuthorizedOnController).toBe(true)
    expect(result.current.data?.numPendingWithdrawalBatches).toBe(3)
    expect(result.current.data?.depositRecords).toBe(indexed.depositRecords)
    expect(result.current.data?.lastUpdatedTimestamp).toBe(20)
    expect(indexed.lastUpdatedTimestamp).toBe(10)
    expect(indexed.marketBalance.raw.toNumber()).toBe(0)
    expect(live.totalDeposited).toBeUndefined()
    expect(result.current.liveAccount).toBe(live)
  })
})
