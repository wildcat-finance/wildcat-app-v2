/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { useApprove } from "./useGetApproval"

const invalidateMarketAccountQueriesMock = jest.fn()
const useAccountMock = jest.fn()
const useCurrentNetworkMock = jest.fn()
const useEthersSignerMock = jest.fn()
const useSafeAppsSDKMock = jest.fn()
const waitForApprovalMock = jest.fn()

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => useSafeAppsSDKMock(),
}))

jest.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
}))

jest.mock("@/components/Toasts", () => ({
  toastRequest: <T,>(promise: Promise<T>) => promise,
}))

jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => useCurrentNetworkMock(),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: () => useEthersSignerMock(),
}))

jest.mock("@/utils/marketAccountQueries", () => ({
  invalidateMarketAccountQueries: (...args: unknown[]) =>
    invalidateMarketAccountQueriesMock(...args),
}))

jest.mock("@/utils/transactions", () => ({
  ...jest.requireActual("@/utils/transactions"),
  waitForApproval: (...args: unknown[]) => waitForApprovalMock(...args),
}))

const CHAIN_ID = 11155111
const ACCOUNT = "0x1111111111111111111111111111111111111111"
const MARKET = "0x2222222222222222222222222222222222222222"
const HASH = `0x${"1".repeat(64)}`

const createQueryWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe("useApprove", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAccountMock.mockReturnValue({ address: ACCOUNT })
    useCurrentNetworkMock.mockReturnValue({ targetChainId: CHAIN_ID })
    useEthersSignerMock.mockReturnValue({
      chainId: CHAIN_ID,
      getAddress: jest.fn().mockResolvedValue(ACCOUNT),
    })
    useSafeAppsSDKMock.mockReturnValue({ connected: false, sdk: {} })
  })

  it("uses the exact owner, token, and spender allowance as completion", async () => {
    const amount = {
      raw: BigInt(10),
      format: () => "10",
    } as TokenAmount
    const approve = jest.fn().mockResolvedValue(HASH)
    const allowance = jest.fn().mockResolvedValue({ raw: BigInt(10) })
    const token = {
      approve,
      allowance,
      symbol: "USDC",
    } as unknown as Token
    const market = { address: MARKET, chainId: CHAIN_ID } as Market
    const setTxHash = jest.fn()
    waitForApprovalMock.mockImplementation(
      async ({
        hash,
        isAllowanceSufficient,
        onTransactionHash,
      }: {
        hash: string
        isAllowanceSufficient: () => Promise<boolean>
        onTransactionHash?: (hash: string) => void
      }) => {
        expect(await isAllowanceSufficient()).toBe(true)
        onTransactionHash?.(hash)
        return hash
      },
    )
    const { client, wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useApprove(token, market, setTxHash), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync(amount)
    })

    expect(approve).toHaveBeenCalledWith(MARKET.toLowerCase(), amount)
    expect(allowance).toHaveBeenCalledWith(ACCOUNT, MARKET)
    expect(setTxHash).toHaveBeenCalledWith(HASH)
    expect(invalidateMarketAccountQueriesMock).toHaveBeenCalledWith({
      client,
      chainId: CHAIN_ID,
      marketAddress: MARKET,
      accountAddress: ACCOUNT,
    })
  })
})
