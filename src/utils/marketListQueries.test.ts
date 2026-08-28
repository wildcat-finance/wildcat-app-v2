import { QueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

import { invalidateMarketListQueries } from "./marketListQueries"

const CHAIN_ID = 11155111
const OTHER_CHAIN_ID = 1
const BORROWER = "0xca732651410e915090d7a7d889a1e44ef4575fce"
const OTHER_BORROWER = "0xda732651410e915090d7a7d889a1e44ef4575fce"
const LENDER = "0xea732651410e915090d7a7d889a1e44ef4575fce"
const OTHER_LENDER = "0xfa732651410e915090d7a7d889a1e44ef4575fce"
const MARKET = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"

describe("market list queries", () => {
  it("invalidates every same-chain borrower and lender list", async () => {
    const client = new QueryClient()
    const sameChainKeys = [
      QueryKeys.Borrower.GET_OWN_MARKETS(CHAIN_ID, BORROWER),
      QueryKeys.Borrower.GET_OWN_MARKETS(CHAIN_ID, OTHER_BORROWER),
      QueryKeys.Borrower.GET_ALL_MARKETS(CHAIN_ID, BORROWER),
      QueryKeys.Borrower.GET_ALL_MARKETS(CHAIN_ID, OTHER_BORROWER),
      QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(CHAIN_ID, LENDER),
      QueryKeys.Lender.GET_LENDER_ACCOUNTS.UPDATE(CHAIN_ID, OTHER_LENDER, 123),
    ]
    const otherChainKeys = [
      QueryKeys.Borrower.GET_OWN_MARKETS(OTHER_CHAIN_ID, BORROWER),
      QueryKeys.Borrower.GET_ALL_MARKETS(OTHER_CHAIN_ID, BORROWER),
      QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(OTHER_CHAIN_ID, LENDER),
    ]
    const unrelatedMarket = QueryKeys.Markets.GET_MARKET(CHAIN_ID, MARKET)
    const cachedKeys = [...sameChainKeys, ...otherChainKeys, unrelatedMarket]
    const unaffectedKeys = [...otherChainKeys, unrelatedMarket]

    cachedKeys.forEach((key) => {
      client.setQueryData(key, "cached")
    })

    invalidateMarketListQueries({ client, chainId: CHAIN_ID })
    await Promise.resolve()

    sameChainKeys.forEach((key) => {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    })
    unaffectedKeys.forEach((key) => {
      expect(client.getQueryState(key)?.isInvalidated).toBe(false)
    })
  })
})
