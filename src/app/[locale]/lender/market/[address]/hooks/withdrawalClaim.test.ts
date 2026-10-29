/** @jest-environment node */
import { typechain } from "@wildcatfi/wildcat-sdk"
import { decodeFunctionData, encodeErrorResult, type PublicClient } from "viem"

import {
  prepareWithdrawalClaim,
  preflightWithdrawalClaim,
} from "./withdrawalClaim"

const market = "0x0000000000000000000000000000000000000001"
const lender = "0x0000000000000000000000000000000000000002"
const expiry = 1_700_000_000
const pendingError = {
  cause: {
    data: encodeErrorResult({
      abi: [{ type: "error", name: "WithdrawalBatchNotExpired", inputs: [] }],
      errorName: "WithdrawalBatchNotExpired",
    }),
  },
}

function setup() {
  const unwatch = jest.fn()
  let onBlock: ((block: bigint) => void) | undefined
  const client = {
    call: jest.fn().mockResolvedValue({ data: "0x" }),
    readContract: jest.fn().mockResolvedValue({
      isClosed: true,
      pendingWithdrawalExpiry: expiry,
    }),
    getBlockNumber: jest.fn().mockResolvedValue(100n),
    watchBlockNumber: jest.fn(({ onBlockNumber }) => {
      onBlock = onBlockNumber
      return unwatch
    }),
  }
  return {
    client,
    unwatch,
    nextBlock: (block: bigint) => onBlock?.(block),
    preflight: () =>
      preflightWithdrawalClaim({
        publicClient: client as unknown as PublicClient,
        account: lender,
        transaction: prepareWithdrawalClaim(market, [{ lender, expiry }]),
        expiries: [expiry],
      }),
  }
}

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

describe("legacy withdrawal claim preflight", () => {
  it("encodes single and multiple claims with the SDK's legacy ABI", () => {
    const { abi } = typechain.WildcatMarket__factory
    expect(
      decodeFunctionData({
        abi,
        data: prepareWithdrawalClaim(market, [{ lender, expiry }]).data,
      }),
    ).toEqual({ functionName: "executeWithdrawal", args: [lender, expiry] })
    expect(
      decodeFunctionData({
        abi,
        data: prepareWithdrawalClaim(market, [
          { lender, expiry },
          { lender, expiry: expiry + 1 },
        ]).data,
      }),
    ).toEqual({
      functionName: "executeWithdrawals",
      args: [
        [lender, lender],
        [expiry, expiry + 1],
      ],
    })
    expect(() => prepareWithdrawalClaim(market, [])).toThrow("No executable")
  })

  it("does not delay a claim that already simulates successfully", async () => {
    const fixture = setup()
    await fixture.preflight()
    expect(fixture.client.call).toHaveBeenCalledTimes(1)
    expect(fixture.client.readContract).not.toHaveBeenCalled()
    expect(fixture.client.watchBlockNumber).not.toHaveBeenCalled()
  })

  it("retries a closed market's pending batch only after a newer block", async () => {
    const fixture = setup()
    fixture.client.call.mockRejectedValueOnce(pendingError)
    const pending = fixture.preflight()
    await flushPromises()
    fixture.nextBlock(100n)
    expect(fixture.client.call).toHaveBeenCalledTimes(1)
    fixture.nextBlock(101n)
    await pending
    expect(fixture.client.call).toHaveBeenCalledTimes(2)
    expect(fixture.unwatch).toHaveBeenCalledTimes(1)
  })

  it.each([
    { isClosed: false, pendingWithdrawalExpiry: expiry },
    { isClosed: true, pendingWithdrawalExpiry: expiry + 1 },
  ])("does not retry an unrelated or open pending batch: %j", async (state) => {
    const fixture = setup()
    fixture.client.call.mockRejectedValueOnce(pendingError)
    fixture.client.readContract.mockResolvedValue(state)
    await expect(fixture.preflight()).rejects.toThrow("still pending")
    expect(fixture.client.watchBlockNumber).not.toHaveBeenCalled()
  })

  it("stops after the retry fails instead of requesting a wallet transaction", async () => {
    const fixture = setup()
    fixture.client.call.mockRejectedValue(pendingError)
    const pending = expect(fixture.preflight()).rejects.toThrow("still pending")
    await flushPromises()
    fixture.nextBlock(101n)
    await pending
    expect(fixture.client.call).toHaveBeenCalledTimes(2)
    expect(fixture.unwatch).toHaveBeenCalledTimes(1)
  })

  it("cleans up its subscription if no next block arrives", async () => {
    jest.useFakeTimers({ doNotFake: ["setImmediate"] })
    try {
      const fixture = setup()
      fixture.client.call.mockRejectedValueOnce(pendingError)
      const pending = expect(fixture.preflight()).rejects.toThrow("Timed out")
      await flushPromises()
      await jest.advanceTimersByTimeAsync(60_000)
      await pending
      expect(fixture.unwatch).toHaveBeenCalledTimes(1)
      expect(fixture.client.call).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })
})
