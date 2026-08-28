import { QueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

import { invalidateMarketStateQueries } from "./marketStateQueries"

const CHAIN_ID = 11155111
const MARKET = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const ACCOUNT = "0xca732651410e915090d7a7d889a1e44ef4575fce"

describe("invalidateMarketStateQueries", () => {
  it("invalidates the affected account and every same-chain market list", async () => {
    const client = new QueryClient()
    const marketAccount = QueryKeys.Lender.GET_MARKET_ACCOUNT(
      CHAIN_ID,
      MARKET,
      ACCOUNT,
      "initial",
    )
    const marketList = QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(
      CHAIN_ID,
      ACCOUNT,
    )
    const otherChainMarketList = QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(
      1,
      ACCOUNT,
    )

    client.setQueryData(marketAccount, "account")
    client.setQueryData(marketList, "market list")
    client.setQueryData(otherChainMarketList, "other chain market list")

    invalidateMarketStateQueries({
      client,
      chainId: CHAIN_ID,
      marketAddress: MARKET,
      accountAddress: ACCOUNT,
    })
    await Promise.resolve()

    expect(client.getQueryState(marketAccount)?.isInvalidated).toBe(true)
    expect(client.getQueryState(marketList)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherChainMarketList)?.isInvalidated).toBe(
      false,
    )
  })
})
