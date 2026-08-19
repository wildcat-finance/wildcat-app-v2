/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

import {
  BorrowerInvitationStatus,
  useBorrowerInvitationExists,
} from "./useBorrowerInvitation"

const useSelectedNetworkMock = jest.fn()

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => useSelectedNetworkMock(),
}))

jest.mock("@/hooks/useApiAuth", () => ({
  useAuthToken: jest.fn(),
  useRemoveBadApiToken: () => ({ mutate: jest.fn() }),
}))

const SEPOLIA_CHAIN_ID = 11155111
const BORROWER_ADDRESS = "0xca732651410e915090d7a7d889a1e44ef4575fce"

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

const createHeadResponse = (status: number, signed?: string) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => (name === "Signed" ? signed ?? null : null),
    },
  }) as Response

describe("useBorrowerInvitationExists", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: fetchMock,
    })
    useSelectedNetworkMock.mockReturnValue({
      chainId: SEPOLIA_CHAIN_ID,
      isTestnet: true,
    })
  })

  it("resolves a missing invitation without returning query data", async () => {
    fetchMock.mockResolvedValue(createHeadResponse(404))

    const { result } = renderHook(
      () => useBorrowerInvitationExists(BORROWER_ADDRESS),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.isError).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/invite/${BORROWER_ADDRESS}?chainId=${SEPOLIA_CHAIN_ID}`,
      { method: "HEAD" },
    )
  })

  it("keeps a failed lookup in the query error state", async () => {
    fetchMock.mockResolvedValue(createHeadResponse(500))

    const { result } = renderHook(
      () => useBorrowerInvitationExists(BORROWER_ADDRESS),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.isSuccess).toBe(false)
  })

  it.each([
    [undefined, BorrowerInvitationStatus.PendingSignature],
    ["true", BorrowerInvitationStatus.PendingRegistration],
  ])(
    "maps a successful lookup to its invitation state",
    async (signed, state) => {
      fetchMock.mockResolvedValue(createHeadResponse(200, signed))

      const { result } = renderHook(
        () => useBorrowerInvitationExists(BORROWER_ADDRESS),
        { wrapper: createWrapper() },
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBe(state)
    },
  )
})
