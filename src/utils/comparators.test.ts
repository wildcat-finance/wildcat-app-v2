import { SupportedChainId, Token } from "@wildcatfi/wildcat-sdk"

import { tokenAmountComparator } from "./comparators"

const token = (address: string, decimals = 6) =>
  new Token(
    SupportedChainId.Sepolia,
    address,
    "Asset",
    "AST",
    decimals,
    false,
    {
      call: async () => {
        throw new Error("Unexpected RPC call")
      },
    },
  )

describe("cross-market token amount sorting", () => {
  it("compares different tokens with equal decimals without mixing TokenAmount operands", () => {
    const a = token("0x0000000000000000000000000000000000000001")
    const b = token("0x0000000000000000000000000000000000000002")
    const value = 9_007_199_254_740_993n
    expect(tokenAmountComparator(a.getAmount(value), b.getAmount(value))).toBe(
      0,
    )
    expect(
      tokenAmountComparator(a.getAmount(value), b.getAmount(value + 1n)),
    ).toBe(-1)
    expect(
      tokenAmountComparator(b.getAmount(value + 1n), a.getAmount(value)),
    ).toBe(1)
  })

  it("retains the existing displayed-quantity ordering across decimal scales", () => {
    const a = token("0x0000000000000000000000000000000000000001", 6)
    const b = token("0x0000000000000000000000000000000000000002", 18)
    expect(tokenAmountComparator(a.parseAmount("1"), b.parseAmount("2"))).toBe(
      -1,
    )
  })
})
