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
const now = Date.parse("2026-11-06T00:00:00Z")
const clear: DefaultedMarketsData = {
  markets: {},
  unknown: [],
  asOfTimestamp: now / 1000,
}
const confirmed: DefaultedMarketsData = {
  markets: { [address]: knownDefault },
  unknown: [],
  asOfTimestamp: now / 1000,
}
const key = QueryKeys.Markets.GET_DEFAULTED_MARKETS(1)
const originalFetch = global.fetch
let client: QueryClient
const fetchMock = jest.fn()

const respond = (
  data: Omit<DefaultedMarketsData, "asOfTimestamp">,
  asOfTimestamp?: number | null,
) => {
  fetchMock.mockImplementation(async () => ({
    ok: true,
    json: async () => ({
      ...data,
      asOfTimestamp:
        asOfTimestamp === undefined
          ? Math.floor(Date.now() / 1000)
          : asOfTimestamp,
    }),
  }))
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
  jest.useFakeTimers({ now })
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

it("does not clear a market from a six-hour-old browser seed while revalidating", async () => {
  const oldTimestamp = now / 1000 - 6 * 60 * 60
  window.localStorage.setItem(
    "wildcat:defaulted-markets:v1",
    JSON.stringify({
      1: {
        savedAt: oldTimestamp * 1000,
        data: { ...confirmed, asOfTimestamp: oldTimestamp },
      },
    }),
  )
  let complete!: () => void
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = () => resolve({ ok: true, json: async () => clear })
      }),
  )
  seedDefaultedMarkets(client)
  const { result } = mount()
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isLoading).toBe(false)
  await advance()
  act(() => complete())
  await advance()
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  expect(result.current.isDefaulted(address)).toBe(true)
})

it("expires a partly aged seed at the source deadline even when its refresh hangs", async () => {
  fetchMock.mockReturnValue(new Promise(() => {}))
  const { result } = mount({ ...confirmed, asOfTimestamp: now / 1000 - 240 })
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  await advance(59_000)
  expect(fetchMock).not.toHaveBeenCalled()
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  await advance(1002)
  await advance()
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isLoading).toBe(false)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it("expires a live result while an automatic refresh is pending", async () => {
  const { result } = mount()
  await advance()
  expect(result.current.isDefaulted(address)).toBe(false)
  fetchMock.mockReturnValue(new Promise(() => {}))
  await advance(5 * 60_000)
  await advance()
  expect(result.current.isDefaulted(address)).toBeUndefined()
  expect(result.current.isLoading).toBe(false)
})

it("does not renew clearance or repeatedly refetch an old HTTP 200 snapshot", async () => {
  const timestamp = now / 1000 - 6 * 60 * 60
  respond(confirmed, timestamp)
  jest
    .mocked(fetchDefaultedMarkets)
    .mockResolvedValue({ ...confirmed, asOfTimestamp: timestamp })
  const { result } = mount()
  await advance(1000)
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await advance(5 * 60_000)
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it("uses the existing direct fallback when the API serves an expired snapshot", async () => {
  respond(clear, now / 1000 - 6 * 60 * 60)
  jest.mocked(fetchDefaultedMarkets).mockResolvedValue(clear)
  const { result } = mount()
  await advance()
  expect(fetchDefaultedMarkets).toHaveBeenCalledTimes(1)
  expect(result.current.isDefaulted(address)).toBe(false)
})

it("does not extend the source deadline when an identical snapshot is received again", async () => {
  respond(clear, now / 1000)
  const { result } = mount()
  await advance()
  await advance(2 * 60_000)
  await refresh()
  expect(result.current.isDefaulted(address)).toBe(false)
  await advance(3 * 60_000 + 2)
  await advance()
  expect(result.current.isDefaulted(address)).toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it.each([null, now / 1000 + 60])(
  "does not clear a market with an invalid source time (%s)",
  async (timestamp) => {
    respond(confirmed, timestamp)
    jest
      .mocked(fetchDefaultedMarkets)
      .mockResolvedValue({ ...confirmed, asOfTimestamp: timestamp })
    const { result } = mount()
    await advance()
    expect(result.current.isDefaulted(address)).toBe(true)
    expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  },
)

it("rejects old browser payloads that have no source timestamp", () => {
  window.localStorage.setItem(
    "wildcat:defaulted-markets:v1",
    JSON.stringify({
      1: { savedAt: now, data: { markets: {}, unknown: [] } },
    }),
  )
  seedDefaultedMarkets(client)
  expect(client.getQueryData(key)).toBeUndefined()
})

it("deduplicates an expiry refresh across observers", async () => {
  const first = mount()
  const second = mount()
  await advance()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fetchMock.mockReturnValue(new Promise(() => {}))
  await advance(5 * 60_000)
  await advance()
  expect(first.result.current.isDefaulted(address)).toBeUndefined()
  expect(second.result.current.isDefaulted(address)).toBeUndefined()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
