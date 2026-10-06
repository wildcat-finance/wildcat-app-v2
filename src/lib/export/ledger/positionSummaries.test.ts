/** @jest-environment node */

import {
  buildPositionSummaries,
  readWithdrawalBatchPreview,
} from "./buildMarketDataset"
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
      [],
    )
    const summary = summaries[address]
    expect(summary.activePrincipalRaw).toBe(600n)
    expect(summary.pendingWithdrawalPrincipalRaw).toBe(380n)
    expect(summary.principalReturnedRaw).toBe(20n)
    expect(summary.pendingWithdrawalValueRaw).toBe(410n)
    expect(summary.totalPositionValueRaw).toBe(1_070n)
    expect(summary.earningsRaw).toBe(90n)
    expect(summary.payoutsRaw - summary.principalReturnedRaw).toBe(0n)
    expect(
      summary.pendingWithdrawalValueRaw - summary.pendingWithdrawalPrincipalRaw,
    ).toBe(30n)
  })

  it("does not return principal from the unfunded half of a batch", async () => {
    const scaleFactor = (RAY * 11n) / 10n
    const events = [
      event("Deposit", 1_000n, { scaledAmount: "1000" }, address),
      event(
        "WithdrawalQueued",
        400n,
        { scaledAmount: "400", expiry: "10" },
        address,
      ),
      event("WithdrawalBatchPayment", 200n, {
        expiry: "10",
        normalizedAmountPaid: "200",
        scaledAmountBurned: "200",
      }),
      event("WithdrawalExecuted", 200n, { expiry: "10" }, address),
    ]
    const summaries = await buildPositionSummaries(
      rpcWithPosition(660n, 600n, scaleFactor),
      market,
      10,
      1_700_000_000,
      events,
      [address],
      [],
    )
    const summary = summaries[address]

    expect(summary.principalReturnedRaw).toBe(200n)
    expect(summary.pendingWithdrawalPrincipalRaw).toBe(200n)
    expect(summary.pendingWithdrawalValueRaw).toBe(220n)
    expect(summary.payoutsRaw - summary.principalReturnedRaw).toBe(0n)
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
      [],
    )
    const summary = summaries[address]
    expect(summary.activePrincipalRaw).toBe(500n)
    expect(summary.principalTransferredOutRaw).toBe(500n)
    expect(summary.marketTokensTransferredOutRaw).toBe(550n)
    expect(summary.currentValueRaw - summary.activePrincipalRaw).toBe(50n)
    expect(summary.earningsRaw).toBe(100n)
  })
  it("keeps self-transfers economically neutral", async () => {
    const events = [
      event("Deposit", 100n, { scaledAmount: "100" }, address),
      event("Transfer", 10n, {}, address, address),
    ]
    const summary = (
      await buildPositionSummaries(
        rpcWithPosition(100n, 100n, RAY),
        market,
        10,
        1_700_000_000,
        events,
        [address],
        [],
      )
    )[address]
    expect(summary.scaledBalanceRaw).toBe(100n)
    expect(summary.activePrincipalRaw).toBe(100n)
    expect(summary.principalAcquiredByTransferRaw).toBe(0n)
    expect(summary.principalTransferredOutRaw).toBe(0n)
    expect(summary.earningsRaw).toBe(0n)
  })

  it("shares funded and unfunded batch value with requests queued after payment", async () => {
    const events = [
      event("Deposit", 100n, { scaledAmount: "100" }, address),
      event("Deposit", 100n, { scaledAmount: "100" }, counterparty),
      event(
        "WithdrawalQueued",
        100n,
        { scaledAmount: "100", expiry: "10" },
        address,
      ),
      event("WithdrawalBatchPayment", 100n, {
        scaledAmountBurned: "100",
        normalizedAmountPaid: "100",
        expiry: "10",
      }),
      event(
        "WithdrawalQueued",
        100n,
        { scaledAmount: "100", expiry: "10" },
        counterparty,
      ),
    ]
    const summaries = await buildPositionSummaries(
      rpcWithPosition(0n, 0n, (RAY * 11n) / 10n),
      market,
      10,
      1_700_000_000,
      events,
      [address, counterparty],
      [],
    )
    Object.values(summaries).forEach((summary) => {
      expect(summary.pendingWithdrawalValueRaw).toBe(105n)
      expect(summary.pendingWithdrawalPrincipalRaw).toBe(100n)
      expect(summary.earningsRaw).toBe(5n)
    })
    events.push(event("WithdrawalExecuted", 50n, { expiry: "10" }, address))
    events.push(
      event("WithdrawalExecuted", 50n, { expiry: "10" }, counterparty),
    )
    const paid = await buildPositionSummaries(
      rpcWithPosition(0n, 0n, (RAY * 11n) / 10n),
      market,
      10,
      1_700_000_000,
      events,
      [address, counterparty],
      [],
    )
    Object.values(paid).forEach((summary) => {
      expect(summary.pendingWithdrawalValueRaw).toBe(55n)
      expect(summary.principalReturnedRaw).toBe(50n)
      expect(summary.pendingWithdrawalPrincipalRaw).toBe(50n)
      expect(summary.earningsRaw).toBe(5n)
    })
  })

  it.each([true, false])(
    "values annual earnings at archived year-end even when the next accrual is %s",
    async (emitted) => {
      const start = Date.parse("2025-12-30T00:00:00Z") / 1_000
      const end = Date.parse("2026-01-02T00:00:00Z") / 1_000
      const events = [
        {
          ...event("Deposit", 1_000n, { scaledAmount: "1000" }, address),
          timestamp: start,
        },
      ]
      if (emitted)
        events.push({
          ...event("InterestAndFeesAccrued", 0n, {
            fromTimestamp: start,
            toTimestamp: end,
            baseInterestRay: String((RAY * 3n) / 100n),
            delinquencyFeeRay: "0",
            scaleFactor: String((RAY * 103n) / 100n),
          }),
          timestamp: end,
          blockNumber: 3,
        })
      const daily = [
        {
          date_utc: "2025-12-31",
          snapshot_block: "2",
          scale_factor_ray: String((RAY * 102n) / 100n),
        },
      ]
      const summary = (
        await buildPositionSummaries(
          rpcWithPosition(1_030n, 1_000n, (RAY * 103n) / 100n),
          market,
          3,
          end,
          events,
          [address],
          daily,
        )
      )[address]
      expect(summary.annualEarnings).toEqual({ "2025": 20n, "2026": 10n })
      expect(summary.earningsRaw).toBe(30n)
    },
  )

  it("keeps whole-position annual earnings exact across shared-batch funding and payouts", async () => {
    const events = [
      event("Deposit", 100n, { scaledAmount: "100" }, address),
      event("Deposit", 100n, { scaledAmount: "100" }, counterparty),
      event(
        "WithdrawalQueued",
        100n,
        { scaledAmount: "100", expiry: "10" },
        address,
      ),
      event("WithdrawalBatchPayment", 100n, {
        scaledAmountBurned: "100",
        normalizedAmountPaid: "100",
        expiry: "10",
      }),
      event(
        "WithdrawalQueued",
        100n,
        { scaledAmount: "100", expiry: "10" },
        counterparty,
      ),
      {
        ...event("WithdrawalBatchPayment", 120n, {
          scaledAmountBurned: "100",
          normalizedAmountPaid: "120",
          expiry: "10",
        }),
        blockNumber: 3,
      },
      {
        ...event("WithdrawalExecuted", 110n, { expiry: "10" }, address),
        blockNumber: 3,
      },
    ]
    const daily = [
      {
        date_utc: "2025-12-31",
        snapshot_block: "2",
        scale_factor_ray: String((RAY * 11n) / 10n),
      },
    ]
    const summaries = await buildPositionSummaries(
      rpcWithPosition(0n, 0n, (RAY * 12n) / 10n),
      market,
      3,
      Date.parse("2026-01-02T00:00:00Z") / 1_000,
      events,
      [address, counterparty],
      daily,
    )
    Object.values(summaries).forEach((summary) => {
      expect(summary.annualEarnings).toEqual({ "2025": 5n, "2026": 5n })
      expect(summary.earningsRaw).toBe(10n)
    })
    expect(summaries[address].pendingWithdrawalValueRaw).toBe(0n)
    expect(summaries[counterparty].pendingWithdrawalValueRaw).toBe(110n)
  })

  it("values partial batch claims using cumulative contract rounding", async () => {
    const events = [
      event("Deposit", 1n, { scaledAmount: "1" }, address),
      event("Deposit", 2n, { scaledAmount: "2" }, counterparty),
      event(
        "WithdrawalQueued",
        1n,
        { scaledAmount: "1", expiry: "10" },
        address,
      ),
      event(
        "WithdrawalQueued",
        2n,
        { scaledAmount: "2", expiry: "10" },
        counterparty,
      ),
      event("WithdrawalBatchPayment", 1n, {
        scaledAmountBurned: "1",
        normalizedAmountPaid: "1",
        expiry: "10",
      }),
      event("WithdrawalBatchPayment", 1n, {
        scaledAmountBurned: "1",
        normalizedAmountPaid: "1",
        expiry: "10",
      }),
    ]
    const summaries = await buildPositionSummaries(
      rpcWithPosition(0n, 0n, 2n * RAY),
      market,
      10,
      1_700_000_000,
      events,
      [address, counterparty],
      [],
    )
    // Paying the last scaled token at factor 2 yields cumulative batch assets 4;
    // claims are floor(4 * share / 3), with the remaining unit retained as dust.
    expect(summaries[address].pendingWithdrawalValueRaw).toBe(1n)
    expect(summaries[counterparty].pendingWithdrawalValueRaw).toBe(2n)
  })
})

