/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import {
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
) =>
  renderHook(
    () =>
      useWithdrawalBatchJoinWarning({
        marketAccount,
        requestAmount: token.getAmount(requestAmountRaw),
        dustFloor: token.parseAmount("0.00001"),
        requestIsValid: true,
        useExactScaledBalance,
        enabled: true,
      }),
    { wrapper: createWrapper() },
  )

describe("useWithdrawalBatchJoinWarning", () => {
  afterEach(() => {
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
    expect(noBatch.result.current.state).toBe("clear")
    expect(getWithdrawalBatch).not.toHaveBeenCalled()
    noBatch.unmount()

    const noShortfall = renderWarning()
    await waitFor(() => expect(noShortfall.result.current.state).toBe("clear"))
    expect(getWithdrawalBatch).toHaveBeenCalledTimes(1)
    noShortfall.unmount()
  })

  it("ignores sub-display-precision rounding dust", async () => {
    jest
      .spyOn(WithdrawalBatch, "getWithdrawalBatch")
      .mockResolvedValue(makeBatch(199_999_998n))

    const { result, unmount } = renderWarning()

    await waitFor(() => expect(result.current.state).toBe("clear"))
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
    updateMarket.mockImplementation(async () => {
      marketAccount.market.pendingWithdrawalExpiry = activeExpiry
    })

    const { result, unmount } = renderWarning(marketAccount)
    expect(result.current.state).toBe("clear")

    let refreshedState = "clear"
    await act(async () => {
      refreshedState = await result.current.refresh()
    })

    expect(refreshedState).toBe("warning")
    await waitFor(() => expect(result.current.state).toBe("warning"))
    expect(getWithdrawalBatch).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("surfaces an explicit unknown state when the decision-time read fails", async () => {
    const marketAccount = makeMarketAccount(0)
    const updateMarket = marketAccount.market.update as jest.Mock
    updateMarket.mockRejectedValue(new Error("RPC unavailable"))

    const { result, unmount } = renderWarning(marketAccount)
    let refreshedState = "clear"
    await act(async () => {
      refreshedState = await result.current.refresh()
    })

    expect(refreshedState).toBe("unknown")
    expect(result.current.state).toBe("unknown")
    unmount()
  })
})
