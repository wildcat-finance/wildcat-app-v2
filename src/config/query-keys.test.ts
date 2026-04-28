import { QueryKeys, k } from "./query-keys"

jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}))

describe("query keys", () => {
  it("normalizes raw bigint key parts before JSON hashing", () => {
    const key = k(["test", BigInt(1)])

    expect(() => JSON.stringify(key)).not.toThrow()
    expect(key).toEqual([["test", "1"]])
  })

  it("does not include market objects in borrower market account keys", () => {
    const key = QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
      11155111,
      "0xca732651410e915090d7a7d889a1e44ef4575fce",
      "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
    )

    expect(() => JSON.stringify(key)).not.toThrow()
    expect(key).toEqual([
      [
        "borrower",
        "GET_BORROWER_MARKET_ACCOUNT_LEGACY",
        11155111,
        "0xca732651410e915090d7a7d889a1e44ef4575fce",
        "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
      ],
    ])
  })
})
