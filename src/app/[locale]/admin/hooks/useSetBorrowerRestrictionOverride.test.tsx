import React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// eslint-disable-next-line import/no-extraneous-dependencies
import { renderHook, waitFor } from "@testing-library/react"

import { useSetBorrowerRestrictionOverride } from "./useSetBorrowerRestrictionOverride"

const BORROWER = "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1"

const authToken: { token?: unknown } = {}
jest.mock("@/hooks/useApiAuth", () => ({
  useAuthToken: () => authToken.token,
  useRemoveBadApiToken: () => ({ mutate: jest.fn() }),
}))

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 11155111 }),
}))

const originalFetch = global.fetch

const renderOverride = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useSetBorrowerRestrictionOverride(BORROWER), {
    wrapper,
  })
}

describe("useSetBorrowerRestrictionOverride", () => {
  afterEach(() => {
    global.fetch = originalFetch
  })

  it("PUTs the override with the admin bearer token", async () => {
    authToken.token = {
      token: "jwt-token",
      isAdmin: true,
      chainId: 11155111,
      address: "0xadmin",
    }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ restricted: true, source: "override" }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
    const { result } = renderOverride()
    result.current.mutate("restricted")
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `/api/borrowers/${BORROWER.toLowerCase()}/restriction?chainId=11155111`,
    )
    expect(init.method).toBe("PUT")
    expect(init.headers.Authorization).toBe("Bearer jwt-token")
    expect(JSON.parse(init.body)).toEqual({ override: "restricted" })
  })

  it("refuses without an admin token for the chain", async () => {
    authToken.token = {
      token: "jwt-token",
      isAdmin: false,
      chainId: 11155111,
      address: "0xuser",
    }
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const { result } = renderOverride()
    result.current.mutate(null)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
