/* eslint-disable import/no-extraneous-dependencies */
import { ReactNode } from "react"

import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"

import { QueryKeys } from "@/config/query-keys"
import {
  DefaultedMarketsData,
  fetchDefaultedMarkets,
} from "@/utils/defaultedMarkets"

import {
  prefetchDefaultedMarkets,
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
const thirdAddress = "0xdddddddddddddddddddddddddddddddddddddddd"
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
const respondAfter = (latency: number) => {
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({
                ...clear,
                asOfTimestamp: Math.floor(Date.now() / 1000),
              }),
            }),
          latency,
        )
      }),
  )
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
  focusManager.setFocused(undefined)
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

it("never lapses or changes identity across healthy refreshes", async () => {
  respondAfter(800)
  const { result } = mount()
  await advance(801)
  const settled = result.current
  expect(settled.isDefaulted(address)).toBe(false)

  let lapses = 0
  for (let elapsed = 0; elapsed < 10 * 60_000; elapsed += 250) {
    // eslint-disable-next-line no-await-in-loop
    await advance(250)
    if (result.current.isDefaulted(address) !== false) lapses += 1
  }
  expect(lapses).toBe(0)
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(10)
  // Nothing changed, so consumers held the same object throughout.
  expect(result.current).toBe(settled)
}, 60_000)

it("keeps a cleared market unlocked through a brief outage at refresh time", async () => {
  const { result } = mount()
  await advance()
  expect(result.current.isDefaulted(address)).toBe(false)
  // The next scheduled refresh fails on both the API and the fallback.
  fetchMock.mockRejectedValueOnce(new Error("API unavailable"))

  let lapses = 0
  for (let elapsed = 0; elapsed < 6 * 60_000; elapsed += 1_000) {
    // eslint-disable-next-line no-await-in-loop
    await advance(1_000)
    if (result.current.isDefaulted(address) !== false) lapses += 1
  }
  expect(fetchDefaultedMarkets).toHaveBeenCalledTimes(1)
  expect(lapses).toBe(0)
  expect(result.current.isError).toBe(false)
})

it("keeps an unexpired clear status through failed refreshes and ends it at the source deadline", async () => {
  const { result } = mount(confirmed)
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  fetchMock.mockRejectedValue(new Error("API unavailable"))

  await advance(4 * 60_000)
  expect(fetchDefaultedMarkets).toHaveBeenCalled()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  expect(result.current.isError).toBe(false)

  await advance(60_000 + 2)
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  expect(result.current.isError).toBe(true)

  respond(confirmed)
  await refresh()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  expect(result.current.isError).toBe(false)
})

it("recovers at the retry cadence once the API and fallback return", async () => {
  fetchMock.mockRejectedValue(new Error("API unavailable"))
  const { result } = mount()
  await advance()
  expect(result.current.isError).toBe(true)
  expect(result.current.isLoading).toBe(false)
  expect(result.current.isDefaulted(address)).toBeUndefined()
  expect(fetchDefaultedMarkets).toHaveBeenCalled()

  respond(clear)
  await advance(15_000)
  expect(result.current.isDefaulted(address)).toBe(false)
  expect(result.current.isError).toBe(false)
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
  respond(confirmed)
  const reloaded = mount()
  expect(reloaded.result.current.isDefaulted(address)).toBe(true)
  expect(reloaded.result.current.isDefaulted(otherAddress)).toBeUndefined()
  // One unresolved market in the seed does not lock the rest of the chain.
  expect(reloaded.result.current.isDefaulted(thirdAddress)).toBe(false)

  // The unresolved market is retried on load, not at the next interval.
  await act(async () => {
    await prefetchDefaultedMarkets(client, 1)
  })
  await advance()
  expect(reloaded.result.current.isDefaulted(address)).toBe(true)
  expect(reloaded.result.current.isDefaulted(otherAddress)).toBe(false)
})

it("drops a cached default that a complete refresh no longer reports", async () => {
  const { result } = mount(confirmed)
  await refresh()
  expect(result.current.isDefaulted(address)).toBe(false)
  expect(result.current.defaultedMarketsOfBorrower(borrower)).toEqual([])
  expect(
    JSON.parse(
      window.localStorage.getItem("wildcat:defaulted-markets:v2") ?? "{}",
    )[1].data.markets,
  ).toEqual({})
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
    "wildcat:defaulted-markets:v2",
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
        complete = () => resolve({ ok: true, json: async () => confirmed })
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
  // Renewal was attempted ahead of the deadline, and could not extend it.
  expect(fetchMock).toHaveBeenCalled()
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
  await advance(1002)
  await advance()
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isLoading).toBe(false)
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

it("keeps the chain locked while the index is more than five minutes behind", async () => {
  const lagging = () => ({
    ...confirmed,
    asOfTimestamp: Math.floor(Date.now() / 1000) - 6 * 60,
  })
  fetchMock.mockImplementation(async () => ({
    ok: true,
    json: async () => lagging(),
  }))
  jest.mocked(fetchDefaultedMarkets).mockImplementation(async () => lagging())
  const { result } = mount()
  await advance()
  expect(result.current.isDefaulted(address)).toBe(true)
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()

  let cleared = 0
  for (let elapsed = 0; elapsed < 10 * 60_000; elapsed += 15_000) {
    // eslint-disable-next-line no-await-in-loop
    await advance(15_000)
    if (result.current.isDefaulted(otherAddress) !== undefined) cleared += 1
  }
  expect(cleared).toBe(0)
  // It keeps asking at the recovery cadence, so it unlocks soon after the
  // index catches up.
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(30)
  respond(confirmed)
  await advance(15_000)
  expect(result.current.isDefaulted(otherAddress)).toBe(false)
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
  await advance(5 * 60_000 - 100)
  expect(fetchMock.mock.calls.length).toBeGreaterThan(3)
  expect(result.current.isDefaulted(address)).toBe(false)
  await advance(102)
  await advance()
  expect(result.current.isDefaulted(address)).toBeUndefined()
})

it.each([
  ["older", now / 1000 - 120],
  ["undated", null],
])(
  "does not let %s evidence replace an unexpired snapshot",
  async (_label, asOfTimestamp) => {
    const { result } = mount()
    await advance()
    expect(result.current.isDefaulted(address)).toBe(false)

    // A refresh that proves less than the snapshot already in hand.
    const worse = { markets: {}, unknown: [address], asOfTimestamp }
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => worse,
    }))
    jest.mocked(fetchDefaultedMarkets).mockResolvedValue(worse)
    await refresh()
    expect(result.current.isDefaulted(address)).toBe(false)
    expect(result.current.isError).toBe(false)

    // The snapshot in hand still ends at its own deadline.
    await advance(5 * 60_000)
    expect(result.current.isDefaulted(address)).toBeUndefined()
  },
)

