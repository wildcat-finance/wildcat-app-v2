import { wildcatMarketV2_5Abi as marketErrorAbi } from "@wildcatfi/wildcat-sdk"
import { decodeErrorResult, type Abi, type Hex } from "viem"

/**
 * Human wording for custom errors raised by user-facing contract interactions.
 * Anything unlisted still surfaces by name, which is far more actionable than
 * "Something went wrong".
 */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  AccountBlocked: "This wallet is blocked from this action.",
  CallerNotAdministrator:
    "Only the current administrator can make this change.",
  InvalidMember: "Enter a valid, nonzero wallet address.",
  MemberAlreadyExists: "This wallet is already enrolled.",
  MemberNotFound: "This wallet is no longer enrolled.",
  CallerNotBorrower: "Only the borrower of this policy can change its lenders.",
  ProviderNotFound:
    "This wallet is not a role provider on this policy, so it cannot grant or revoke lender credentials.",
  InvalidCredentialTimestamp:
    "The credential timestamp is ahead of the latest block. Refresh and try again.",
  GrantedCredentialExpired:
    "The credential timestamp is not accepted by the policy. Try again in a few seconds.",
  ProviderCanNotReplaceCredential:
    "This lender already holds a credential from another provider that outlasts the one being granted.",
  ProviderCanNotRevokeCredential:
    "This lender's credential was issued by another provider and cannot be revoked here.",
  NotApprovedLender: "This lender is not approved on the policy.",
  InvalidArrayLength: "The submitted lender list is malformed.",
  WithdrawalBatchNotExpired:
    "This withdrawal batch is still pending. Wait for the next block and try again.",
  NullWithdrawalAmount: "No assets are currently available to claim.",
}

/**
 * Pull the ABI-encoded revert payload out of a provider error. Where it sits
 * depends on whether the failure came from `eth_call`, gas estimation or the
 * wallet, and some RPCs bury it in a JSON body string.
 */
export const getContractErrorName = (
  error: unknown,
  abi?: Abi,
): string | undefined => {
  const seen = new Set<unknown>()
  const visit = (node: unknown): string | undefined => {
    if (typeof node === "string") {
      if (abi && /^0x[\da-f]{8,}$/i.test(node)) {
        try {
          return decodeErrorResult({ abi, data: node as Hex }).errorName
        } catch {
          return undefined
        }
      }
      if (node.trimStart().startsWith("{")) {
        try {
          return visit(JSON.parse(node))
        } catch {
          return undefined
        }
      }
      return undefined
    }
    if (typeof node !== "object" || node === null || seen.has(node))
      return undefined
    seen.add(node)
    const details = node as Record<string, unknown>
    if (typeof details.errorName === "string") return details.errorName
    const keys = [
      "data",
      "error",
      "body",
      "cause",
      "originalError",
      "info",
      "raw",
    ]
    for (let index = 0; index < keys.length; index += 1) {
      const name = visit(details[keys[index]])
      if (name) return name
    }
    return undefined
  }
  return visit(error)
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (typeof error === "object" && error !== null) {
    const { shortMessage, reason, message } = error as {
      shortMessage?: string
      reason?: string
      message?: string
    }
    return shortMessage || reason || message
  }
  return undefined
}

/**
 * Turn a failed contract interaction into something a borrower can act on.
 * Decodes the custom error against the contract's own ABI when revert data is
 * available, and otherwise falls back to whatever the provider said.
 */
export const describeContractError = (
  error: unknown,
  contractAbi?: Abi,
): string => {
  const named = getContractErrorName(error, contractAbi)
  if (named) return CONTRACT_ERROR_MESSAGES[named] ?? `Reverted: ${named}`

  return getErrorMessage(error) ?? "Transaction failed"
}

// Only a policy access rejection warrants enrollment guidance. Preserve wallet,
// sanctions, amount and network errors even when shared KYC is attached.
export const describeLenderError = (
  error: unknown,
  acceptsKyc: boolean,
  kycHint: string,
) =>
  acceptsKyc &&
  getContractErrorName(error, marketErrorAbi) === "NotApprovedLender"
    ? kycHint
    : describeContractError(error, marketErrorAbi)
