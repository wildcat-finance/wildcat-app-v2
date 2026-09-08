import { Market, SupportedChainId, Token } from "@wildcatfi/wildcat-sdk"

import { useGenerateDebtsBarData } from "./useGenerateDebtsBarData"

jest.mock("@/utils/formatters", () => ({
  formatTokenAmountPercentage: (
    total: { raw: bigint },
    amount: { raw: bigint },
  ) => Number((amount.raw * 100n) / total.raw),
}))

it("expresses receipt supply and debt chart quantities in the underlying asset", () => {
  const provider = {
    call: async () => {
      throw new Error("Unexpected RPC call")
    },
  }
  const asset = new Token(
    SupportedChainId.Sepolia,
    "0x0000000000000000000000000000000000000001",
    "Asset",
    "AST",
    6,
    false,
    provider,
  )
  const receipt = new Token(
    SupportedChainId.Sepolia,
    "0x0000000000000000000000000000000000000002",
    "Receipt",
    "RCT",
    6,
    false,
    provider,
  )
  const market = {
    underlyingToken: asset,
    marketToken: receipt,
    totalSupply: receipt.parseAmount("100"),
    totalAssets: asset.parseAmount("40"),
    normalizedUnclaimedWithdrawals: asset.parseAmount("5"),
    normalizedPendingWithdrawals: asset.parseAmount("5"),
    lastAccruedProtocolFees: asset.parseAmount("1"),
    getTotalDebtBreakdown: () => ({ status: "healthy" }),
  } as unknown as Market
  const bars = Object.values(useGenerateDebtsBarData({ market }))
  expect(bars.map(({ value }) => value.raw).sort()).toEqual([
    11_000_000n,
    29_000_000n,
    60_000_000n,
  ])
  bars.forEach(({ value }) => expect(value.token).toBe(asset))
})
