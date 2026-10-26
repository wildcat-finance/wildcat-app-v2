/** @jest-environment node */

import {
  buildHolderBalances,
  buildWithdrawalBatches,
  requiredLiquidity,
} from "./buildMarketDataset"
import { RAY } from "../bigint"
import { DecodedMarketEvent, MarketMetadata } from "../types"

const MARKET = `0x${"a".repeat(40)}`
const ZERO = `0x${"0".repeat(40)}`
const ALICE = `0x${"1".repeat(40)}`
const BOB = `0x${"2".repeat(40)}`
const market = { address: MARKET } as MarketMetadata

let nextLogIndex = 0
const event = (
  name: string,
  args: Record<string, unknown>,
  extra: Partial<DecodedMarketEvent> = {},
): DecodedMarketEvent => {
  const logIndex = nextLogIndex
  nextLogIndex += 1
  return {
    name,
    args,
    blockNumber: 100 + logIndex,
    timestamp: 1_000 + logIndex,
    transactionHash: `0x${String(logIndex).padStart(64, "0")}`,
    logIndex,
    ...extra,
  } as DecodedMarketEvent
}

describe("requiredLiquidity", () => {
  it("mirrors MarketState.liquidityRequired, including bip and ray rounding", () => {
    expect(
      requiredLiquidity({
        scaledTotalSupply: 1_000_000n,
        scaledPendingWithdrawals: 100_000n,
        reserveRatioBips: 1_001n,
        scaleFactor: (RAY * 11n) / 10n,
        accruedProtocolFees: 7n,
        normalizedUnclaimedWithdrawals: 3n,
      }),
      // (900,000 x 10.01% rounded half up) + 100,000 = 190,090 scaled,
      // x 1.1 = 209,099 normalized, + fees 7 + unclaimed 3
    ).toBe(209_109n)
  })
})

describe("buildHolderBalances", () => {
  it("credits deposits, moves lender transfers at the scale factor and debits queued withdrawals", () => {
    const events = [
      event("Deposit", { scaledAmount: "1000" }, { participant: ALICE }),
      event(
        "Transfer",
        {},
        { participant: ZERO, counterparty: ALICE, amountRaw: 1_000n },
      ),
      event("InterestAndFeesAccrued", { scaleFactor: String(RAY * 2n) }),
      event(
        "Transfer",
        {},
        { participant: ALICE, counterparty: BOB, amountRaw: 400n },
      ),
      event(
        "Transfer",
        {},
        { participant: BOB, counterparty: MARKET, amountRaw: 100n },
      ),
      event(
        "WithdrawalQueued",
        { scaledAmount: "50", expiry: "5000" },
        { participant: BOB },
      ),
    ]
    expect(buildHolderBalances(market, events)).toEqual({
      [ALICE]: "800",
      [BOB]: "150",
    })
  })

  it("omits lenders whose balance returns to zero", () => {
    const events = [
      event("Deposit", { scaledAmount: "10" }, { participant: ALICE }),
      event(
        "WithdrawalQueued",
        { scaledAmount: "10", expiry: "5000" },
        { participant: ALICE },
      ),
    ]
    expect(buildHolderBalances(market, events)).toEqual({})
  })
})

describe("buildWithdrawalBatches", () => {
  it("separates payment at expiry from later payments and derives each status", () => {
    const events = [
      event("WithdrawalBatchCreated", { expiry: "5000" }),
      event("WithdrawalQueued", { expiry: "5000", scaledAmount: "100" }),
      event("WithdrawalBatchCreated", { expiry: "6000" }),
      event("WithdrawalQueued", { expiry: "6000", scaledAmount: "40" }),
      event("WithdrawalBatchCreated", { expiry: "7000" }),
      event("WithdrawalQueued", { expiry: "7000", scaledAmount: "9" }),
    ]
    const expiryTx = { transactionHash: `0x${"e".repeat(64)}` }
    events.push(
      event(
        "InterestAndFeesAccrued",
        { scaleFactor: String(RAY * 3n) },
        expiryTx,
      ),
      event(
        "WithdrawalBatchPayment",
        {
          expiry: "5000",
          scaledAmountBurned: "60",
          normalizedAmountPaid: "180",
        },
        expiryTx,
      ),
      event(
        "WithdrawalBatchExpired",
        {
          expiry: "5000",
          scaledTotalAmount: "100",
          scaledAmountBurned: "60",
          normalizedAmountPaid: "180",
        },
        expiryTx,
      ),
      event("WithdrawalBatchPayment", {
        expiry: "5000",
        scaledAmountBurned: "40",
        normalizedAmountPaid: "120",
      }),
      event("WithdrawalBatchClosed", { expiry: "5000" }),
      event("WithdrawalBatchExpired", {
        expiry: "6000",
        scaledTotalAmount: "40",
        scaledAmountBurned: "0",
        normalizedAmountPaid: "0",
      }),
    )
    const [paidLate, unpaid, pending] = buildWithdrawalBatches(events)
    expect(paidLate).toMatchObject({
      expiry: 5000,
      status: "closed",
      scaledTotalAmountRaw: "100",
      scaledAmountBurnedRaw: "100",
      normalizedAmountPaidRaw: "300",
      scaleFactorAtExpiryRay: String(RAY * 3n),
      normalizedAmountPaidAtExpiryRaw: "180",
    })
    expect(paidLate.laterPayments).toHaveLength(1)
    expect(paidLate.laterPayments[0].normalizedAmountPaidRaw).toBe("120")
    expect(unpaid).toMatchObject({
      expiry: 6000,
      status: "unpaid",
      scaledAmountBurnedRaw: "0",
    })
    expect(pending).toMatchObject({
      expiry: 7000,
      status: "pending",
      scaledTotalAmountRaw: "9",
    })
  })
})
