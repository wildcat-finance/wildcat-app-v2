import type { PublicClient } from "viem"

import type { LenderRestorationPolicy } from "./lenderAccess"
import {
  getLenderUpdateSafeBatch,
  prepareLenderRestoration,
} from "./lenderAccess"

const policyAddress = "0x0000000000000000000000000000000000000010"
const lenderA = "0x0000000000000000000000000000000000000011"
const lenderB = "0x0000000000000000000000000000000000000012"

const grantTransaction = {
  to: policyAddress,
  data: "0x11111111",
  value: "0",
}

const makePolicy = () => {
  const populateAddLenders = jest.fn().mockReturnValue(grantTransaction)
  const populateUnblockLender = jest.fn((lender: string) => ({
    to: policyAddress,
    data: lender === lenderA ? "0xaaaaaaaa" : "0xbbbbbbbb",
    value: "0",
  }))
  const policy = {
    address: policyAddress,
    populateAddLenders,
    populateUnblockLender,
  } as unknown as LenderRestorationPolicy
  return { policy, populateAddLenders, populateUnblockLender }
}

const makePublicClient = (blocked: Record<string, boolean>) => {
  const getBlock = jest.fn().mockResolvedValue({
    number: BigInt(123),
    timestamp: BigInt(456),
  })
  const readContract = jest.fn(({ args }: { args: [string] }) =>
    Promise.resolve({
      isBlockedFromDeposits: blocked[args[0]] ?? false,
      lastProvider: "0x0000000000000000000000000000000000000000",
      canRefresh: false,
      lastApprovalTimestamp: 0,
    }),
  )
  return {
    publicClient: { getBlock, readContract } as unknown as PublicClient,
    getBlock,
    readContract,
  }
}

describe("prepareLenderRestoration", () => {
  it("uses one chain snapshot and orders grant before required unblocks", async () => {
    const { policy, populateAddLenders, populateUnblockLender } = makePolicy()
    const { publicClient, readContract } = makePublicClient({
      [lenderA]: true,
      [lenderB]: false,
    })

    const plan = await prepareLenderRestoration(publicClient, policy, [
      lenderA,
      lenderB,
    ])

    expect(plan.blockNumber).toBe(BigInt(123))
    expect(plan.blockTimestamp).toBe(456)
    expect(plan.blockedLenders).toEqual([lenderA])
    expect(plan.transactions).toEqual([
      grantTransaction,
      { to: policyAddress, data: "0xaaaaaaaa", value: "0" },
    ])
    expect(populateAddLenders).toHaveBeenCalledWith([
      { lender: lenderA, credentialTimestamp: 456 },
      { lender: lenderB, credentialTimestamp: 456 },
    ])
    expect(populateUnblockLender).toHaveBeenCalledWith(lenderA)
    expect(readContract).toHaveBeenCalledTimes(2)
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getPreviousLenderStatus",
        blockNumber: BigInt(123),
      }),
    )
  })

  it("does not add unblock calls for lenders that are not blocked", async () => {
    const { policy, populateUnblockLender } = makePolicy()
    const { publicClient } = makePublicClient({})

    const plan = await prepareLenderRestoration(publicClient, policy, [lenderA])

    expect(plan.transactions).toEqual([grantTransaction])
    expect(populateUnblockLender).not.toHaveBeenCalled()
  })

  it("fails before building transactions when live block-state reads fail", async () => {
    const { policy, populateAddLenders } = makePolicy()
    const publicClient = {
      getBlock: jest.fn().mockResolvedValue({
        number: BigInt(123),
        timestamp: BigInt(456),
      }),
      readContract: jest.fn().mockRejectedValue(Error("RPC unavailable")),
    } as unknown as PublicClient

    await expect(
      prepareLenderRestoration(publicClient, policy, [lenderA]),
    ).rejects.toThrow("RPC unavailable")
    expect(populateAddLenders).not.toHaveBeenCalled()
  })
})

describe("getLenderUpdateSafeBatch", () => {
  it("batches multiple Safe transactions on any network", () => {
    const transactions = [{ id: 1 }, { id: 2 }]

    expect(getLenderUpdateSafeBatch(true, transactions)).toBe(transactions)
  })

  it("does not batch a single transaction or a non-Safe flow", () => {
    expect(getLenderUpdateSafeBatch(true, [{ id: 1 }])).toBeUndefined()
    expect(
      getLenderUpdateSafeBatch(false, [{ id: 1 }, { id: 2 }]),
    ).toBeUndefined()
  })
})
