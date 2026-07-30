/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type {
  Market,
  MarketAccount,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { useLenderMarketAccountQuery } from "./useLenderMarketAccount"

const getLenderAccountForMarketMock = jest.fn()
const getMarketAccountMock = jest.fn()
const useSelectedNetworkMock = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getLenderAccountForMarket: (...args: unknown[]) =>
    getLenderAccountForMarketMock(...args),
  getSubgraphClient: (chainId: number) => ({ chainId }),
  MarketAccount: {
    getMarketAccount: (...args: unknown[]) => getMarketAccountMock(...args),
  },
}))

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => useSelectedNetworkMock(),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: jest.fn(),
}))

const SEPOLIA_CHAIN_ID = 11155111
const MARKET_ADDRESS = "0x1111111111111111111111111111111111111111"
const LENDER_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const LENDER_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

const market = {
  address: MARKET_ADDRESS,
  chainId: SEPOLIA_CHAIN_ID,
} as Market
const provider = {} as SignerOrProvider

const createAccount = (account: string, source: string) =>
  ({ account, source }) as unknown as MarketAccount

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

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

describe("useLenderMarketAccountQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSelectedNetworkMock.mockReturnValue({
      chainId: SEPOLIA_CHAIN_ID,
      isTestnet: true,
    })
  })

  it("starts the authoritative read without waiting for the indexed account", async () => {
    const indexed = createDeferred<MarketAccount>()
    const authoritative = createAccount(LENDER_A, "live")
    getLenderAccountForMarketMock.mockReturnValue(indexed.promise)
    getMarketAccountMock.mockResolvedValue(authoritative)

    const { result } = renderHook(
      () =>
        useLenderMarketAccountQuery({
          market,
          lender: LENDER_A,
          provider,
          enabled: true,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(getMarketAccountMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.data).toBe(authoritative))
    expect(result.current.authoritativeAccount).toBe(authoritative)
    expect(result.current.authoritativeStatus).toBe("resolved")
  })

  it("keeps an indexed-only account in resolving state", async () => {
    const indexed = createAccount(LENDER_A, "indexed")
    const authoritative = createDeferred<MarketAccount>()
    getLenderAccountForMarketMock.mockResolvedValue(indexed)
    getMarketAccountMock.mockReturnValue(authoritative.promise)

    const { result } = renderHook(
      () =>
        useLenderMarketAccountQuery({
          market,
          lender: LENDER_A,
          provider,
          enabled: true,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.data).toBe(indexed))

    expect(result.current.authoritativeAccount).toBeUndefined()
    expect(result.current.authoritativeStatus).toBe("resolving")
  })

  it("does not expose the previous lender's authoritative account after an identity change", async () => {
    const indexedA = createAccount(LENDER_A, "indexed")
    const indexedB = createAccount(LENDER_B, "indexed")
    const authoritativeA = createAccount(LENDER_A, "live")
    const authoritativeB = createDeferred<MarketAccount>()

    getLenderAccountForMarketMock.mockImplementation(
      (_client: unknown, { lender }: { lender: string }) =>
        Promise.resolve(lender === LENDER_A ? indexedA : indexedB),
    )
    getMarketAccountMock.mockImplementation(
      (_chainId: number, _provider: unknown, lender: string) =>
        lender === LENDER_A
          ? Promise.resolve(authoritativeA)
          : authoritativeB.promise,
    )

    const { result, rerender } = renderHook(
      ({ lender }) =>
        useLenderMarketAccountQuery({
          market,
          lender,
          provider,
          enabled: true,
        }),
      {
        initialProps: { lender: LENDER_A },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(result.current.data).toBe(authoritativeA))

    rerender({ lender: LENDER_B })

    await waitFor(() =>
      expect(getMarketAccountMock).toHaveBeenCalledWith(
        SEPOLIA_CHAIN_ID,
        provider,
        LENDER_B,
        MARKET_ADDRESS,
      ),
    )
    expect(result.current.data).not.toBe(authoritativeA)
    expect(result.current.authoritativeAccount).toBeUndefined()
    expect(result.current.authoritativeStatus).toBe("resolving")
  })

  it("reports an authoritative read failure and retries that read directly", async () => {
    const indexed = createAccount(LENDER_A, "indexed")
    const authoritative = createAccount(LENDER_A, "live")
    getLenderAccountForMarketMock.mockResolvedValue(indexed)
    getMarketAccountMock.mockRejectedValueOnce(new Error("RPC unavailable"))

    const { result } = renderHook(
      () =>
        useLenderMarketAccountQuery({
          market,
          lender: LENDER_A,
          provider,
          enabled: true,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() =>
      expect(result.current.authoritativeStatus).toBe("error"),
    )
    expect(result.current.data).toBe(indexed)
    expect(result.current.authoritativeAccount).toBeUndefined()

    getMarketAccountMock.mockResolvedValueOnce(authoritative)
    await act(async () => {
      await result.current.refetchUpdate()
    })

    await waitFor(() =>
      expect(result.current.authoritativeStatus).toBe("resolved"),
    )
    expect(result.current.authoritativeAccount).toBe(authoritative)
  })
})
