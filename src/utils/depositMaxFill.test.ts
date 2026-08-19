import {
  DEPOSIT_AMOUNT_DISPLAY_DECIMALS,
  effectiveDepositAmount,
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
})

describe("effectiveDepositAmount", () => {
  const exact = amount("999.99999")
  const parsed = amount("999.99999")

  it("uses the exact fill while the input is untouched", () => {
    expect(effectiveDepositAmount({ exact, parsed, input: "999.99999" })).toBe(
      exact,
    )
  })

  it("uses the parsed input after a manual edit", () => {
    expect(effectiveDepositAmount({ exact, parsed, input: "999.9" })).toBe(
      parsed,
    )
    expect(effectiveDepositAmount({ exact, parsed, input: "" })).toBe(parsed)
  })

  it("uses the parsed input when nothing was filled", () => {
    expect(
      effectiveDepositAmount({ exact: undefined, parsed, input: "12" }),
    ).toBe(parsed)
  })
})
