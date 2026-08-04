import {
  FixedTermHooks,
  HooksInstance,
  iOpenTermHooksAbi,
  MarketController,
  OpenTermHooks,
  PartialTransaction,
  PeriodicTermHooks,
} from "@wildcatfi/wildcat-sdk"
import { parseAbi, type Address, type PublicClient } from "viem"

export const lenderPolicyErrorAbi = parseAbi([
  "error CallerNotBorrower()",
  "error GrantedCredentialExpired()",
  "error InvalidArrayLength()",
  "error InvalidCredentialReturned()",
  "error InvalidCredentialTimestamp()",
  "error NotApprovedLender()",
  "error ProviderCanNotReplaceCredential()",
  "error ProviderCanNotRevokeCredential()",
  "error ProviderNotFound()",
])

export const isV2HooksInstance = (
  policy: HooksInstance | MarketController,
): policy is HooksInstance =>
  policy instanceof OpenTermHooks ||
  policy instanceof FixedTermHooks ||
  policy instanceof PeriodicTermHooks

type StoredLenderStatus = {
  isBlockedFromDeposits: boolean
  lastProvider: Address
  canRefresh: boolean
  lastApprovalTimestamp: number
}

export type LenderRestorationPlan = {
  blockNumber: bigint
  blockTimestamp: number
  blockedLenders: string[]
  transactions: PartialTransaction[]
}

export type LenderRestorationPolicy = Pick<
  HooksInstance,
  "address" | "populateAddLenders" | "populateUnblockLender"
>

const toCredentialTimestamp = (timestamp: bigint): number => {
  const value = Number(timestamp)
  if (!Number.isSafeInteger(value) || value <= 0 || value > 0xffffffff) {
    throw Error("Latest block timestamp is not a valid credential timestamp")
  }
  return value
}

const readStoredLenderStatus = (
  publicClient: PublicClient,
  hooksAddress: string,
  lender: string,
  blockNumber: bigint,
): Promise<StoredLenderStatus> =>
  publicClient.readContract({
    address: hooksAddress as Address,
    abi: iOpenTermHooksAbi,
    functionName: "getPreviousLenderStatus",
    args: [lender as Address],
    blockNumber,
  }) as Promise<StoredLenderStatus>

/**
 * Plans the existing-policy restore workflow against one chain snapshot.
 * Granting must remain first because it is the permissioned operation; only
 * lenders whose independent deposit block is set receive a follow-up unblock.
 */
export const prepareLenderRestoration = async (
  publicClient: PublicClient,
  policy: LenderRestorationPolicy,
  lenders: string[],
): Promise<LenderRestorationPlan> => {
  if (lenders.length === 0) {
    throw Error("At least one lender is required")
  }

  const block = await publicClient.getBlock()
  const blockTimestamp = toCredentialTimestamp(block.timestamp)
  const statuses = await Promise.all(
    lenders.map((lender) =>
      readStoredLenderStatus(
        publicClient,
        policy.address,
        lender,
        block.number,
      ),
    ),
  )
  const blockedLenders = lenders.filter(
    (_, index) => statuses[index].isBlockedFromDeposits,
  )

  return {
    blockNumber: block.number,
    blockTimestamp,
    blockedLenders,
    transactions: [
      policy.populateAddLenders(
        lenders.map((lender) => ({
          lender,
          credentialTimestamp: blockTimestamp,
        })),
      ),
      ...blockedLenders.map((lender) => policy.populateUnblockLender(lender)),
    ],
  }
}
