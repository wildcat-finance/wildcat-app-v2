/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import {
  getSubgraphClient,
  Market,
  SubgraphTokenWrapperData,
  SupportedChainId,
  TokenWrapper,
  WrapperFactory,
} from "@wildcatfi/wildcat-sdk"
import { constants, providers, VoidSigner } from "ethers"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"

import { useWrapperForMarket } from "./useWrapperForMarket"

jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}))

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getSubgraphClient: jest.fn(),
}))
jest.mock("@/hooks/useEthersSigner", () => ({ useEthersProvider: jest.fn() }))

const marketAddress = "0x00000000000000000000000000000000000000ab"
const wrapperAddress = "0x00000000000000000000000000000000000000cd"
const otherMarket = "0x00000000000000000000000000000000000000ef"

const makeMarket = (
  chainId: SupportedChainId = SupportedChainId.Mainnet,
  address = marketAddress,
) => ({ chainId, address }) as Market

const makeData = (market = marketAddress): SubgraphTokenWrapperData => ({
  id: wrapperAddress,
  address: wrapperAddress,
  marketAddress: market,
  marketToken: {
    __typename: "Token",
    id: market,
    address: market,
    name: "Market Token",
    symbol: "MKT",
    decimals: 6,
    isMock: false,
  },
  token: {
    __typename: "Token",
    id: wrapperAddress,
    address: wrapperAddress,
    name: "Wrapper Shares",
    symbol: "WMKT",
    decimals: 6,
    isMock: false,
  },
  factory: { id: otherMarket, address: otherMarket },
  deployedEvent: null,
})

const response = (
  data: SubgraphTokenWrapperData | null,
  id = marketAddress,
) => ({
  data: { market: { id, tokenWrapper: data } },
})

