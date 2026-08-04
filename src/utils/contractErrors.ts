import { decodeErrorResult, type Abi, type Hex } from "viem"

/**
 * Human wording for the custom errors raised while managing policy lenders.
 * Anything unlisted still surfaces by name, which is far more actionable than
 * "Something went wrong".
 */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
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
 * Turn a failed contract interaction into something a borrower can act on.
 * Decodes the custom error against the contract's own ABI when revert data is
 * available, and otherwise falls back to whatever the provider said.
 */
export const describeContractError = (
  error: unknown,
  contractAbi?: Abi,
): string => {
  const named = (error as { errorName?: string } | null)?.errorName
  if (named) return CONTRACT_ERROR_MESSAGES[named] ?? `Reverted: ${named}`

  const data = extractRevertData(error)
  if (data && contractAbi) {
    try {
      const { errorName } = decodeErrorResult({
        abi: contractAbi,
        data: data as Hex,
      })
      return CONTRACT_ERROR_MESSAGES[errorName] ?? `Reverted: ${errorName}`
    } catch {
      // Unknown selector - fall through to the provider's own message.
    }
  }

  return getErrorMessage(error) ?? "Transaction failed"
}
