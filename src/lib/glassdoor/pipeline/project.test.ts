/** @jest-environment node */

import { utils } from "ethers"

import { minimumDepositFrom, readMinimumDeposits } from "./project"
import { ExportRpc } from "../../export/sources/rpc"

const coder = utils.defaultAbiCoder
const openTerm = (minimum: bigint) =>
  coder.encode(
    ["bool", "bool", "bool", "uint128", "bool"],
    [true, false, true, minimum, false],
  )
const fixedTerm = (minimum: bigint) =>
  coder.encode(
    [
      "bool",
      "bool",
      "bool",
      "bool",
      "uint128",
      "uint32",
      "bool",
      "bool",
      "bool",
    ],
    [true, false, true, false, minimum, 1_800_000_000, false, true, false],
  )

describe("minimum deposit (D03)", () => {
  it("reads the minimum from either hooks template's HookedMarket struct", () => {
    expect(minimumDepositFrom(openTerm(1_000_000_000n))).toBe("1000000000")
    expect(minimumDepositFrom(fixedTerm(25n))).toBe("25")
    expect(minimumDepositFrom("0x")).toBeUndefined()
  })

  it("finds each market's hooks instance in the top bits of its hooks config", async () => {
    const market = `0x${"a".repeat(40)}`
    const hooks = `0x${"b".repeat(40)}`
    const calls: { to: string }[][] = []
    const rpc = {
      batch: async (batch: { params: [{ to: string }] }[]) => {
        calls.push(batch.map(({ params: [{ to }] }) => ({ to })))
        return calls.length === 1
          ? [`${hooks}${"0".repeat(22)}ff`]
          : [openTerm(5_000_000n)]
      },
    } as unknown as ExportRpc

    const deposits = await readMinimumDeposits(
      rpc,
      [{ address: market, assetAddress: `0x${"c".repeat(40)}` }],
      { number: 100, hash: "0x1", timestamp: 1 },
    )

    expect(calls[1]).toEqual([{ to: hooks }])
    expect(deposits.get(market)).toBe("5000000")
  })
})