describe("useWrapperForMarket", () => {
  let client: QueryClient
  let provider: providers.StaticJsonRpcProvider
  let query: jest.Mock
  let factoryRead: jest.SpiedFunction<typeof WrapperFactory.getWrapperForMarket>
  let metadataRead: jest.SpiedFunction<typeof TokenWrapper.fromAddress>

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    provider = new providers.StaticJsonRpcProvider("http://127.0.0.1:1", 1)
    query = jest.fn().mockResolvedValue(response(makeData()))
    jest.mocked(getSubgraphClient).mockReturnValue({
      query,
    } as unknown as ReturnType<typeof getSubgraphClient>)
    jest
      .mocked(useEthersProvider)
      .mockReturnValue({ provider, targetChainId: 1 })
    factoryRead = jest
      .spyOn(WrapperFactory, "getWrapperForMarket")
      .mockResolvedValue(constants.AddressZero)
    metadataRead = jest
      .spyOn(TokenWrapper, "fromAddress")
      .mockRejectedValue(new Error("Unexpected metadata RPC"))
  })

  afterEach(() => {
    cleanup()
    client.clear()
    jest.restoreAllMocks()
  })

  it("hydrates indexed metadata without factory or metadata RPC", async () => {
    const { result } = renderHook(() => useWrapperForMarket(makeMarket()), {
      wrapper,
    })
    await waitFor(() => expect(result.current.hasWrapper).toBe(true))
    expect(result.current.wrapper?.shareToken.symbol).toBe("WMKT")
    expect(result.current.wrapper?.marketAddress).toBe(marketAddress)
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ fetchPolicy: "network-only" }),
    )
    expect(factoryRead).not.toHaveBeenCalled()
    expect(metadataRead).not.toHaveBeenCalled()
  })

  it("treats confirmed absence as successful empty data", async () => {
    query.mockResolvedValue(response(null))
    const { result } = renderHook(() => useWrapperForMarket(makeMarket()), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasWrapper).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(
      client.getQueryData(
        QueryKeys.Wrapper.GET_WRAPPER_FOR_MARKET(1, marketAddress),
      ),
    ).toBeNull()
    expect(factoryRead).toHaveBeenCalledTimes(1)
    expect(metadataRead).not.toHaveBeenCalled()
  })

  it("falls back to RPC while a newly created wrapper is not indexed", async () => {
    query.mockResolvedValue(response(null))
    factoryRead.mockResolvedValue(wrapperAddress)
    metadataRead.mockResolvedValue(
      TokenWrapper.fromSubgraphData(1, provider, makeData()),
    )
    const { result } = renderHook(() => useWrapperForMarket(makeMarket()), {
      wrapper,
    })
    await waitFor(() => expect(result.current.hasWrapper).toBe(true))
    expect(metadataRead).toHaveBeenCalledWith(1, provider, wrapperAddress)
  })

  it("falls back during a subgraph failure", async () => {
    query.mockRejectedValue(new Error("Subgraph unavailable"))
    factoryRead.mockResolvedValue(wrapperAddress)
    metadataRead.mockResolvedValue(
      TokenWrapper.fromSubgraphData(1, provider, makeData()),
    )
    const { result } = renderHook(() => useWrapperForMarket(makeMarket()), {
      wrapper,
    })
    await waitFor(() => expect(result.current.hasWrapper).toBe(true))
    expect(result.current.isError).toBe(false)
    expect(factoryRead).toHaveBeenCalledTimes(1)
  })

  it("surfaces failed fallback instead of confirming absence", async () => {
    query.mockRejectedValue(new Error("Subgraph unavailable"))
    factoryRead.mockRejectedValue(new Error("Factory unavailable"))
    const { result } = renderHook(() => useWrapperForMarket(makeMarket()), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe("Factory unavailable")
    expect(result.current.wrapper).toBeUndefined()
    expect(metadataRead).not.toHaveBeenCalled()
  })

  it("rejects mismatched indexed identities without RPC fallback", async () => {
    query.mockResolvedValue(response(makeData(otherMarket)))
    const { result } = renderHook(() => useWrapperForMarket(makeMarket()), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.name).toBe("ReadIdentityMismatchError")
    expect(factoryRead).not.toHaveBeenCalled()
    expect(metadataRead).not.toHaveBeenCalled()
  })

  it("refreshes after the existing creation invalidation", async () => {
    query.mockResolvedValue(response(null))
    const { result } = renderHook(() => useWrapperForMarket(makeMarket()), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    query.mockResolvedValue(response(makeData()))
    await act(async () => {
      await client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_WRAPPER_FOR_MARKET(1, marketAddress),
      })
    })
    await waitFor(() => expect(result.current.hasWrapper).toBe(true))
    expect(query).toHaveBeenCalledTimes(2)
    expect(factoryRead).toHaveBeenCalledTimes(1)
    expect(metadataRead).not.toHaveBeenCalled()
  })

  it("uses the market chain and isolates cached wrappers between chains", async () => {
    const { result, rerender } = renderHook(
      ({ market }) => useWrapperForMarket(market),
      { initialProps: { market: makeMarket() }, wrapper },
    )
    await waitFor(() => expect(result.current.hasWrapper).toBe(true))
    query.mockResolvedValue(response(null))
    rerender({ market: makeMarket(SupportedChainId.Sepolia) })
    expect(result.current.wrapper).toBeUndefined()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(getSubgraphClient).toHaveBeenLastCalledWith(SupportedChainId.Sepolia)
    expect(useEthersProvider).toHaveBeenLastCalledWith({
      chainId: SupportedChainId.Sepolia,
    })
    expect(result.current.hasWrapper).toBe(false)
  })

  it("rebinds cached wrapper and token contracts when the wallet changes", async () => {
    const { result, rerender } = renderHook(
      () => useWrapperForMarket(makeMarket()),
      {
        wrapper,
      },
    )
    await waitFor(() => expect(result.current.hasWrapper).toBe(true))
    const signer = new VoidSigner(otherMarket, provider)
    jest.mocked(useEthersProvider).mockReturnValue({
      provider,
      signer: Object.assign(signer, { chainId: 1 }) as unknown as NonNullable<
        ReturnType<typeof useEthersProvider>["signer"]
      >,
      targetChainId: 1,
    })
    rerender()
    await waitFor(() => expect(result.current.wrapper?.provider).toBe(signer))
    expect(result.current.wrapper?.marketToken.provider).toBe(signer)
    expect(result.current.wrapper?.shareToken.provider).toBe(signer)
    expect(query).toHaveBeenCalledTimes(1)
  })

  it("does not read when a chain has no wrapper factory", () => {
    const { result } = renderHook(
      () => useWrapperForMarket(makeMarket(SupportedChainId.PlasmaMainnet)),
      { wrapper },
    )
    expect(result.current.hasFactory).toBe(false)
    expect(result.current.hasWrapper).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(query).not.toHaveBeenCalled()
    expect(factoryRead).not.toHaveBeenCalled()
  })
})
