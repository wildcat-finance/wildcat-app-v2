import { useQuery } from "@tanstack/react-query"
// eslint-disable-next-line import/no-extraneous-dependencies
import { act, renderHook } from "@testing-library/react"
import {
  Market,
  MarketAccount,
  SupportedChainId,
  Token,
  TokenAmount,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"

import { useWrapperAccountState } from "@/hooks/wrapper/useWrapperAccountState"

import { useWithdrawRouting } from "./useWithdrawRouting"

jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x0000000000000000000000000000000000000001" }),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => ({ publicClient: undefined }),
}))
jest.mock("@/hooks/wrapper/useWrapperAccountState", () => ({
  useWrapperAccountState: jest.fn(),
}))
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }))

const fixture = (wrappedLimit = 50_000_000n) => {
  const provider = {
    call: async () => {
      throw new Error("Unexpected RPC call")
    },
  }
  const token = (address: string, symbol: string) =>
    new Token(
      SupportedChainId.Sepolia,
      address,
      symbol,
      symbol,
      6,
      false,
      provider,
    )
  const underlying = token(
    "0x0000000000000000000000000000000000000010",
    "ASSET",
  )
  const receipt = token("0x0000000000000000000000000000000000000020", "RECEIPT")
  const shares = token("0x0000000000000000000000000000000000000030", "SHARE")
  const market = {
    chainId: SupportedChainId.Sepolia,
    underlyingToken: underlying,
    marketToken: receipt,
  } as Market
  const marketAccount = {
    market,
    marketBalance: receipt.getAmount(100_000_000n),
  } as MarketAccount
  const wrapper = new TokenWrapper({
    provider,
    chainId: market.chainId,
    address: shares.address,
    marketAddress: receipt.address,
    marketToken: receipt,
    shareToken: shares,
  })
  const preview = jest
    .spyOn(wrapper, "previewWithdraw")
    .mockImplementation(async (amount) => {
      expect(amount.token).toBe(receipt)
      return shares.getAmount(amount.raw / 2n)
    })
  jest
    .mocked(useQuery)
    .mockReturnValue({ data: undefined } as ReturnType<typeof useQuery>)
  jest.mocked(useWrapperAccountState).mockReturnValue({
    data: {
      balances: { shareBalance: shares.getAmount(25_000_000n) },
      limits: { maxWithdraw: receipt.getAmount(wrappedLimit) },
    },
  } as ReturnType<typeof useWrapperAccountState>)
  return { underlying, receipt, shares, marketAccount, wrapper, preview }
}

describe("withdrawal routing token units", () => {
  beforeEach(() => jest.clearAllMocks())

  it("combines direct and wrapped claims in underlying units", () => {
    const data = fixture()
    const { result } = renderHook(() =>
      useWithdrawRouting({ ...data, hasWrapper: true }),
    )
    expect(result.current.direct.raw).toBe(100_000_000n)
    expect(result.current.wrappedAvailable?.raw).toBe(50_000_000n)
    expect(result.current.combinedMax.raw).toBe(150_000_000n)
    const amounts = [
      result.current.direct,
      result.current.wrappedAvailable,
      result.current.combinedMax,
    ]
    amounts.forEach((amount) => {
      expect(amount?.token).toBe(data.underlying)
    })
  })

  it("splits a typed amount and converts only the wrapper input to receipt units", async () => {
    const data = fixture()
    const { result } = renderHook(() =>
      useWithdrawRouting({ ...data, hasWrapper: true }),
    )
    act(() => result.current.handleAmountChange("120"))
    expect(result.current.route.fromDirect.raw).toBe(100_000_000n)
    expect(result.current.route.fromWrapped.raw).toBe(20_000_000n)
    expect(result.current.route.amount.token).toBe(data.underlying)
    expect(result.current.route.fromWrapped.token).toBe(data.underlying)
    expect(result.current.isValid).toBe(true)
    const { calls } = jest.mocked(useQuery).mock
    const query = calls[calls.length - 1][0] as unknown as {
      enabled: boolean
      queryFn: () => Promise<TokenAmount>
    }
    expect(query.enabled).toBe(true)
    const preview = await query.queryFn()
    expect(preview.token).toBe(data.shares)
    expect(preview.raw).toBe(10_000_000n)
    expect(data.preview.mock.calls[0][0].raw).toBe(20_000_000n)
  })

  it("retains exact wrapper shares for a full wrapped-only withdrawal", () => {
    const data = fixture()
    const { result } = renderHook(() =>
      useWithdrawRouting({ ...data, hasWrapper: true }),
    )
    act(() => result.current.toggleWrappedOnly())
    act(() => result.current.fillMax())
    expect(result.current.route.amount.raw).toBe(50_000_000n)
    expect(result.current.route.fromDirect.raw).toBe(0n)
    expect(result.current.route.keepsDirect).toBe(true)
    expect(result.current.route.isFullWrapped).toBe(true)
    expect(result.current.route.sharesToRedeem?.token).toBe(data.shares)
    expect(result.current.route.sharesToRedeem?.raw).toBe(25_000_000n)
  })

  it("ignores wrapped dust using the same nominal scale", () => {
    const data = fixture(1n)
    const { result } = renderHook(() =>
      useWithdrawRouting({ ...data, hasWrapper: true }),
    )
    expect(result.current.hasWrappedPosition).toBe(false)
    expect(result.current.combinedMax.raw).toBe(100_000_000n)
  })

  it("updates an exact direct fill when the normalized receipt balance changes", () => {
    const data = fixture()
    const { result, rerender } = renderHook(() =>
      useWithdrawRouting({ ...data, hasWrapper: true }),
    )
    act(() => result.current.fillDirect())
    data.marketAccount.marketBalance = data.receipt.getAmount(100_000_001n)
    rerender()
    expect(result.current.route.amount.raw).toBe(100_000_001n)
    expect(result.current.route.amount.token).toBe(data.underlying)
    expect(result.current.isDirectFilled).toBe(true)
  })
})
