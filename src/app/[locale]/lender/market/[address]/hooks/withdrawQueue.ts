export type ResolveWithdrawalQueueRawArgs = {
  intent: bigint
  live: bigint
  isMaxRequested: boolean
  keepsDirect: boolean
  directBeforeUnwrap?: bigint
}

/**
 * Figure out how many normalized market tokens to queue.
 *
 * For wrapped-only Max, `directBeforeUnwrap` is intentionally a normalized
 * balance, not a scaled ownership boundary. Interest can accrue while the
 * lender signs both EOA transactions, so the final amount may be a little
 * higher than the preview. That's fine; the point is not leaving market-token
 * dust behind.
 */
export const resolveWithdrawalQueueRaw = ({
  intent,
  live,
  isMaxRequested,
  keepsDirect,
  directBeforeUnwrap,
}: ResolveWithdrawalQueueRawArgs): bigint => {
  const clampedIntent = intent <= live ? intent : live
  if (!isMaxRequested) return clampedIntent
  if (!keepsDirect) return live
  if (!directBeforeUnwrap) return clampedIntent

  const swept = live - directBeforeUnwrap

  // Take the larger amount. `swept` picks up anything that accrued while the
  // lender was signing; `clampedIntent` covers the one-unit rounding case. Max
  // should not leave a tiny market-token balance behind.
  return swept > clampedIntent ? swept : clampedIntent
}
