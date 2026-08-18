/** @jest-environment node */

import type { PartialTransaction } from "@wildcatfi/wildcat-sdk"
import { wildcatMarketAbi } from "@wildcatfi/wildcat-sdk"
import { decodeFunctionData, type PublicClient } from "viem"

import {
  prepareWithdrawalClaim,
  preflightWithdrawalClaim,
} from "./withdrawalClaim"

const MARKET = "0x1111111111111111111111111111111111111111"
const LENDER = "0x2222222222222222222222222222222222222222"
const WITHDRAWAL_BATCH_NOT_EXPIRED = "0x2561b880"
const NULL_WITHDRAWAL_AMOUNT = "0x186334fe"

const pendingBatchError = () => ({
  cause: { data: WITHDRAWAL_BATCH_NOT_EXPIRED },
})

const makeClient = ({
  call,
  isClosed = true,
  pendingWithdrawalExpiry = 123,
}: {
  call: jest.Mock
  isClosed?: boolean
  pendingWithdrawalExpiry?: number
}) => {
  const stopWatching = jest.fn()
  const client = {
    call,
    readContract: jest.fn().mockResolvedValue({
      isClosed,
      pendingWithdrawalExpiry,
    }),
    getBlockNumber: jest.fn().mockResolvedValue(10n),
    watchBlockNumber: jest.fn(
      ({ onBlockNumber }: { onBlockNumber: (blockNumber: bigint) => void }) => {
        queueMicrotask(() => onBlockNumber(11n))
        return stopWatching
      },
    ),
  } as unknown as PublicClient
  return { client, stopWatching }
}

describe("withdrawal claim preflight", () => {
  it("encodes the exact single-withdrawal transaction", () => {
    const transaction = prepareWithdrawalClaim(MARKET, [
      { lender: LENDER, expiry: 123 },
    ])

    expect(
      decodeFunctionData({
        abi: wildcatMarketAbi,
        data: transaction.data as `0x${string}`,
      }),
    ).toEqual({
      functionName: "executeWithdrawal",
      args: [LENDER, 123],
    })
  })

  it("encodes the exact batch-withdrawal transaction", () => {
    const secondLender = "0x3333333333333333333333333333333333333333"
    const transaction = prepareWithdrawalClaim(MARKET, [
      { lender: LENDER, expiry: 123 },
      { lender: secondLender, expiry: 456 },
    ])

    expect(
      decodeFunctionData({
        abi: wildcatMarketAbi,
        data: transaction.data as `0x${string}`,
      }),
    ).toEqual({
      functionName: "executeWithdrawals",
      args: [
        [LENDER, secondLender],
        [123, 456],
      ],
    })
  })

  it("waits for another block and retries a pending closed-market batch", async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(pendingBatchError())
      .mockResolvedValueOnce({ data: "0x" })
    const { client, stopWatching } = makeClient({ call })
    const transaction = prepareWithdrawalClaim(MARKET, [
      { lender: LENDER, expiry: 123 },
    ])

    await preflightWithdrawalClaim({
      publicClient: client,
      account: LENDER,
      transaction,
      expiries: [123],
    })

    expect(call).toHaveBeenCalledTimes(2)
    expect(client.readContract).toHaveBeenCalledTimes(1)
    expect(client.watchBlockNumber).toHaveBeenCalledTimes(1)
    expect(stopWatching).toHaveBeenCalledTimes(1)
  })

  it("surfaces a non-transient simulation failure with an actionable message", async () => {
    const call = jest.fn().mockRejectedValue({
      cause: { data: NULL_WITHDRAWAL_AMOUNT },
    })
    const { client } = makeClient({ call })
    const transaction = prepareWithdrawalClaim(MARKET, [
      { lender: LENDER, expiry: 123 },
    ])

    await expect(
      preflightWithdrawalClaim({
        publicClient: client,
        account: LENDER,
        transaction,
        expiries: [123],
      }),
    ).rejects.toThrow("No assets are currently available to claim.")

    expect(client.watchBlockNumber).not.toHaveBeenCalled()
  })

  it("does not retry the pending-batch error for an open market", async () => {
    const call = jest.fn().mockRejectedValue(pendingBatchError())
    const { client } = makeClient({ call, isClosed: false })
    const transaction: PartialTransaction = prepareWithdrawalClaim(MARKET, [
      { lender: LENDER, expiry: 123 },
    ])

    await expect(
      preflightWithdrawalClaim({
        publicClient: client,
        account: LENDER,
        transaction,
        expiries: [123],
      }),
    ).rejects.toThrow(
      "This withdrawal batch is still pending. Wait for the next block and try again.",
    )

    expect(client.watchBlockNumber).not.toHaveBeenCalled()
  })

  it("does not retry a different pending batch on a closed market", async () => {
    const call = jest.fn().mockRejectedValue(pendingBatchError())
    const { client } = makeClient({ call, pendingWithdrawalExpiry: 456 })
    const transaction = prepareWithdrawalClaim(MARKET, [
      { lender: LENDER, expiry: 123 },
    ])

    await expect(
      preflightWithdrawalClaim({
        publicClient: client,
        account: LENDER,
        transaction,
        expiries: [123],
      }),
    ).rejects.toThrow(
      "This withdrawal batch is still pending. Wait for the next block and try again.",
    )

    expect(client.watchBlockNumber).not.toHaveBeenCalled()
  })
})
