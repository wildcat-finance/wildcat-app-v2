/** @jest-environment node */

import { buildPositionSummaries } from "./buildMarketDataset"
import { metadataInterface } from "../abi/registry"
import { RAY } from "../bigint"
import { ExportRpc } from "../sources/rpc"
import { DecodedMarketEvent, MarketMetadata } from "../types"

const address = "0x1111111111111111111111111111111111111111"
const counterparty = "0x2222222222222222222222222222222222222222"
const market = {
  chainId: 1,
  address: "0x3333333333333333333333333333333333333333",
  version: "2",
  borrower: "0x4444444444444444444444444444444444444444",
  feeRecipient: "0x5555555555555555555555555555555555555555",
  name: "Test market",
  symbol: "TST",
  assetAddress: "0x6666666666666666666666666666666666666666",
  assetName: "Test asset",
  assetSymbol: "USD",
  assetDecimals: 0,
  deploymentBlock: 1,
} as MarketMetadata

const event = (
  name: string,
  amountRaw: bigint,
  args: Record<string, unknown>,
  participant?: string,
  eventCounterparty?: string,
) =>
  ({
    name,
    amountRaw,
    args,
    participant,
    counterparty: eventCounterparty,
    blockNumber: 1,
    transactionHash: `0x${"1".repeat(64)}`,
    logIndex: 0,
    timestamp: 1,
  }) as DecodedMarketEvent

const currentState = (scaleFactor: bigint) => [
  false,
  0,
  0,
  0,
  0,
  0,
  0,
  false,
  0,
  0,
  0,
  0,
  scaleFactor,
  0,
]

const rpcWithPosition = (
  value: bigint,
  scaled: bigint,
  scaleFactor: bigint,
): ExportRpc => ({
  usedProviderHosts: new Set(),
  call: async <T>(_method: string, params: unknown[]) => {
    const [{ data }] = params as [{ data: string }, string]
    const call = metadataInterface.parseTransaction({ data })
    let result: string
    if (call.name === "balanceOf") {
      result = metadataInterface.encodeFunctionResult(call.name, [value])
    } else if (call.name === "scaledBalanceOf") {
      result = metadataInterface.encodeFunctionResult(call.name, [scaled])
    } else if (call.name === "currentState") {
      result = metadataInterface.encodeFunctionResult(call.name, [
        currentState(scaleFactor),
      ])
    } else {
      throw new Error(`Unexpected contract read: ${call.name}`)
    }
    return result as T
  },
  batch: async <T>() => [] as T[],
  getBlock: async () => {
    throw new Error("Unexpected getBlock")
  },
  getLogs: async () => [],
  findDeploymentBlock: async () => 1,
  findBlockAtOrBefore: async () => 1,
  findBlocksAtOrBefore: async () => [1],
})

describe("position summaries", () => {
  it("includes funded and still-accruing withdrawal claims", async () => {
    const scaleFactor = (RAY * 11n) / 10n
    const events = [
      event("Deposit", 1_000n, { scaledAmount: "1000" }, address),
      event(
        "WithdrawalQueued",
        400n,
        { scaledAmount: "400", expiry: "10" },
        address,
      ),
      event("WithdrawalBatchPayment", 100n, {
        expiry: "10",
        normalizedAmountPaid: "100",
        scaledAmountBurned: "100",
      }),
      event("WithdrawalExecuted", 20n, { expiry: "10" }, address),
    ]
    const summaries = await buildPositionSummaries(
      rpcWithPosition(660n, 600n, scaleFactor),
      market,
      10,
      1_700_000_000,
      events,
      [address],
    )
    const summary = summaries[address]
    expect(summary.activePrincipalRaw).toBe(600n)
    expect(summary.pendingWithdrawalPrincipalRaw).toBe(320n)
    expect(summary.pendingWithdrawalValueRaw).toBe(410n)
    expect(summary.totalPositionValueRaw).toBe(1_070n)
    expect(summary.earningsRaw).toBe(90n)
  })

  it("separates earnings transferred with market tokens from active earnings", async () => {
    const scaleFactor = (RAY * 11n) / 10n
    const events = [
      event("Deposit", 1_000n, { scaledAmount: "1000" }, address),
      event("StateUpdated", 0n, { scaleFactor: String(scaleFactor) }),
      event("Transfer", 550n, {}, address, counterparty),
    ]
    const summaries = await buildPositionSummaries(
      rpcWithPosition(550n, 500n, scaleFactor),
      market,
      10,
      1_700_000_000,
      events,
      [address],
    )
    const summary = summaries[address]
    expect(summary.activePrincipalRaw).toBe(500n)
    expect(summary.principalTransferredOutRaw).toBe(500n)
    expect(summary.marketTokensTransferredOutRaw).toBe(550n)
    expect(summary.currentValueRaw - summary.activePrincipalRaw).toBe(50n)
    expect(summary.earningsRaw).toBe(100n)
  })
})
