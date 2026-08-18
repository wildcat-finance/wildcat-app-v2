import {
  getLenderMarketLoadingState,
  shouldShowLenderRequestBanner,
} from "./utils"

describe("shouldShowLenderRequestBanner", () => {
  it.each([
    {
      state: "disconnected",
      isConnected: false,
      isDifferentChain: false,
      authorizedInMarket: false,
      expected: false,
    },
    {
      state: "connected and unauthorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      authorizedInMarket: false,
      expected: true,
    },
    {
      state: "connected and authorized on the correct chain",
      isConnected: true,
      isDifferentChain: false,
      authorizedInMarket: true,
      expected: false,
    },
    {
      state: "connected with a wallet-chain mismatch",
      isConnected: true,
      isDifferentChain: true,
      authorizedInMarket: false,
      expected: false,
    },
    {
      state: "connected with an app-selection mismatch",
      isConnected: true,
      isDifferentChain: true,
      authorizedInMarket: true,
      expected: false,
    },
    {
      state: "connected while market authorization is unresolved",
      isConnected: true,
      isDifferentChain: false,
      authorizedInMarket: undefined,
      expected: false,
    },
  ])(
    "$state",
    ({ isConnected, isDifferentChain, authorizedInMarket, expected }) => {
      expect(
        shouldShowLenderRequestBanner({
          isConnected,
          isDifferentChain,
          authorizedInMarket,
        }),
      ).toBe(expected)
    },
  )
})

describe("getLenderMarketLoadingState", () => {
  const readyState = {
    isMarketReady: true,
    hasLiveMarket: true,
    apiLoading: false,
    isDiscoveringChainId: false,
    hasMarketAccount: true,
    isWithdrawalsLoading: false,
    authorizedInMarket: true,
    isDifferentChain: false,
  }

  it.each([
    { state: "market data is missing", changes: { isMarketReady: false } },
    { state: "the API query is loading", changes: { apiLoading: true } },
    {
      state: "the chain is being discovered",
      changes: { isDiscoveringChainId: true },
    },
  ])("keeps the page skeleton while $state", ({ changes }) => {
    expect(
      getLenderMarketLoadingState({ ...readyState, ...changes }).isPageLoading,
    ).toBe(true)
  })

  it("renders indexed account data while keeping market actions unavailable", () => {
    expect(
      getLenderMarketLoadingState({
        ...readyState,
        hasLiveMarket: false,
      }),
    ).toEqual({
      isPageLoading: false,
      isTransactionsLoading: false,
      isBarChartsLoading: false,
      isMarketActionsLoading: true,
    })
  })

  it("renders the market shell while account and withdrawal data load", () => {
    expect(
      getLenderMarketLoadingState({
        ...readyState,
        hasMarketAccount: false,
        isWithdrawalsLoading: true,
      }),
    ).toEqual({
      isPageLoading: false,
      isTransactionsLoading: true,
      isBarChartsLoading: true,
      isMarketActionsLoading: false,
    })
  })

  it("does not hold an unauthorized transaction section on withdrawals", () => {
    expect(
      getLenderMarketLoadingState({
        ...readyState,
        isWithdrawalsLoading: true,
        authorizedInMarket: false,
      }),
    ).toEqual({
      isPageLoading: false,
      isTransactionsLoading: false,
      isBarChartsLoading: true,
      isMarketActionsLoading: false,
    })
  })
})
