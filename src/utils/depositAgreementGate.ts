export type DepositAgreementGateState =
  | "loading"
  | "error"
  | "requires-borrower-mla-selection"
  | "requires-mla-signature"
  | "requires-non-mla-acknowledgement"
  | "satisfied"

export const requiresExplicitMlaSelection = (generation?: string) => {
  const match = generation?.match(/^v(\d+)(?:\.(\d+))?$/i)
  if (!match) return false

  const major = Number(match[1])
  const minor = Number(match[2] ?? 0)
  return major > 2 || (major === 2 && minor >= 5)
}

export const getDepositAgreementGateState = ({
  generation,
  mla,
  mlaLoading,
  mlaError,
  signedMla,
  signedMlaLoading,
  signedMlaError,
  acknowledgement,
  acknowledgementLoading,
  acknowledgementError,
}: {
  generation?: string
  mla:
    | { noMLA: boolean }
    | { chainId: number; market: string }
    | null
    | undefined
  mlaLoading: boolean
  mlaError: boolean
  signedMla: unknown | null | undefined
  signedMlaLoading: boolean
  signedMlaError: boolean
  acknowledgement: unknown | null | undefined
  acknowledgementLoading: boolean
  acknowledgementError: boolean
}): DepositAgreementGateState => {
  const requiresNonMlaAcknowledgement = !!mla && "noMLA" in mla
  const requiresMlaSignature = !!mla && !("noMLA" in mla)

  if (
    mlaError ||
    (requiresMlaSignature && signedMlaError) ||
    (requiresNonMlaAcknowledgement && acknowledgementError)
  ) {
    return "error"
  }

  if (
    mlaLoading ||
    mla === undefined ||
    (requiresMlaSignature && (signedMlaLoading || signedMla === undefined)) ||
    (requiresNonMlaAcknowledgement &&
      (acknowledgementLoading || acknowledgement === undefined))
  ) {
    return "loading"
  }

  if (mla === null && requiresExplicitMlaSelection(generation)) {
    return "requires-borrower-mla-selection"
  }
  if (requiresMlaSignature && signedMla === null) {
    return "requires-mla-signature"
  }
  if (requiresNonMlaAcknowledgement && acknowledgement === null) {
    return "requires-non-mla-acknowledgement"
  }

  return "satisfied"
}
