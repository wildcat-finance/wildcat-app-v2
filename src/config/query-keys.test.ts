import { QueryClient } from "@tanstack/react-query"

import { k, QueryKeys } from "./query-keys"

jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}))

const CHAIN_ID = 11155111
const MARKET = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const OTHER_MARKET = "0x14fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const ACCOUNT = "0xca732651410e915090d7a7d889a1e44ef4575fce"
const OTHER_ACCOUNT = "0xda732651410e915090d7a7d889a1e44ef4575fce"

describe("query keys", () => {
  it("builds flat keys and trims trailing undefined values", () => {
    const uppercaseAccount = `0x${ACCOUNT.slice(2).toUpperCase()}`

    expect(k(["test", uppercaseAccount, undefined])).toEqual(["test", ACCOUNT])
  })

  it("invalidates both market-account phases through their prefix", async () => {
    const client = new QueryClient()
    const initial = QueryKeys.Markets.GET_MARKET_ACCOUNT.INITIAL(
      CHAIN_ID,
      MARKET,
      ACCOUNT,
    )
    const update = QueryKeys.Markets.GET_MARKET_ACCOUNT.UPDATE(
      CHAIN_ID,
      MARKET,
      ACCOUNT,
    )
    const unrelated = QueryKeys.Markets.GET_MARKET_ACCOUNT.INITIAL(
      CHAIN_ID,
      MARKET,
      OTHER_ACCOUNT,
    )

    client.setQueryData(initial, "initial")
    client.setQueryData(update, "update")
    client.setQueryData(unrelated, "unrelated")

    await client.invalidateQueries({
      queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.PREFIX(
        CHAIN_ID,
        MARKET,
        ACCOUNT,
      ),
      refetchType: "none",
    })

    expect(client.getQueryState(initial)?.isInvalidated).toBe(true)
    expect(client.getQueryState(update)?.isInvalidated).toBe(true)
    expect(client.getQueryState(unrelated)?.isInvalidated).toBe(false)
  })

  it("can invalidate every account projection for one market", async () => {
    const client = new QueryClient()
    const firstAccount = QueryKeys.Markets.GET_MARKET_ACCOUNT.INITIAL(
      CHAIN_ID,
      MARKET,
      ACCOUNT,
    )
    const secondAccount = QueryKeys.Markets.GET_MARKET_ACCOUNT.UPDATE(
      CHAIN_ID,
      MARKET,
      OTHER_ACCOUNT,
    )
    const unrelated = QueryKeys.Markets.GET_MARKET_ACCOUNT.INITIAL(
      CHAIN_ID,
      OTHER_MARKET,
      ACCOUNT,
    )

    client.setQueryData(firstAccount, "first")
    client.setQueryData(secondAccount, "second")
    client.setQueryData(unrelated, "unrelated")

    await client.invalidateQueries({
      queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.PREFIX(CHAIN_ID, MARKET),
      refetchType: "none",
    })

    expect(client.getQueryState(firstAccount)?.isInvalidated).toBe(true)
    expect(client.getQueryState(secondAccount)?.isInvalidated).toBe(true)
    expect(client.getQueryState(unrelated)?.isInvalidated).toBe(false)
  })

  it("keys market MLA data only by its public resource identity", () => {
    expect(QueryKeys.Markets.GET_MARKET_MLA(CHAIN_ID, MARKET)).toEqual([
      "markets",
      "GET_MARKET_MLA",
      CHAIN_ID,
      MARKET,
    ])
  })

  it("invalidates both borrower withdrawal phases through their prefix", async () => {
    const client = new QueryClient()
    const initial = QueryKeys.Borrower.GET_WITHDRAWALS.INITIAL(CHAIN_ID, MARKET)
    const update = QueryKeys.Borrower.GET_WITHDRAWALS.UPDATE(CHAIN_ID, MARKET, [
      "live-state",
    ])

    client.setQueryData(initial, "initial")
    client.setQueryData(update, "update")

    await client.invalidateQueries({
      queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(CHAIN_ID, MARKET),
      refetchType: "none",
    })

    expect(client.getQueryState(initial)?.isInvalidated).toBe(true)
    expect(client.getQueryState(update)?.isInvalidated).toBe(true)
  })

  it("invalidates both lender withdrawal phases through their prefix", async () => {
    const client = new QueryClient()
    const initial = QueryKeys.Lender.GET_WITHDRAWALS.INITIAL(
      CHAIN_ID,
      ACCOUNT,
      MARKET,
    )
    const update = QueryKeys.Lender.GET_WITHDRAWALS.UPDATE(
      CHAIN_ID,
      ACCOUNT,
      MARKET,
      ["live-state"],
    )

    client.setQueryData(initial, "initial")
    client.setQueryData(update, "update")

    await client.invalidateQueries({
      queryKey: QueryKeys.Lender.GET_WITHDRAWALS.PREFIX(
        CHAIN_ID,
        ACCOUNT,
        MARKET,
      ),
      refetchType: "none",
    })

    expect(client.getQueryState(initial)?.isInvalidated).toBe(true)
    expect(client.getQueryState(update)?.isInvalidated).toBe(true)
  })
})
