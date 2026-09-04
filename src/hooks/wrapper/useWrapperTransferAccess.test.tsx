/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { Market, TokenWrapper } from "@wildcatfi/wildcat-sdk"

import {
  canWrapWithTransferAccess,
  useWrapperTransferAccess,
} from "./useWrapperTransferAccess"

const readTransferAccessMock = jest.fn()
const useEthersProviderMock = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  readMarketTransferRecipientAllowed: (...args: unknown[]) =>
    readTransferAccessMock(...args),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: (...args: unknown[]) => useEthersProviderMock(...args),
}))

const CHAIN_ID = 11155111
const HOOKS_ADDRESS = "0x1111111111111111111111111111111111111111"
const MARKET_ADDRESS = "0x2222222222222222222222222222222222222222"
const WRAPPER_ADDRESS = "0x3333333333333333333333333333333333333333"
const provider = { call: jest.fn() }

const market = {
  address: MARKET_ADDRESS,
  chainId: CHAIN_ID,
  eventGeneration: "v2.5",
  hooksConfig: { hooksAddress: HOOKS_ADDRESS },
} as unknown as Market

const wrapperContract = {
  address: WRAPPER_ADDRESS,
} as TokenWrapper

const createQueryWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { wrapper }
}

describe("useWrapperTransferAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useEthersProviderMock.mockReturnValue({ provider })
  })

  it.each([
    [true, "allowed", true],
    [false, "denied", false],
  ] as const)(
    "maps an authoritative %s response to %s",
    async (isAllowed, expectedStatus, expectedCanWrap) => {
      readTransferAccessMock.mockResolvedValue(isAllowed)
      const { wrapper } = createQueryWrapper()
      const { result } = renderHook(
        () => useWrapperTransferAccess(market, wrapperContract),
        { wrapper },
      )

      expect(result.current.accessStatus).toBe("checking")
      expect(result.current.canWrap).toBe(false)

      await waitFor(() => {
        expect(result.current.accessStatus).toBe(expectedStatus)
      })

      expect(result.current.canWrap).toBe(expectedCanWrap)
      expect(readTransferAccessMock).toHaveBeenCalledWith(
        provider,
        HOOKS_ADDRESS,
        MARKET_ADDRESS,
        WRAPPER_ADDRESS,
      )
    },
  )

  it("keeps read failures distinct from policy denial", async () => {
    readTransferAccessMock.mockRejectedValue(new Error("rpc unavailable"))
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useWrapperTransferAccess(market, wrapperContract),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.accessStatus).toBe("error")
    })

    expect(result.current.canWrap).toBe(false)
  })

  it("does not call the v2.5 reader for legacy markets", () => {
    const legacyMarket = {
      ...market,
      eventGeneration: "legacy",
    } as Market
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useWrapperTransferAccess(legacyMarket, wrapperContract),
      { wrapper },
    )

    expect(result.current.accessStatus).toBe("not-applicable")
    expect(result.current.canWrap).toBe(true)
    expect(readTransferAccessMock).not.toHaveBeenCalled()
  })
})

describe("canWrapWithTransferAccess", () => {
  it.each([
    ["not-applicable", true],
    ["allowed", true],
    ["checking", false],
    ["denied", false],
    ["error", false],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(canWrapWithTransferAccess(status)).toBe(expected)
  })
})
