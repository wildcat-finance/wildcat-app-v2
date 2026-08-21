import React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// eslint-disable-next-line import/no-extraneous-dependencies
import { renderHook, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"

import { makeStore } from "@/store/store"

import { useBorrowerRestriction } from "./useBorrowerRestriction"

const BORROWER = "0x1717503ee3f56e644cf8b1058e3f83f03a71b2e1"

jest.mock("wagmi", () => ({
  useAccount: () => ({ address: BORROWER }),
}))

jest.mock("./useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 11155111 }),
}))

const renderRestriction = (store: ReturnType<typeof makeStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  )
  return renderHook(() => useBorrowerRestriction(), { wrapper })
}

const originalFetch = global.fetch

const mockFetch = (implementation: jest.Mock) => {
  global.fetch = implementation as unknown as typeof fetch
}

describe("useBorrowerRestriction", () => {
  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("blocks from a successful restricted read and caches it", async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ restricted: true, source: "removal" }),
      }),
    )
    const store = makeStore()
    const { result } = renderRestriction(store)
    await waitFor(() => expect(result.current.gateState).toBe("blocked"))
    expect(result.current.restricted).toBe(true)
    await waitFor(() =>
      expect(
        store.getState().borrowerRestriction[`${BORROWER}_11155111`],
      ).toEqual({ restricted: true, source: "removal" }),
    )
  })

  it("stays blocked on a failed read when the last known state was restricted", async () => {
    mockFetch(jest.fn().mockRejectedValue(new Error("backend down")))
    const store = makeStore()
    store.dispatch({
      type: "borrowerRestriction/setLastKnownRestriction",
      payload: {
        address: BORROWER,
        chainId: 11155111,
        state: { restricted: true, source: "removal" },
      },
    })
    const { result } = renderRestriction(store)
    await waitFor(() => expect(result.current.gateState).toBe("blocked"))
    expect(result.current.restricted).toBe(true)
  })

  it("reports unknown on a failed read with no last known state", async () => {
    mockFetch(jest.fn().mockRejectedValue(new Error("backend down")))
    const { result } = renderRestriction(makeStore())
    await waitFor(() => expect(result.current.gateState).toBe("unknown"))
    expect(result.current.restricted).toBe(false)
  })

  it("unblocks from a successful unrestricted read", async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ restricted: false, source: "none" }),
      }),
    )
    const { result } = renderRestriction(makeStore())
    await waitFor(() => expect(result.current.gateState).toBe("unblocked"))
  })
})
