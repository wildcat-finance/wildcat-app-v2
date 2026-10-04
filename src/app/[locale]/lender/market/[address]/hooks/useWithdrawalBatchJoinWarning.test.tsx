/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import {
  Market,
  MarketAccount,
  MarketVersion,
  RAY,
  SignerOrProvider,
  SupportedChainId,
  Token,
  WithdrawalBatch,
} from "@wildcatfi/wildcat-sdk"

import { useWithdrawalBatchJoinWarning } from "./useWithdrawalBatchJoinWarning"

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "USD Coin",
  "USDC",
  6,
  false,
  {} as SignerOrProvider,
)

const now = Math.floor(Date.now() / 1000)
const activeExpiry = now + 3_600

const makeMarketAccount = (pendingWithdrawalExpiry = activeExpiry) => {
  const market = {
    address: "0x0000000000000000000000000000000000000002",
    chainId: SupportedChainId.Sepolia,
    version: MarketVersion.V2,
    eventGeneration: "legacy",
    isClosed: false,
    pendingWithdrawalExpiry,
    withdrawalBatchDuration: 10_800,
    scaleFactor: 2n * RAY,
    underlyingToken: token,
    update: jest.fn().mockResolvedValue(undefined),
  }

  return {
    market,
    account: "0x0000000000000000000000000000000000000003",
    scaledMarketBalance: 100_000_000n,
  } as unknown as MarketAccount
}

