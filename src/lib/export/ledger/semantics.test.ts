/** @jest-environment node */

import {
  addEventToTransaction,
  applyScaledSupplyEvent,
  buildDelinquencyEpisodes,
  buildInterestAccruals,
  classifyTransfersMentioningMarket,
  foreignTransferKind,
  proportionalPrincipalReturned,
  sanitizeTokenSymbol,
  verifyTransferCandidates,
} from "./buildMarketDataset"
import { RAY, rayMul } from "../bigint"
import { EtherscanLog } from "../sources/etherscan"
import { ExportRpc } from "../sources/rpc"
import {
  DecodedMarketEvent,
  InterestAccrualRow,
  JsonRpcLog,
  MarketMetadata,
  TransactionLedgerRow,
} from "../types"

const event = (
  name: string,
  amountRaw: bigint,
  args: Record<string, unknown> = {},
) =>
  ({
    name,
    amountRaw,
    args,
    transactionHash: "0x1",
    logIndex: 1,
  }) as DecodedMarketEvent

const row = () =>
  ({
    depositedRaw: 0n,
    borrowedRaw: 0n,
    repaidRaw: 0n,
    withdrawalQueuedRaw: 0n,
    withdrawalExecutedRaw: 0n,
    feesCollectedRaw: 0n,
    escrowedOutRaw: 0n,
    marketTokensTransferredRaw: 0n,
    events: [],
  }) as unknown as TransactionLedgerRow