it("abandons a stalled API request and uses the direct fallback", async () => {
  fetchMock.mockReturnValue(new Promise(() => {}))
  jest.mocked(fetchDefaultedMarkets).mockImplementation(async () => ({
    ...clear,
    asOfTimestamp: Math.floor(Date.now() / 1000),
  }))
  const { result } = mount()
  await advance(14_000)
  expect(fetchDefaultedMarkets).not.toHaveBeenCalled()
  expect(result.current.isDefaulted(address)).toBeUndefined()
  await advance(1_001)
  expect(fetchDefaultedMarkets).toHaveBeenCalledTimes(1)
  expect(result.current.isDefaulted(address)).toBe(false)
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
    "wildcat:defaulted-markets:v2",
    JSON.stringify({
      1: { savedAt: now, data: { markets: {}, unknown: [] } },
    }),
  )
  seedDefaultedMarkets(client)
  expect(client.getQueryData(key)).toBeUndefined()
})

it("deduplicates refreshes across observers", async () => {
  const first = mount()
  const second = mount()
  await advance()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await advance(60_000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(first.result.current.isDefaulted(address)).toBe(false)
  expect(second.result.current.isDefaulted(address)).toBe(false)
})

it("discards legacy v1 browser seeds", () => {
  window.localStorage.setItem(
    "wildcat:defaulted-markets:v1",
    JSON.stringify({ 1: { savedAt: now, data: confirmed } }),
  )
  seedDefaultedMarkets(client)
  expect(client.getQueryData(key)).toBeUndefined()
  expect(window.localStorage.getItem("wildcat:defaulted-markets:v1")).toBeNull()
})

it("keeps a hidden tab's status current", async () => {
  const { result } = mount()
  await advance()
  act(() => focusManager.setFocused(false))
  // One refresh fails while hidden; the cadence must carry on regardless.
  fetchMock.mockRejectedValueOnce(new Error("API unavailable"))
  await advance(10 * 60_000)
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(10)
  expect(result.current.isDefaulted(address)).toBe(false)
})

it("refetches at once when focus returns to an expired status", async () => {
  const { result } = mount()
  await advance()
  expect(result.current.isDefaulted(address)).toBe(false)

  // Nothing gets through while the tab is away, as when a device sleeps.
  act(() => focusManager.setFocused(false))
  fetchMock.mockRejectedValue(new Error("Network unavailable"))
  await advance(6 * 60_000)
  expect(result.current.isDefaulted(address)).toBeUndefined()

  respond(clear)
  const calls = fetchMock.mock.calls.length
  act(() => focusManager.setFocused(true))
  await advance()
  expect(fetchMock).toHaveBeenCalledTimes(calls + 1)
  expect(result.current.isDefaulted(address)).toBe(false)
})

it("keeps the last snapshot for display while an expired status refreshes", async () => {
  const { result } = mount(confirmed)
  fetchMock.mockReturnValue(new Promise(() => {}))
  await advance(5 * 60_000)
  await advance()
  expect(result.current.isDefaulted(otherAddress)).toBeUndefined()
  expect(result.current.isDefaultedForDisplay(otherAddress)).toBe(false)
  expect(result.current.isDefaultedForDisplay(address)).toBe(true)
  expect(result.current.hasStatus).toBe(true)
})

it("has no display status for unresolved markets or before any snapshot", async () => {
  fetchMock.mockRejectedValue(new Error("API unavailable"))
  const { result } = mount()
  await advance(1100)
  expect(result.current.hasStatus).toBe(false)
  expect(result.current.isDefaultedForDisplay(address)).toBeUndefined()

  respond({ markets: {}, unknown: [address] })
  await refresh()
  expect(result.current.hasStatus).toBe(true)
  expect(result.current.isDefaultedForDisplay(address)).toBeUndefined()
  expect(result.current.isDefaultedForDisplay(otherAddress)).toBe(false)
})
