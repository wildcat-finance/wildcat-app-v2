import {
  type MarketAccount,
  type SignerOrProvider,
  SupportedChainId,
  Token,
} from "@wildcatfi/wildcat-sdk"

import { getMarketActionRows } from "./transactionRows"

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "USD Coin",
  "USDC",
  6,
  false,
  {} as SignerOrProvider,
)

const labels = {
  walletBalance: "Wallet balance",
  minimumDeposit: "Minimum deposit",
  withdrawalCycle: "Withdrawal cycle",
  gracePeriod: "Grace period",
}

const makeMarketAccount = (includeMinimumDeposit = true) =>
  ({
    underlyingBalance: token.getAmount(1_234_500_000n),
    market: {
      underlyingToken: token,
      hooksConfig: includeMinimumDeposit
        ? { minimumDeposit: token.getAmount(1_000_000_000n) }
        : undefined,
      withdrawalBatchDuration: 86_400,
      delinquencyGracePeriod: 172_800,
    },
  }) as unknown as MarketAccount

describe("getMarketActionRows", () => {
  it("builds the production deposit and withdrawal details", () => {
    expect(getMarketActionRows(makeMarketAccount(), labels)).toEqual({
      depositRows: [
        { label: "Wallet balance", value: "1,234.5 USDC" },
        { label: "Minimum deposit", value: "1,000 USDC" },
      ],
      withdrawRows: [
        { label: "Withdrawal cycle", value: "1 day" },
        { label: "Grace period", value: "2 days" },
      ],
    })
  })

  it("omits the minimum deposit row when the hook has none", () => {
    const { depositRows } = getMarketActionRows(
      makeMarketAccount(false),
      labels,
    )

    expect(depositRows).toEqual([
      { label: "Wallet balance", value: "1,234.5 USDC" },
    ])
  })
})
