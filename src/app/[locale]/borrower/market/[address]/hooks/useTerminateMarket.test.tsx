/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"

import { useTerminateMarket } from "./useTerminateMarket"

const waitForSubmittedTransactionMock = jest.fn()

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({ connected: false, sdk: {} }),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: () => ({ provider: {} }),
}))

jest.mock("@/utils/transactions", () => ({
  waitForSubmittedTransaction: (...args: unknown[]) =>
    waitForSubmittedTransactionMock(...args),
}))

const CHAIN_ID = 11155111
const BORROWER = "0xca732651410e915090d7a7d889a1e44ef4575fce"
const MARKET = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
const HASH = `0x${"1".padStart(64, "0")}`
const TRANSACTION_HASH = `0x${"2".padStart(64, "0")}`

const createQueryWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe("useTerminateMarket", () => {
  const closeMarket = jest.fn()
  const marketAccount = {
    account: BORROWER,
    market: {
      address: MARKET,
      chainId: CHAIN_ID,
      isClosed: false,
    },
    closeMarket,
  } as unknown as MarketAccount

  beforeEach(() => {
    jest.clearAllMocks()
    closeMarket.mockResolvedValue(HASH)
    waitForSubmittedTransactionMock.mockResolvedValue({
      hash: TRANSACTION_HASH,
      receipt: {},
    })
  })

  it("invalidates detail and inactive overview state after confirmation", async () => {
    const { client, wrapper } = createQueryWrapper()
    const detailKey = QueryKeys.Markets.GET_MARKET(CHAIN_ID, MARKET)
    const ownMarketsKey = QueryKeys.Borrower.GET_OWN_MARKETS(CHAIN_ID, BORROWER)
    const allMarketsKey = QueryKeys.Borrower.GET_ALL_MARKETS(CHAIN_ID, BORROWER)
    const lenderMarketsKey = QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(
      CHAIN_ID,
      BORROWER,
    )
    const affectedKeys = [
      detailKey,
      ownMarketsKey,
      allMarketsKey,
      lenderMarketsKey,
    ]

    affectedKeys.forEach((queryKey) =>
      client.setQueryData<unknown>(queryKey, "stale"),
    )

    const setTxHash = jest.fn()
    const { result } = renderHook(
      () => useTerminateMarket(marketAccount, setTxHash),
      { wrapper },
    )

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(closeMarket).toHaveBeenCalledTimes(1)
    expect(waitForSubmittedTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({ hash: HASH }),
    )
    expect(setTxHash).toHaveBeenNthCalledWith(1, HASH)
    expect(setTxHash).toHaveBeenNthCalledWith(2, TRANSACTION_HASH)
    affectedKeys.forEach((queryKey) => {
      expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true)
    })
  })
})
