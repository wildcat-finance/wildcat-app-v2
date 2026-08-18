import { BigNumber } from "ethers"

export type ResolveWithdrawalQueueRawArgs = {
  intent: BigNumber
  live: BigNumber
  isMaxRequested: boolean
  keepsDirect: boolean
  directBeforeUnwrap?: BigNumber
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
}: ResolveWithdrawalQueueRawArgs): BigNumber => {
  const clampedIntent = intent.lte(live) ? intent : live
  if (!isMaxRequested) return clampedIntent
  if (!keepsDirect) return live
  if (!directBeforeUnwrap) return clampedIntent

  const swept = live.sub(directBeforeUnwrap)

  // Take the larger amount. `swept` picks up anything that accrued while the
  // lender was signing; `clampedIntent` covers the one-unit rounding case. Max
  // should not leave a tiny market-token balance behind.
  return swept.gt(clampedIntent) ? swept : clampedIntent
}
