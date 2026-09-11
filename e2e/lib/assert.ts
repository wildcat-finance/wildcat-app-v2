import { expect } from "@playwright/test"
import { formatUnits } from "viem"

/** Parse the leading number out of formatted UI text like "40 DAI" or "1,234.56 USDC". */
export const parseFormattedAmount = (text: string) => {
  const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/)
  if (!m) throw new Error(`no number in "${text}"`)
  return Number(m[0])
}

/** Assert a formatted UI amount equals a raw on-chain/subgraph amount within the UI's rounding. */
export const expectFormattedEquals = (
  text: string,
  raw: bigint,
  decimals: number,
  maxAbsDiff = 0.00001,
) => {
  const shown = parseFormattedAmount(text)
  const actual = Number(formatUnits(raw, decimals))
  expect(
    Math.abs(shown - actual),
    `UI "${text}" vs raw ${formatUnits(raw, decimals)}`,
  ).toBeLessThanOrEqual(maxAbsDiff)
}

/** Three-way agreement: page (formatted), chain (raw), subgraph (raw string). */
export const expectAgreement = (
  label: string,
  args: {
    page?: string
    chain: bigint
    subgraph: string | bigint
    decimals: number
  },
) => {
  expect(BigInt(args.subgraph), `${label}: subgraph vs chain`).toBe(args.chain)
  if (args.page !== undefined)
    expectFormattedEquals(args.page, args.chain, args.decimals)
}
