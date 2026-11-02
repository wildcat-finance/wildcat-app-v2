import { decodeErrorResult, type Abi, type Hex } from "viem"

/**
 * Human wording for custom errors raised by user-facing contract interactions.
 * Anything unlisted still surfaces by name, which is far more actionable than
 * "Something went wrong".
 */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  CallerNotBorrower: "Only the borrower of this policy can change its lenders.",
  ProviderNotFound:
    "This wallet is not a role provider on this policy, so it cannot grant or revoke lender credentials.",
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
 * The slice of an ethers contract interface needed to decode a revert. Typed
 * structurally so the util carries no ethers dependency - the SDK's contract
 * wrappers satisfy it as-is.
 */
export type ContractErrorDecoder = {
  parseError: (data: string) => { name: string }
}

/**
 * Pull the ABI-encoded revert payload out of a provider error. Where it sits
 * depends on whether the failure came from `eth_call`, gas estimation or the
 * wallet, and some RPCs bury it in a JSON body string.
 */
const extractRevertData = (error: unknown): string | undefined => {
  const seen = new Set<unknown>()
  const visit = (node: unknown): string | undefined => {
    if (typeof node === "string") {
      if (node.startsWith("0x") && node.length >= 10) return node
      if (node.trimStart().startsWith("{")) {
        try {
          return visit(JSON.parse(node))
        } catch {
          return undefined
        }
      }
      return undefined
    }
    if (typeof node !== "object" || node === null || seen.has(node)) {
      return undefined
    }
    seen.add(node)
    const keys = ["data", "error", "body", "cause", "originalError", "info"]
    for (let i = 0; i < keys.length; i += 1) {
      const found = visit((node as Record<string, unknown>)[keys[i]])
      if (found) return found
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
 * Name of the custom error a contract reverted with. Decodes against a viem
 * ABI or an ethers contract interface, whichever the caller has at hand.
 */
export const getContractErrorName = (
  error: unknown,
  decoder?: Abi | ContractErrorDecoder,
): string | undefined => {
  const named = (error as { errorName?: string } | null)?.errorName
  if (named) return named

  const data = extractRevertData(error)
  if (data && decoder) {
    try {
      return Array.isArray(decoder)
        ? decodeErrorResult({ abi: decoder, data: data as Hex }).errorName
        : (decoder as ContractErrorDecoder).parseError(data).name
    } catch {
      return undefined
    }
  }
  return undefined
}

/**
 * Wording for a decoded custom error. Returns undefined when nothing could be
 * decoded, so callers show their own generic copy - never the provider's raw
 * message, which is a multi-kilobyte dump that breaks the layout.
 */
export const describeContractRevert = (
  error: unknown,
  decoder?: Abi | ContractErrorDecoder,
): string | undefined => {
  const named = getContractErrorName(error, decoder)
  if (named) return CONTRACT_ERROR_MESSAGES[named] ?? `Reverted: ${named}`
  return undefined
}

/**
 * Turn a failed contract interaction into something a user can act on.
 * Decodes the custom error against the contract's own ABI when revert data is
 * available, and otherwise falls back to whatever the provider said.
 */
export const describeContractError = (
  error: unknown,
  contractAbi?: Abi,
): string =>
  describeContractRevert(error, contractAbi) ??
  getErrorMessage(error) ??
  "Transaction failed"
