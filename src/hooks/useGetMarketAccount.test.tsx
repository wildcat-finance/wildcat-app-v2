/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type {
  Market,
  MarketAccount,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { useBorrowerMarketAccountQuery } from "./useGetMarketAccount"

const getLenderAccountForMarketMock = jest.fn()
const getMarketAccountMock = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getLenderAccountForMarket: (...args: unknown[]) =>
    getLenderAccountForMarketMock(...args),
  getSubgraphClient: (chainId: number) => ({ chainId }),
  MarketAccount: {
    getMarketAccount: (...args: unknown[]) => getMarketAccountMock(...args),
  },
}))

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 11155111 }),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => ({}),
}))

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe("useBorrowerMarketAccountQuery", () => {
  it("reuses the known Market when refreshing its account", async () => {
    const market = {
      address: "0xd37f9f591fd3d1cf322f169aab94d29871d3ae9a",
      chainId: 11155111,
      provider: { name: "indexed" },
    } as unknown as Market
    const provider = { name: "live" } as unknown as SignerOrProvider
    const indexedAccount = { market } as MarketAccount
    const liveAccount = { market } as MarketAccount

    getLenderAccountForMarketMock.mockResolvedValue(indexedAccount)
    getMarketAccountMock.mockResolvedValue(liveAccount)

    const { result } = renderHook(
      () =>
        useBorrowerMarketAccountQuery({
          market,
          lender: "0x1111111111111111111111111111111111111111",
          provider,
          enabled: true,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.data).toBe(liveAccount))

    expect(getMarketAccountMock).toHaveBeenCalledWith(
      11155111,
      provider,
      "0x1111111111111111111111111111111111111111",
      market,
    )
  })
})
