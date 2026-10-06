/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import {
  getLensV2Contract,
  Market,
  MarketVersion,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { useEthersProvider } from "@/hooks/useEthersSigner"

import { useGetMarket } from "./useGetMarket"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getLensV2Contract: jest.fn(),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: jest.fn(),
}))
jest.mock("@/config/query-keys", () => ({
  QueryKeys: {
    Markets: {
      GET_MARKET: (chainId: number, address: string | undefined) => [
        "markets",
        "GET_MARKET",
        chainId,
        address,
      ],
    },
  },
}))

const getLensV2ContractMock = jest.mocked(getLensV2Contract)
const useEthersProviderMock = jest.mocked(useEthersProvider)

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe("useGetMarket", () => {
  afterEach(() => {
    jest.restoreAllMocks()
    Reflect.deleteProperty(global, "fetch")
  })

  it("exposes indexed market data while live hydration is pending", async () => {
    const address = "0x0000000000000000000000000000000000000001"
    const provider = {}
    const indexedMarket = {
      address,
      version: MarketVersion.V2,
      provider,
      updateWith: jest.fn(),
    } as unknown as Market
    const liveMarket = {
      address,
      version: MarketVersion.V2,
      provider,
      updateWith: jest.fn(),
    } as unknown as Market
    const liveUpdate = { totalAssets: "1" }
    const liveRead = deferred<typeof liveUpdate>()
    jest
      .spyOn(Market, "fromSubgraphMarketData")
      .mockReturnValueOnce(indexedMarket)
      .mockReturnValue(liveMarket)
    getLensV2ContractMock.mockReturnValue({
      getMarketData: jest.fn().mockReturnValue(liveRead.promise),
    } as unknown as ReturnType<typeof getLensV2Contract>)
    useEthersProviderMock.mockReturnValue({
      provider,
      signer: undefined,
    } as unknown as ReturnType<typeof useEthersProvider>)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chainId: SupportedChainId.Sepolia,
        market: { id: address },
      }),
    } as Response)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () =>
        useGetMarket({
          address,
          chainId: SupportedChainId.Sepolia,
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.apiLoading).toBe(false))

    expect(result.current.indexedMarket).toBe(indexedMarket)
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(true)

    liveRead.resolve(liveUpdate)

    await waitFor(() => expect(result.current.data).toBe(liveMarket))
    expect(liveMarket.updateWith).toHaveBeenCalledWith(liveUpdate)
  })
})
