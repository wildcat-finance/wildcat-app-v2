import { shouldShowLenderRequestBanner } from "./utils"

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
