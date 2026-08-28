import {
  accessListRoleProviderAbi,
  FixedTermHooks,
  HooksInstance,
  iOpenTermHooksAbi,
  MarketController,
  OpenTermHooks,
  PartialTransaction,
  PeriodicTermHooks,
  prepareAddAccessListMembers,
  prepareTransaction,
} from "@wildcatfi/wildcat-sdk"
import { parseAbi, type Address, type PublicClient } from "viem"

export const lenderPolicyErrorAbi = parseAbi([
  "error CallerNotAdministrator()",
  "error CallerNotBorrower()",
  "error GrantedCredentialExpired()",
  "error InvalidArrayLength()",
  "error InvalidCredentialReturned()",
  "error InvalidCredentialTimestamp()",
  "error InvalidMember()",
  "error MemberAlreadyExists()",
  "error MemberNotFound()",
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

export type CompatibilityLenderAdditionPlan = {
  blockNumber: bigint
  blockTimestamp: number
  blockedLenders: string[]
  membershipTransactions: PartialTransaction[]
  transactions: PartialTransaction[]
  unblockTransactions: PartialTransaction[]
}

export type CompatibilityLenderPolicy = Pick<
  HooksInstance,
  | "address"
  | "administrator"
  | "populateBlockLenders"
  | "populateUnblockLender"
  | "roleProviders"
>

type CompatibilityProvider =
  | { address: string; kind: "access-list" }
  | { address: string; kind: "legacy-push" }

export const getLenderUpdateSafeBatch = <Transaction>(
  isConnectedToSafe: boolean,
  transactions: Transaction[],
): Transaction[] | undefined =>
  isConnectedToSafe && transactions.length > 1 ? transactions : undefined

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

const readAccessListMembership = (
  publicClient: PublicClient,
  providerAddress: string,
  lender: string,
  blockNumber: bigint,
): Promise<boolean> =>
  publicClient.readContract({
    address: providerAddress as Address,
    abi: accessListRoleProviderAbi,
    functionName: "isMember",
    args: [lender as Address],
    blockNumber,
  }) as Promise<boolean>

const getCompatibilityProvider = (
  policy: CompatibilityLenderPolicy,
): CompatibilityProvider => {
  const administrator = policy.administrator.toLowerCase()
  const approvedProviders = policy.roleProviders.filter(
    (provider) => provider.isApproved,
  )
  const accessLists = approvedProviders.filter(
    (provider) => provider.kind === "access-list",
  )
  const managedAccessLists = accessLists.filter(
    (provider) => provider.administrator?.toLowerCase() === administrator,
  )

  if (managedAccessLists.length > 1) {
    throw Error(
      "Multiple managed access lists require explicit provider selection",
    )
  }
  if (managedAccessLists.length === 1) {
    return {
      address: managedAccessLists[0].providerAddress,
      kind: "access-list",
    }
  }
  if (accessLists.length > 0) {
    throw Error("The borrower does not administer this policy's access list")
  }

  const legacyBorrowerProvider = approvedProviders.find(
    (provider) =>
      provider.isPushProvider &&
      provider.providerAddress.toLowerCase() === administrator,
  )
  if (legacyBorrowerProvider) {
    return {
      address: legacyBorrowerProvider.providerAddress,
      kind: "legacy-push",
    }
  }

  throw Error(
    "No borrower-managed lender provider is available for this policy",
  )
}

export const canManagePolicyLenders = (
  policy: CompatibilityLenderPolicy | undefined,
): boolean => {
  if (!policy) return false
  try {
    getCompatibilityProvider(policy)
    return true
  } catch {
    return false
  }
}

const prepareLegacyLenderGrant = (
  policyAddress: string,
  lenders: string[],
  credentialTimestamp: number,
): PartialTransaction =>
  prepareTransaction({
    to: policyAddress,
    abi: iOpenTermHooksAbi,
    functionName: lenders.length === 1 ? "grantRole" : "grantRoles",
    args:
      lenders.length === 1
        ? [lenders[0], credentialTimestamp]
        : [lenders, lenders.map(() => credentialTimestamp)],
  })

/**
 * Temporary v2.5 compatibility adapter for the existing frontend behavior.
 * Its "add lender" action also clears a hook-local block, while membership and
 * blocking remain separate domains in the SDK and protocol.
 */
export const prepareCompatibilityLenderAddition = async (
  publicClient: PublicClient,
  policy: CompatibilityLenderPolicy,
  lenders: string[],
): Promise<CompatibilityLenderAdditionPlan> => {
  if (lenders.length === 0) {
    throw Error("At least one lender is required")
  }

  const provider = getCompatibilityProvider(policy)
  const block = await publicClient.getBlock()
  const blockTimestamp = toCredentialTimestamp(block.timestamp)
  const [statuses, memberships] = await Promise.all([
    Promise.all(
      lenders.map((lender) =>
        readStoredLenderStatus(
          publicClient,
          policy.address,
          lender,
          block.number,
        ),
      ),
    ),
    provider.kind === "access-list"
      ? Promise.all(
          lenders.map((lender) =>
            readAccessListMembership(
              publicClient,
              provider.address,
              lender,
              block.number,
            ),
          ),
        )
      : Promise.resolve(undefined),
  ])
  const blockedLenders = lenders.filter(
    (_, index) => statuses[index].isBlockedFromDeposits,
  )
  const membershipTransactions =
    provider.kind === "access-list"
      ? (() => {
          const missingMembers = lenders.filter(
            (_, index) => !memberships?.[index],
          )
          return missingMembers.length > 0
            ? [prepareAddAccessListMembers(provider.address, missingMembers)]
            : []
        })()
      : [prepareLegacyLenderGrant(policy.address, lenders, blockTimestamp)]
  const unblockTransactions = blockedLenders.map((lender) =>
    policy.populateUnblockLender(lender),
  )

  return {
    blockNumber: block.number,
    blockTimestamp,
    blockedLenders,
    membershipTransactions,
    transactions: [...membershipTransactions, ...unblockTransactions],
    unblockTransactions,
  }
}

/** Preserve the current UI's "remove lender" behavior: block at the hook. */
export const prepareCompatibilityLenderRemoval = (
  policy: CompatibilityLenderPolicy,
  lenders: string[],
): PartialTransaction => policy.populateBlockLenders(lenders)
