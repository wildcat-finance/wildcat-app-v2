/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { Market } from "@wildcatfi/wildcat-sdk"

import { useGetLenderWithdrawals } from "./useGetLenderWithdrawals"

const getIncompleteWithdrawalsMock = jest.fn()
const getWithdrawalUpdatesMock = jest.fn()
const useAccountMock = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  BatchStatus: {
    Complete: "Complete",
  },
  getSubgraphClient: (chainId: number) => ({ chainId }),
  getIncompleteLenderWithdrawalsForMarket: (...args: unknown[]) =>
    getIncompleteWithdrawalsMock(...args),
  getLatestLensContract: () => ({
    getWithdrawalBatchesDataWithLenderStatus: (...args: unknown[]) =>
      getWithdrawalUpdatesMock(...args),
  }),
  logger: {
    debug: jest.fn(),
  },
}))

jest.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
}))

const SEPOLIA_CHAIN_ID = 11155111
const MARKET_ADDRESS = "0x1111111111111111111111111111111111111111"
const LENDER_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const LENDER_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

const zeroAmount = {
  add: jest.fn(),
}

const market = {
  address: MARKET_ADDRESS,
  chainId: SEPOLIA_CHAIN_ID,
  provider: {},
  underlyingToken: {
    getAmount: () => zeroAmount,
  },
} as unknown as Market

const withdrawalA = {
  lender: LENDER_A,
  expiry: 123,
  effectiveStatus: "Pending",
  isCompleted: false,
  isConcluded: false,
  requests: [],
  batch: {},
}

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
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

describe("useGetLenderWithdrawals", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getWithdrawalUpdatesMock.mockReturnValue(
      new Promise(() => {
        // Keep the live refresh pending; this test targets initial-query identity.
      }),
    )
  })

  it("does not expose the previous lender's withdrawals after an identity change", async () => {
    const lenderBWithdrawals = createDeferred<never[]>()
    useAccountMock.mockReturnValue({ address: LENDER_A })
    getIncompleteWithdrawalsMock.mockImplementation(
      (_client: unknown, { lender }: { lender: string }) =>
        lender === LENDER_A
          ? Promise.resolve([withdrawalA])
          : lenderBWithdrawals.promise,
    )

    const { result, rerender } = renderHook(
      () => useGetLenderWithdrawals(market),
      { wrapper: createWrapper() },
    )

    await waitFor(() =>
      expect(result.current.data.activeWithdrawal).toBe(withdrawalA),
    )

    useAccountMock.mockReturnValue({ address: LENDER_B })
    rerender()

    await waitFor(() =>
      expect(getIncompleteWithdrawalsMock).toHaveBeenCalledWith(
        { chainId: SEPOLIA_CHAIN_ID },
        expect.objectContaining({ lender: LENDER_B }),
      ),
    )
    expect(result.current.data.activeWithdrawal).toBeUndefined()
  })
})
