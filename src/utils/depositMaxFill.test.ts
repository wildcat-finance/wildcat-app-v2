import {
  DEPOSIT_AMOUNT_DISPLAY_DECIMALS,
  fillMaxDepositInput,
  TokenAmountLike,
} from "./depositMaxFill"

const amount = (display: string, zero = false): TokenAmountLike => ({
  format: (decimals: number) => {
    expect(decimals).toBe(DEPOSIT_AMOUNT_DISPLAY_DECIMALS)
    return display
  },
  raw: { isZero: () => zero },
})

describe("fillMaxDepositInput", () => {
  it("writes the truncating format of the maximum", () => {
    expect(fillMaxDepositInput(amount("1234.56789"))).toBe("1234.56789")
  })

  it("fills nothing when the maximum is zero", () => {
    expect(fillMaxDepositInput(amount("0", true))).toBeNull()
  })

  it("fills nothing when the maximum truncates away to zero", () => {
    // 0.0000099 of an 18-decimal token: raw is non-zero, but format(5)
    // renders "0" and filling that would arm a dust deposit under a field
    // reading zero.
    expect(fillMaxDepositInput(amount("0"))).toBeNull()
    expect(fillMaxDepositInput(amount("0.00000"))).toBeNull()
  })
})
