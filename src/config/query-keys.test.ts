import { QueryClient } from "@tanstack/react-query"

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

  it("isolates service-agreement status by chain and normalized address", () => {
    const key = QueryKeys.ServiceAgreement.GET_STATUS(
      11155111,
      "0xCA732651410E915090D7A7D889A1E44EF4575FCE",
    )

    expect(key).toEqual([
      [
        "service-agreement",
        "GET_STATUS",
        11155111,
        "0xca732651410e915090d7a7d889a1e44ef4575fce",
      ],
    ])
  })

  it("isolates non-MLA acknowledgements by chain, market, and lender", () => {
    const key = QueryKeys.Lender.GET_NON_MLA_ACKNOWLEDGEMENT(
      11155111,
      "0x04FB4E4577AD2CDD65E70F18D7A5F326162DDD90",
      "0xCA732651410E915090D7A7D889A1E44EF4575FCE",
    )

    expect(key).toEqual([
      [
        "lender",
        "GET_NON_MLA_ACKNOWLEDGEMENT",
        11155111,
        "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
        "0xca732651410e915090d7a7d889a1e44ef4575fce",
      ],
    ])
  })

  it("invalidates indexed and live market entries through the existing market prefix", async () => {
    const queryClient = new QueryClient()
    const address = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
    const marketKey = QueryKeys.Markets.GET_MARKET(11155111, address)
    const indexedMarketKey = QueryKeys.Markets.GET_INDEXED_MARKET(
      11155111,
      address,
    )

    queryClient.setQueryData(marketKey, "live")
    queryClient.setQueryData(indexedMarketKey, "indexed")

    await queryClient.invalidateQueries({
      queryKey: marketKey,
      refetchType: "none",
    })

    expect(queryClient.getQueryState(marketKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(indexedMarketKey)?.isInvalidated).toBe(
      true,
    )
  })
})
