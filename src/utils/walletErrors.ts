export type WalletSignErrorKind = "declined" | "walletMismatch" | "unknown"

type ErrorLike = {
  code?: unknown
  cause?: { code?: unknown }
  message?: unknown
}

export const classifyWalletSignError = (
  error: unknown,
): WalletSignErrorKind => {
  const err = (error ?? {}) as ErrorLike
  const message = typeof err.message === "string" ? err.message : ""

  if (
    err.code === "ACTION_REJECTED" ||
    err.code === 4001 ||
    err.cause?.code === 4001 ||
    /user (rejected|denied)|rejected the request/i.test(message)
  ) {
    return "declined"
  }

  if (
    /does not match signing account|does not match the connected wallet|Connected wallet changed before signing|Connected Safe does not match/.test(
      message,
    )
  ) {
    return "walletMismatch"
  }

  return "unknown"
}
