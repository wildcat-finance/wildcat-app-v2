import {
  prepareAddAccessListMembers,
  prepareTransaction,
} from "@wildcatfi/wildcat-sdk"
import type { PublicClient } from "viem"

import type { CompatibilityLenderPolicy } from "./lenderAccess"
import {
  canManagePolicyLenders,
  getLenderUpdateSafeBatch,
  prepareCompatibilityLenderAddition,
  prepareCompatibilityLenderRemoval,
} from "./lenderAccess"

jest.mock("@wildcatfi/wildcat-sdk", () => {
  const actual = jest.requireActual("@wildcatfi/wildcat-sdk")
  return {
    ...actual,
    prepareAddAccessListMembers: jest.fn((provider: string) => ({
      to: provider,
      data: "0xcccc",
      value: "0",
    })),
    prepareTransaction: jest.fn(({ to }: { to: string }) => ({
      to,
      data: "0xdddd",
      value: "0",
    })),
  }
})

const policyAddress = "0x0000000000000000000000000000000000000010"
const borrower = "0x0000000000000000000000000000000000000011"
const lenderA = "0x0000000000000000000000000000000000000012"
const lenderB = "0x0000000000000000000000000000000000000013"
const accessList = "0x0000000000000000000000000000000000000014"

const blockTransaction = {
  to: policyAddress,
  data: "0x11111111",
  value: "0",
}

const makePolicy = (kind: "access-list" | "legacy-push" = "access-list") => {
  const populateBlockLenders = jest.fn().mockReturnValue(blockTransaction)
  const populateUnblockLender = jest.fn((lender: string) => ({
    to: policyAddress,
    data: lender === lenderA ? "0xaaaaaaaa" : "0xbbbbbbbb",
    value: "0",
  }))
  const policy = {
    address: policyAddress,
    administrator: borrower,
    populateBlockLenders,
    populateUnblockLender,
    roleProviders: [
      kind === "access-list"
        ? {
            administrator: borrower,
            isApproved: true,
            isManaged: true,
            isPullProvider: true,
            isPushProvider: false,
            kind: "access-list",
            providerAddress: accessList,
          }
        : {
            isApproved: true,
            isPullProvider: false,
            isPushProvider: true,
            kind: "unknown",
            providerAddress: borrower,
          },
    ],
  } as unknown as CompatibilityLenderPolicy
  return { policy, populateBlockLenders, populateUnblockLender }
}

const makePublicClient = ({
  blocked = {},
  members = {},
}: {
  blocked?: Record<string, boolean>
  members?: Record<string, boolean>
}) => {
  const getBlock = jest.fn().mockResolvedValue({
    number: BigInt(123),
    timestamp: BigInt(456),
  })
  const readContract = jest.fn(
    ({ functionName, args }: { functionName: string; args: [string] }) => {
      if (functionName === "isMember") {
        return Promise.resolve(members[args[0]] ?? false)
      }
      return Promise.resolve({
        isBlockedFromDeposits: blocked[args[0]] ?? false,
        lastProvider: "0x0000000000000000000000000000000000000000",
        canRefresh: false,
        lastApprovalTimestamp: 0,
      })
    },
  )
  return {
    publicClient: { getBlock, readContract } as unknown as PublicClient,
    getBlock,
    readContract,
  }
}

describe("prepareCompatibilityLenderAddition", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("adds missing access-list members before restoring existing hook blocks", async () => {
    const { policy, populateUnblockLender } = makePolicy()
    const { publicClient, readContract } = makePublicClient({
      blocked: { [lenderA]: true },
      members: { [lenderA]: true, [lenderB]: false },
    })

    const plan = await prepareCompatibilityLenderAddition(
      publicClient,
      policy,
      [lenderA, lenderB],
    )

    expect(plan.blockNumber).toBe(BigInt(123))
    expect(plan.blockTimestamp).toBe(456)
    expect(plan.blockedLenders).toEqual([lenderA])
    expect(plan.membershipTransactions).toEqual([
      { to: accessList, data: "0xcccc", value: "0" },
    ])
    expect(prepareAddAccessListMembers).toHaveBeenCalledWith(accessList, [
      lenderB,
    ])
    expect(plan.unblockTransactions).toEqual([
      { to: policyAddress, data: "0xaaaaaaaa", value: "0" },
    ])
    expect(plan.transactions).toEqual([
      ...plan.membershipTransactions,
      ...plan.unblockTransactions,
    ])
    expect(populateUnblockLender).toHaveBeenCalledWith(lenderA)
    expect(readContract).toHaveBeenCalledTimes(4)
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getPreviousLenderStatus",
        blockNumber: BigInt(123),
      }),
    )
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "isMember",
        blockNumber: BigInt(123),
      }),
    )
  })

  it("only unblocks a lender who is already an access-list member", async () => {
    const { policy } = makePolicy()
    const { publicClient } = makePublicClient({
      blocked: { [lenderA]: true },
      members: { [lenderA]: true },
    })

    const plan = await prepareCompatibilityLenderAddition(
      publicClient,
      policy,
      [lenderA],
    )

    expect(plan.membershipTransactions).toEqual([])
    expect(plan.transactions).toEqual(plan.unblockTransactions)
  })

  it("does nothing when an access-list member is already unblocked", async () => {
    const { policy, populateUnblockLender } = makePolicy()
    const { publicClient } = makePublicClient({ members: { [lenderA]: true } })

    const plan = await prepareCompatibilityLenderAddition(
      publicClient,
      policy,
      [lenderA],
    )

    expect(plan.transactions).toEqual([])
    expect(populateUnblockLender).not.toHaveBeenCalled()
  })

  it("preserves legacy borrower-provider grant then unblock behavior", async () => {
    const { policy } = makePolicy("legacy-push")
    const { publicClient } = makePublicClient({
      blocked: { [lenderA]: true },
    })

    const plan = await prepareCompatibilityLenderAddition(
      publicClient,
      policy,
      [lenderA, lenderB],
    )

    expect(prepareTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to: policyAddress,
        functionName: "grantRoles",
        args: [
          [lenderA, lenderB],
          [456, 456],
        ],
      }),
    )
    expect(plan.transactions).toEqual([
      ...plan.membershipTransactions,
      ...plan.unblockTransactions,
    ])
  })

  it("rejects access lists administered by another address", async () => {
    const { policy } = makePolicy()
    policy.roleProviders[0].administrator = lenderB
    const { publicClient, getBlock } = makePublicClient({})

    await expect(
      prepareCompatibilityLenderAddition(publicClient, policy, [lenderA]),
    ).rejects.toThrow(
      "The borrower does not administer this policy's access list",
    )
    expect(getBlock).not.toHaveBeenCalled()
  })
})

describe("canManagePolicyLenders", () => {
  it("matches the provider paths supported by lender updates", () => {
    expect(canManagePolicyLenders(makePolicy().policy)).toBe(true)
    expect(canManagePolicyLenders(makePolicy("legacy-push").policy)).toBe(true)

    const { policy } = makePolicy()
    policy.roleProviders[0].administrator = lenderB
    expect(canManagePolicyLenders(policy)).toBe(false)
    expect(canManagePolicyLenders(undefined)).toBe(false)
  })
})

describe("prepareCompatibilityLenderRemoval", () => {
  it("preserves the existing hook-wide block behavior", () => {
    const { policy, populateBlockLenders } = makePolicy()

    expect(prepareCompatibilityLenderRemoval(policy, [lenderA])).toBe(
      blockTransaction,
    )
    expect(populateBlockLenders).toHaveBeenCalledWith([lenderA])
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
