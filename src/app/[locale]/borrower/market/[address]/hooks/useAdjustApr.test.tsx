/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { useAdjustAPR } from "./useAdjustApr"

const waitForSubmittedTransactionMock = jest.fn()

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({ connected: false, sdk: {} }),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => ({
    signer: { provider: {} },
    address: "0x1111111111111111111111111111111111111111",
    targetChainId: 11155111,
  }),
}))

jest.mock("../../../../../../utils/transactions", () => ({
  waitForSubmittedTransaction: (...args: unknown[]) =>
    waitForSubmittedTransactionMock(...args),
}))

const HASH = `0x${"1".padStart(64, "0")}`
const TRANSACTION_HASH = `0x${"2".padStart(64, "0")}`

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useAdjustAPR", () => {
  const proposeAnnualInterestBips = jest.fn()
  const setAnnualInterestBips = jest.fn()
  const marketAccount = {
    chainId: 11155111,
    market: {
      chainId: 11155111,
      address: "0x2222222222222222222222222222222222222222",
      periodicHooksConfig: {
        hooksAddress: "0x3333333333333333333333333333333333333333",
      },
    },
    proposeAnnualInterestBips,
    setAnnualInterestBips,
  } as unknown as MarketAccount

  beforeEach(() => {
    jest.clearAllMocks()
    proposeAnnualInterestBips.mockResolvedValue(HASH)
    setAnnualInterestBips.mockResolvedValue(HASH)
    waitForSubmittedTransactionMock.mockResolvedValue({
      hash: TRANSACTION_HASH,
      receipt: {},
    })
  })

  it("routes periodic APR reductions through the SDK proposal helper", async () => {
    const setTxHash = jest.fn()
    const { result } = renderHook(
      () => useAdjustAPR(marketAccount, setTxHash),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      await result.current.mutateAsync({ apr: 2, mode: "propose" })
    })

    expect(proposeAnnualInterestBips).toHaveBeenCalledWith(200)
    expect(setAnnualInterestBips).not.toHaveBeenCalled()
    expect(setTxHash).toHaveBeenNthCalledWith(1, HASH)
    expect(setTxHash).toHaveBeenNthCalledWith(2, TRANSACTION_HASH)
  })

  it("keeps ordinary APR changes on the existing SDK setter", async () => {
    const setTxHash = jest.fn()
    const { result } = renderHook(
      () => useAdjustAPR(marketAccount, setTxHash),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      await result.current.mutateAsync({ apr: 11, mode: "set" })
    })

    expect(setAnnualInterestBips).toHaveBeenCalledWith(1_100)
    expect(proposeAnnualInterestBips).not.toHaveBeenCalled()
  })
})
