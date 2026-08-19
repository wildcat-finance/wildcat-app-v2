import { QueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

import { invalidateMarketAccountQueries } from "./marketAccountQueries"

const CHAIN_ID = 11155111
const MARKET = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const OTHER_MARKET = "0x14fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const ACCOUNT = "0xca732651410e915090d7a7d889a1e44ef4575fce"
const OTHER_ACCOUNT = "0xda732651410e915090d7a7d889a1e44ef4575fce"

describe("invalidateMarketAccountQueries", () => {
  it("invalidates both v2.5 account families for the affected market", async () => {
    const client = new QueryClient()
    const lenderAccount = QueryKeys.Lender.GET_MARKET_ACCOUNT(
      CHAIN_ID,
      MARKET,
      ACCOUNT,
      "initial",
    )
    const otherLenderAccount = QueryKeys.Lender.GET_MARKET_ACCOUNT(
      CHAIN_ID,
      MARKET,
      OTHER_ACCOUNT,
      "update",
    )
    const borrowerAccountPrefix =
      QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
        CHAIN_ID,
        ACCOUNT,
        MARKET,
      )
    const borrowerInitial = [...borrowerAccountPrefix, "initial"]
    const borrowerUpdate = [...borrowerAccountPrefix, "update"]
    const unrelatedAccount = QueryKeys.Lender.GET_MARKET_ACCOUNT(
      CHAIN_ID,
      OTHER_MARKET,
      ACCOUNT,
      "initial",
    )

    client.setQueryData(lenderAccount, "lender")
    client.setQueryData(otherLenderAccount, "other lender")
    client.setQueryData(borrowerInitial, "borrower initial")
    client.setQueryData(borrowerUpdate, "borrower update")
    client.setQueryData(unrelatedAccount, "unrelated")

    invalidateMarketAccountQueries({
      client,
      chainId: CHAIN_ID,
      marketAddress: MARKET,
      accountAddress: ACCOUNT,
    })

    await Promise.resolve()

    expect(client.getQueryState(lenderAccount)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherLenderAccount)?.isInvalidated).toBe(true)
    expect(client.getQueryState(borrowerInitial)?.isInvalidated).toBe(true)
    expect(client.getQueryState(borrowerUpdate)?.isInvalidated).toBe(true)
    expect(client.getQueryState(unrelatedAccount)?.isInvalidated).toBe(false)
  })
})
