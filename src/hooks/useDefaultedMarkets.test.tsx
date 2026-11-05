/* eslint-disable import/no-extraneous-dependencies */
import { ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"

import { QueryKeys } from "@/config/query-keys"
import {
  DefaultedMarketsData,
  fetchDefaultedMarkets,
} from "@/utils/defaultedMarkets"

import {
  seedDefaultedMarkets,
  useDefaultedMarkets,
} from "./useDefaultedMarkets"

jest.mock("viem", () => ({
  getAddress: (address: string) => address,
  isAddress: (value: string) => /^0x[0-9a-f]{40}$/i.test(value),
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
  useIsSelectedNetworkRehydrated: () => true,
}))
jest.mock("@/utils/defaultedMarkets", () => ({
  ...jest.requireActual("@/utils/defaultedMarkets"),
  fetchDefaultedMarkets: jest.fn(),
}))

const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const otherAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const borrower = "0xcccccccccccccccccccccccccccccccccccccccc"
const knownDefault = { address, borrower, defaultedAt: 123 }
const clear: DefaultedMarketsData = { markets: {}, unknown: [] }
const confirmed: DefaultedMarketsData = {
  markets: { [address]: knownDefault },
  unknown: [],
}
const key = QueryKeys.Markets.GET_DEFAULTED_MARKETS(1)
const originalFetch = global.fetch
let client: QueryClient
const fetchMock = jest.fn()

const respond = (data: DefaultedMarketsData) => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => data })
}
const advance = async (ms = 1) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms)
  })
}
const mount = (data?: DefaultedMarketsData) => {
  if (data) client.setQueryData(key, data)
  return renderHook(({ chainId }) => useDefaultedMarkets(chainId), {
    initialProps: { chainId: 1 },
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}
const refresh = async () => {
  await act(async () => {
    await client.refetchQueries({ queryKey: key })
  })
  await advance()
}

beforeEach(() => {
  jest.useFakeTimers()
  window.localStorage.clear()
  client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  })
  fetchMock.mockReset()
  global.fetch = fetchMock
  jest
    .mocked(fetchDefaultedMarkets)
    .mockReset()
    .mockRejectedValue(new Error("Subgraph unavailable"))
  respond(clear)
})

afterEach(() => {
  cleanup()
  client.clear()
  global.fetch = originalFetch
  jest.useRealTimers()
})

it("keeps status unknown until a successful lookup", async () => {
  const { result } = mount()
  expect(result.current.isLoading).toBe(true)
  expect(result.current.isDefaulted(address)).toBeUndefined()
  await advance()
  expect(result.current.isDefaulted(address)).toBe(false)
  expect(result.current.isError).toBe(false)
})

it("keeps partial results unknown without blocking a resolved market", async () => {
  respond({ markets: {}, unknown: [address] })
  const { result } = mount()
  await advance()
  expect(result.current.isDefaulted(address.toUpperCase())).toBeUndefined()
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  expect(result.current.isError).toBe(true)
})

it("preserves a historical default and borrower warning through a partial refresh and reload", async () => {
  const { result, unmount } = mount(confirmed)
  respond({ markets: {}, unknown: [address, otherAddress] })
  await refresh()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.defaultedAt(address)).toBe(123)
  expect(result.current.defaultedMarketsOfBorrower(borrower)).toEqual([address])
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()

  unmount()
  client.clear()
  seedDefaultedMarkets(client)
  respond(clear)
  const reloaded = mount()
  expect(reloaded.result.current.isDefaulted(address)).toBe(true)
  expect(reloaded.result.current.isDefaulted(otherAddress)).toBeUndefined()
  await advance()
  expect(reloaded.result.current.isDefaulted(address)).toBe(true)
  expect(reloaded.result.current.isDefaulted(otherAddress)).toBe(false)
})

it("does not erase an observed historical default when a refresh omits it", async () => {
  const { result } = mount(confirmed)
  await refresh()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.defaultedMarketsOfBorrower(borrower)).toEqual([address])
})

it("recovers automatically after the API and fallback are unavailable", async () => {
  fetchMock.mockRejectedValue(new Error("API unavailable"))
  const { result } = mount()
  await advance(1100)
  expect(result.current.isError).toBe(true)
  expect(result.current.isLoading).toBe(false)
  expect(result.current.isDefaulted(address)).toBeUndefined()
  expect(fetchDefaultedMarkets).toHaveBeenCalled()

  respond(clear)
  await advance(5 * 60_000)
  expect(result.current.isDefaulted(address)).toBe(false)
  expect(result.current.isError).toBe(false)
})

it("retains positive defaults but suspends a cached clear status after a failed refresh", async () => {
  const { result } = mount(confirmed)
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  fetchMock.mockRejectedValue(new Error("API unavailable"))
  act(() => {
    client.refetchQueries({ queryKey: key })
  })
  await advance(1100)
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()

  respond(clear)
  await refresh()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
})

it("does not carry defaults to another chain", async () => {
  const { result, rerender } = mount(confirmed)
  rerender({ chainId: 11155111 })
  expect(result.current.isDefaulted(address)).toBeUndefined()
  await advance()
  expect(result.current.isDefaulted(address)).toBe(false)
  expect(result.current.defaultedMarketsOfBorrower(borrower)).toEqual([])
})
