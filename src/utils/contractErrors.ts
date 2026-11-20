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
  ProviderNotFound: "The role provider is not attached to this policy.",
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

type DecodedRevert = { errorName: string; args?: readonly unknown[] }

/**
 * Pull the ABI-encoded revert payload out of a provider error. Where it sits
 * depends on whether the failure came from `eth_call`, gas estimation or the
 * wallet, and some RPCs bury it in a JSON body string.
 */
const getContractRevert = (
  error: unknown,
  abi?: Abi,
): DecodedRevert | undefined => {
  const seen = new Set<unknown>()
  const visit = (node: unknown): DecodedRevert | undefined => {
    if (typeof node === "string") {
      if (/^0x[\da-f]{8,}$/i.test(node)) {
        try {
          return decodeErrorResult({ abi: abi ?? [], data: node as Hex })
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
    const name =
      typeof details.errorName === "string" ? details.errorName : undefined
    const args = details.args ?? details.errorArgs
    if (name && (Array.isArray(args) || (name !== "Error" && name !== "Panic")))
      return { errorName: name, args: Array.isArray(args) ? args : undefined }
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
      const revert = visit(details[keys[index]])
      if (revert) return revert
    }
    return name ? { errorName: name } : undefined
  }
  return visit(error)
}

export const getContractErrorName = (error: unknown, abi?: Abi) =>
  getContractRevert(error, abi)?.errorName

const getErrorMessage = (error: unknown): string | undefined => {
  if (typeof error === "object" && error !== null) {
    const { shortMessage, reason, message } = error as {
      shortMessage?: string
      reason?: string
      message?: string
    }
    return reason || shortMessage || message
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
  const revert = getContractRevert(error, contractAbi)
  if (revert?.errorName === "Error") {
    const reason = revert.args?.[0]
    if (typeof reason === "string" && reason) return reason
  } else if (revert?.errorName === "Panic") {
    const code = revert.args?.[0]
    if (typeof code === "bigint" || typeof code === "number")
      return `Solidity panic (0x${code.toString(16)})`
  } else if (revert) {
    return (
      CONTRACT_ERROR_MESSAGES[revert.errorName] ??
      `Reverted: ${revert.errorName}`
    )
  }

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