const makeBatch = (
  normalizedTotalAmountRaw: bigint,
  scaledTotalAmount = 100_000_000n,
) =>
  ({
    expiry: activeExpiry,
    scaledTotalAmount,
    normalizedTotalAmount: token.getAmount(normalizedTotalAmountRaw),
  }) as WithdrawalBatch

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const renderWarning = (
  marketAccount = makeMarketAccount(),
  useExactScaledBalance = false,
  requestAmountRaw = 200_000_000n,
  options = { enabled: true, requestIsValid: true },
) =>
  renderHook(
    (props) =>
      useWithdrawalBatchJoinWarning({
        marketAccount: props.marketAccount,
        requestAmount: token.getAmount(requestAmountRaw),
        dustFloor: token.parseAmount("0.00001"),
        requestIsValid: props.requestIsValid,
        useExactScaledBalance,
        enabled: props.enabled,
      }),
    {
      wrapper: createWrapper(),
      initialProps: { marketAccount, ...options },
    },
  )

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe("useWithdrawalBatchJoinWarning", () => {
  afterEach(() => {
    onlineManager.setOnline(true)
    jest.restoreAllMocks()
  })

  it("warns and estimates the payout for a discounted active batch", async () => {
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(100_000_000n))

    const { result, unmount } = renderWarning()

    await waitFor(() => expect(result.current.state).toBe("warning"))
    expect(result.current.estimate?.estimatedPayout.raw).toBe(150_000_000n)
    expect(result.current.estimate?.estimatedLoss.raw).toBe(50_000_000n)
    expect(result.current.estimate?.lossPercentThousandths).toBe(25_000n)
    unmount()
  })

  it("stays clear for a new batch and for an active batch without a shortfall", async () => {
    const getWithdrawalBatch = jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(200_000_000n))

    const noBatch = renderWarning(makeMarketAccount(0))
    await waitFor(() => expect(noBatch.result.current.isChecking).toBe(false))
    expect(noBatch.result.current.state).toBe("clear")
    expect(getWithdrawalBatch).not.toHaveBeenCalled()
    noBatch.unmount()

    const noShortfall = renderWarning()
    await waitFor(() =>
      expect(noShortfall.result.current.isChecking).toBe(false),
    )
    expect(noShortfall.result.current.state).toBe("clear")
    expect(getWithdrawalBatch).toHaveBeenCalledTimes(1)
    noShortfall.unmount()
  })

  it("ignores sub-display-precision rounding dust", async () => {
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(199_999_998n))

    const { result, unmount } = renderWarning()

    await waitFor(() => expect(result.current.isChecking).toBe(false))
    expect(result.current.estimate?.estimatedLoss.raw).toBe(1n)
    expect(result.current.state).toBe("clear")
    unmount()
  })

  it("uses the live normalized value of a full scaled-balance request", async () => {
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(100_000_000n))

    const { result, unmount } = renderWarning(
      makeMarketAccount(),
      true,
      199_000_000n,
    )

    await waitFor(() => expect(result.current.state).toBe("warning"))
    expect(result.current.estimate?.estimatedPayout.raw).toBe(150_000_000n)
    expect(result.current.estimate?.estimatedLoss.raw).toBe(50_000_000n)
    unmount()
  })

  it("rechecks a clear decision and surfaces a newly opened batch", async () => {
    const marketAccount = makeMarketAccount(0)
    const getWithdrawalBatch = jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(100_000_000n))
    const updateMarket = marketAccount.market.update as jest.Mock
    const { result, unmount } = renderWarning(marketAccount)
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    expect(result.current.state).toBe("clear")
    updateMarket.mockImplementation(async function update(this: Market) {
      this.pendingWithdrawalExpiry = activeExpiry
    })

    let refreshedState = "clear"
    await act(async () => {
      refreshedState = await result.current.refresh()
    })

    expect(refreshedState).toBe("warning")
    await waitFor(() => expect(result.current.state).toBe("warning"))
    expect(getWithdrawalBatch).toHaveBeenCalledTimes(1)
    expect(marketAccount.market.pendingWithdrawalExpiry).toBe(0)
    unmount()
  })

  it("surfaces an explicit unknown state when the decision-time read fails", async () => {
    const marketAccount = makeMarketAccount(0)
    const updateMarket = marketAccount.market.update as jest.Mock
    const { result, unmount } = renderWarning(marketAccount)
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    updateMarket.mockRejectedValue(new Error("RPC unavailable"))
    let refreshedState = "clear"
    await act(async () => {
      refreshedState = await result.current.refresh()
    })

    expect(refreshedState).toBe("unknown")
    expect(result.current.state).toBe("unknown")
    unmount()
  })

  it("discovers a new batch on open before the lender enters an amount", async () => {
    const marketAccount = makeMarketAccount(0)
    const updateMarket = marketAccount.market.update as jest.Mock
    updateMarket.mockImplementation(async function update(this: Market) {
      this.pendingWithdrawalExpiry = activeExpiry
    })
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(100_000_000n))

    const { result, rerender, unmount } = renderWarning(
      marketAccount,
      false,
      200_000_000n,
      {
        enabled: false,
        requestIsValid: false,
      },
    )
    expect(updateMarket).not.toHaveBeenCalled()

    rerender({ marketAccount, enabled: true, requestIsValid: false })
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    expect(updateMarket).toHaveBeenCalledTimes(1)
    expect(result.current.state).toBe("clear")

    rerender({ marketAccount, enabled: true, requestIsValid: true })
    expect(result.current.state).toBe("warning")
    expect(updateMarket).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("shares an in-flight discovery with confirmation without showing a warning", async () => {
    const marketAccount = makeMarketAccount(0)
    const read = deferred()
    const updateMarket = marketAccount.market.update as jest.Mock
    updateMarket.mockReturnValue(read.promise)
    const { result, unmount } = renderWarning(marketAccount)
    expect(result.current.isChecking).toBe(true)
    expect(result.current.state).toBe("clear")

    let confirmation!: ReturnType<typeof result.current.refresh>
    act(() => {
      confirmation = result.current.refresh()
    })
    expect(updateMarket).toHaveBeenCalledTimes(1)
    expect(result.current.state).toBe("clear")

    await act(async () => {
      read.resolve()
      expect(await confirmation).toBe("clear")
    })
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    expect(result.current.state).toBe("clear")
    unmount()
  })

  it("keeps a confirmed loss visible while refreshing it", async () => {
    const marketAccount = makeMarketAccount()
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(100_000_000n))
    const { result, unmount } = renderWarning(marketAccount)
    await waitFor(() => expect(result.current.state).toBe("warning"))

    const read = deferred()
    const updateMarket = marketAccount.market.update as jest.Mock
    updateMarket.mockReturnValue(read.promise)
    let confirmation!: ReturnType<typeof result.current.refresh>
    act(() => {
      confirmation = result.current.refresh()
    })
    await waitFor(() => expect(result.current.isChecking).toBe(true))
    expect(result.current.state).toBe("warning")
    expect(result.current.estimate?.estimatedLoss.raw).toBe(50_000_000n)

    await act(async () => {
      read.resolve()
      expect(await confirmation).toBe("warning")
    })
    unmount()
  })

  it("keeps confirmation pending when a refresh pauses offline", async () => {
    const { result, unmount } = renderWarning(makeMarketAccount(0))
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    onlineManager.setOnline(false)

    let confirmation!: ReturnType<typeof result.current.refresh>
    act(() => {
      confirmation = result.current.refresh()
    })
    await waitFor(() => expect(result.current.isChecking).toBe(true))
    expect(result.current.state).toBe("clear")

    await act(async () => {
      onlineManager.setOnline(true)
      expect(await confirmation).toBe("clear")
    })
    unmount()
  })

  it("checks again on reopen even after a recent no-batch result", async () => {
    const marketAccount = makeMarketAccount(0)
    const { result, rerender, unmount } = renderWarning(marketAccount)
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    rerender({ marketAccount, enabled: false, requestIsValid: true })

    const updateMarket = marketAccount.market.update as jest.Mock
    updateMarket.mockImplementation(async function update(this: Market) {
      this.pendingWithdrawalExpiry = activeExpiry
    })
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(100_000_000n))
    rerender({ marketAccount, enabled: true, requestIsValid: true })

    await waitFor(() => expect(result.current.state).toBe("warning"))
    expect(updateMarket).toHaveBeenCalledTimes(2)
    unmount()
  })

  it("does not apply a late discovery result to a different market", async () => {
    const oldMarketAccount = makeMarketAccount()
    const read = deferred()
    const updateMarket = oldMarketAccount.market.update as jest.Mock
    updateMarket.mockReturnValue(read.promise)
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(100_000_000n))
    const { result, rerender, unmount } = renderWarning(oldMarketAccount)

    const newMarketAccount = makeMarketAccount(0)
    newMarketAccount.market.address =
      "0x0000000000000000000000000000000000000004"
    rerender({
      marketAccount: newMarketAccount,
      enabled: true,
      requestIsValid: true,
    })
    await waitFor(() => expect(result.current.isChecking).toBe(false))

    await act(async () => {
      read.resolve()
    })
    expect(result.current.state).toBe("clear")
    expect(result.current.expiry).toBeUndefined()
    expect(result.current.estimate).toBeUndefined()
    unmount()
  })
})