describe("unemitted withdrawal batch payments", () => {
  const events = [
    event("Deposit", 200n, { scaledAmount: "200" }, address),
    event("WithdrawalBatchCreated", 0n, { expiry: "10" }),
    event(
      "WithdrawalQueued",
      100n,
      { scaledAmount: "100", expiry: "10" },
      address,
    ),
  ]
  const previewRpc = (burned: bigint, paid: bigint) => ({
    ...rpcWithPosition(100n, 100n, RAY),
    call: jest.fn(async (_method: string, params: unknown[]) => {
      const [{ data }] = params as [{ data: string }, string]
      const call = metadataInterface.parseTransaction({ data })
      expect(call.name).toBe("getWithdrawalBatch")
      expect(Number(call.args[0])).toBe(10)
      return metadataInterface.encodeFunctionResult(call.name, [
        [100n, burned, paid],
      ])
    }),
  })

  it("checks a virtual expiry payment against the independent batch view", async () => {
    const rpc = previewRpc(100n, 110n)
    const preview = await readWithdrawalBatchPreview(
      rpc as unknown as ExportRpc,
      market.address,
      20,
      events,
      100n,
      110n,
    )
    expect(preview).toEqual({
      expiry: 10,
      scaledTotalAmountRaw: "100",
      scaledAmountBurnedRaw: "100",
      normalizedAmountPaidRaw: "110",
      additionalScaledAmountBurnedRaw: "100",
      additionalNormalizedAmountPaidRaw: "110",
    })
    expect(rpc.call).toHaveBeenCalledTimes(1)
  })

  it("does not query or invent a preview when emitted history reconciles", async () => {
    const rpc = previewRpc(100n, 110n)
    expect(
      await readWithdrawalBatchPreview(
        rpc as unknown as ExportRpc,
        market.address,
        20,
        events,
        200n,
        0n,
      ),
    ).toBeUndefined()
    expect(rpc.call).not.toHaveBeenCalled()
  })

  it("rejects a preview that does not independently explain both state differences", async () => {
    const rpc = previewRpc(100n, 109n)
    await expect(
      readWithdrawalBatchPreview(
        rpc as unknown as ExportRpc,
        market.address,
        20,
        events,
        100n,
        110n,
      ),
    ).rejects.toThrow("pending-batch preview does not explain state")
  })

  it("values a virtually funded claim without continuing its interest accrual", async () => {
    const preview = {
      expiry: 10,
      scaledTotalAmountRaw: "100",
      scaledAmountBurnedRaw: "100",
      normalizedAmountPaidRaw: "110",
      additionalScaledAmountBurnedRaw: "100",
      additionalNormalizedAmountPaidRaw: "110",
    }
    const daily = [
      {
        date_utc: "2023-11-14",
        pending_batch_preview_json: JSON.stringify(preview),
        snapshot_block: "20",
        scale_factor_ray: String((RAY * 12n) / 10n),
      },
    ]
    const summary = (
      await buildPositionSummaries(
        rpcWithPosition(120n, 100n, (RAY * 12n) / 10n),
        market,
        20,
        1_700_000_000,
        events,
        [address],
        daily,
      )
    )[address]
    expect(summary.currentValueRaw).toBe(120n)
    expect(summary.pendingWithdrawalValueRaw).toBe(110n)
    expect(summary.earningsRaw).toBe(30n)
  })
})