describe("protocol event semantics", () => {
  it("does not double count sanctions companion events", () => {
    const ledger = row()
    addEventToTransaction(ledger, event("WithdrawalQueued", 100n))
    addEventToTransaction(
      ledger,
      event("SanctionedAccountAssetsQueuedForWithdrawal", 100n),
    )
    addEventToTransaction(ledger, event("WithdrawalExecuted", 80n))
    addEventToTransaction(
      ledger,
      event("SanctionedAccountWithdrawalSentToEscrow", 80n),
    )
    expect(ledger.withdrawalQueuedRaw).toBe(100n)
    expect(ledger.withdrawalExecutedRaw).toBe(80n)
    expect(ledger.escrowedOutRaw).toBe(0n)
  })

  it("burns supply on batch payment but not the cumulative expiry summary", () => {
    const deposited = applyScaledSupplyEvent(
      0n,
      event("Deposit", 100n, { scaledAmount: "100" }),
    )
    const paid = applyScaledSupplyEvent(
      deposited,
      event("WithdrawalBatchPayment", 40n, { scaledAmountBurned: "40" }),
    )
    const expired = applyScaledSupplyEvent(
      paid,
      event("WithdrawalBatchExpired", 40n, { scaledAmountBurned: "40" }),
    )
    expect(expired).toBe(60n)
  })

  it("allocates principal across partial batch executions cumulatively", () => {
    expect(proportionalPrincipalReturned(1_000n, 250n, 1_000n)).toBe(250n)
    expect(proportionalPrincipalReturned(1_000n, 600n, 1_000n)).toBe(600n)
  })

  it("removes phishing links and control characters from foreign symbols", () => {
    expect(sanitizeTokenSymbol("\u0000USDC https://evil.example/x\u0007")).toBe(
      "[unsafe symbol removed]",
    )
    expect(sanitizeTokenSymbol("USDC ｖｉｓｉｔ evil . com")).toBe(
      "[unsafe symbol removed]",
    )
    expect(sanitizeTokenSymbol("ＵＳＤＣ")).toBe("USDC")
  })

  it("distinguishes ERC-20, ERC-721, and malformed transfer logs", () => {
    const log = (topics: string[], data: string) =>
      ({ topics, data }) as JsonRpcLog
    const topic = `0x${"0".repeat(64)}`
    expect(foreignTransferKind(log([topic, topic, topic], topic))).toBe("erc20")
    expect(foreignTransferKind(log([topic, topic, topic, topic], "0x"))).toBe(
      "erc721",
    )
    expect(foreignTransferKind(log([topic, topic], "0x1234"))).toBe("unknown")
  })

  it("classifies one shared transfer scan into asset and excluded logs", () => {
    const market = "0x1111111111111111111111111111111111111111"
    const asset = "0x2222222222222222222222222222222222222222"
    const foreign = "0x3333333333333333333333333333333333333333"
    const rpcLog = (
      address: string,
      transactionHash: string,
      blockNumber: number,
      logIndex: number,
    ) =>
      ({
        address,
        transactionHash,
        blockNumber: `0x${blockNumber.toString(16)}`,
        logIndex: `0x${logIndex.toString(16)}`,
      }) as JsonRpcLog
    const assetLog = rpcLog(asset, "0xasset", 2, 1)
    const foreignLog = rpcLog(foreign, "0xforeign", 1, 0)
    const marketTokenLog = rpcLog(market, "0xmarket", 3, 2)

    expect(
      classifyTransfersMentioningMarket(
        [assetLog, foreignLog, assetLog, marketTokenLog],
        { address: market, assetAddress: asset },
      ),
    ).toEqual({
      assetLogs: [assetLog],
      excludedLogs: [foreignLog],
    })
  })

  it("accepts indexed transfers only when the exact RPC receipt log matches", async () => {
    const marketAddress = "0x1111111111111111111111111111111111111111"
    const assetAddress = "0x2222222222222222222222222222222222222222"
    const transactionHash = `0x${"3".repeat(64)}`
    const blockHash = `0x${"4".repeat(64)}`
    const transferTopic =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    const topicAddress = (address: string) =>
      `0x${address.slice(2).padStart(64, "0")}`
    const candidate = {
      address: assetAddress,
      blockHash,
      blockNumber: "0xa",
      data: `0x${"0".repeat(63)}1`,
      gasPrice: "0x1",
      gasUsed: "0x1",
      logIndex: "0x0",
      timeStamp: "0x1",
      topics: [
        transferTopic,
        topicAddress("0x0000000000000000000000000000000000000000"),
        topicAddress(marketAddress),
      ],
      transactionHash,
      transactionIndex: "0x0",
    } satisfies EtherscanLog
    const receipt = {
      blockHash,
      blockNumber: "0xa",
      effectiveGasPrice: "0x1",
      from: "0x5555555555555555555555555555555555555555",
      gasUsed: "0x1",
      logs: [{ ...candidate, removed: false }],
      status: "0x1",
      to: assetAddress,
      transactionHash,
      transactionIndex: "0x0",
    }
    const rpc = {
      batch: jest.fn().mockResolvedValue([receipt]),
    } as unknown as ExportRpc
    const market = {
      address: marketAddress,
      assetAddress,
      deploymentBlock: 1,
    } as MarketMetadata

    await expect(
      verifyTransferCandidates(rpc, [candidate], market, 20),
    ).resolves.toMatchObject({ assetLogs: [{ transactionHash }] })
    await expect(
      verifyTransferCandidates(
        rpc,
        [{ ...candidate, data: `0x${"0".repeat(63)}2` }],
        market,
        20,
      ),
    ).rejects.toThrow("payload mismatches 1")
  })

  it("uses the deployment fee until an update event changes it", () => {
    const baseInterestRay = 1_000_000_000_000_000_000n
    const firstScaleFactor = RAY + rayMul(RAY, baseInterestRay)
    const secondScaleFactor =
      firstScaleFactor + rayMul(firstScaleFactor, baseInterestRay)
    const accrual = (
      logIndex: number,
      fromTimestamp: number,
      toTimestamp: number,
      scaleFactor: bigint,
    ) =>
      ({
        marketAddress: "0xmarket",
        marketSymbol: "MARKET",
        timestamp: toTimestamp,
        name: "InterestAndFeesAccrued",
        args: {
          fromTimestamp,
          toTimestamp,
          baseInterestRay: String(baseInterestRay),
          delinquencyFeeRay: "0",
          protocolFees: "0",
          scaleFactor: String(scaleFactor),
        },
        transactionHash: `0x${logIndex}`,
        transactionIndex: 0,
        logIndex,
        blockNumber: logIndex,
        transactionFrom: "0xsender",
        transactionTo: "0xmarket",
        method: "accrueInterest",
        transactionStatus: "success",
      }) satisfies DecodedMarketEvent
    const rows = buildInterestAccruals(
      { address: "0xmarket", symbol: "MARKET" } as MarketMetadata,
      [
        accrual(1, 0, 3_600, firstScaleFactor),
        event("ProtocolFeeBipsUpdated", 0n, { protocolFeeBips: 250 }),
        event("StateUpdated", 0n, { isDelinquent: true }),
        accrual(3, 3_600, 7_200, secondScaleFactor),
      ],
      500,
      { protocolFeeBips: 500, isDelinquent: false },
    )

    expect(rows.map(({ protocolFeeBips }) => protocolFeeBips)).toEqual([
      500, 250,
    ])
    expect(rows.map(({ isDelinquent }) => isDelinquent)).toEqual([false, true])
  })

  it("keeps post-cure penalty in the episode and seeds the reserve ratio", () => {
    const state = (timestamp: number, isDelinquent: boolean) =>
      ({
        ...event("StateUpdated", 0n, { isDelinquent }),
        timestamp,
        blockNumber: timestamp,
        transactionHash: `0x${timestamp}`,
      }) as DecodedMarketEvent
    const penalty = (periodEnd: number, amount: bigint) =>
      ({
        periodStart: periodEnd - 10,
        periodEnd,
        delinquencyFeeRay: 1n,
        penaltyInterestAssetsRaw: amount,
      }) as InterestAccrualRow
    const episodes = buildDelinquencyEpisodes(
      [state(100, true), state(200, false), state(300, true)],
      [penalty(180, 5n), penalty(240, 7n), penalty(350, 11n)],
      50,
      400,
      250,
      { timestamp: 0, isDelinquent: false, timeDelinquent: 0 },
    )

    expect(episodes[0]).toMatchObject({
      onsetTimestamp: 100,
      cureTimestamp: 200,
      penaltyEndTimestamp: 250,
      penaltyInterestAssetsRaw: 12n,
      reserveRatioBips: 250,
      isOpen: false,
    })
    expect(episodes[1]).toMatchObject({
      onsetTimestamp: 300,
      penaltyInterestAssetsRaw: 11n,
      reserveRatioBips: 250,
      isOpen: true,
    })
  })

  it("does not claim a post-cure penalty has ended before the snapshot", () => {
    const state = (timestamp: number, isDelinquent: boolean) =>
      ({
        ...event("StateUpdated", 0n, { isDelinquent }),
        timestamp,
        blockNumber: timestamp,
        transactionHash: `0x${timestamp}`,
      }) as DecodedMarketEvent
    const episodes = buildDelinquencyEpisodes(
      [state(100, true), state(200, false)],
      [],
      50,
      220,
      0,
      { timestamp: 0, isDelinquent: false, timeDelinquent: 0 },
    )

    expect(episodes[0]).toMatchObject({
      cureTimestamp: 200,
      penaltyTriggered: true,
    })
    expect(episodes[0].penaltyEndTimestamp).toBeUndefined()
  })

  it("carries the cooldown timer into a repeated delinquency", () => {
    const state = (timestamp: number, isDelinquent: boolean) =>
      ({
        ...event("StateUpdated", 0n, { isDelinquent }),
        timestamp,
        blockNumber: timestamp,
        transactionHash: `0x${timestamp}`,
      }) as DecodedMarketEvent
    const episodes = buildDelinquencyEpisodes(
      [
        state(100, true),
        state(200, false),
        state(220, true),
        state(240, false),
      ],
      [],
      50,
      400,
      0,
      { timestamp: 0, isDelinquent: false, timeDelinquent: 0 },
    )

    expect(episodes[0].penaltyEndTimestamp).toBeUndefined()
    expect(episodes[1].penaltyEndTimestamp).toBe(290)
    expect(episodes[1].penaltyTriggered).toBe(true)
  })
})
