/// Fill rules for the deposit modal's Max control (product#608).
///
/// The fillable maximum is the SDK's `marketAccount.maximumDeposit`,
/// already min(wallet balance of the underlying, remaining market
/// capacity). The display string comes from the SDK's truncating format
/// (never rounds up, never contains commas the parser would choke on).
/// The modal keeps the `TokenAmount` itself as the transaction amount for
/// as long as the fill is active, so the deposit carries the true value
/// rather than a five-decimal truncation.

/// Structural slice of TokenAmount so the pure rules test without the SDK.
export interface TokenAmountLike {
  format: (decimals: number) => string
  raw: { isZero: () => boolean }
}

export const DEPOSIT_AMOUNT_DISPLAY_DECIMALS = 5

/// The string the Max control writes into the input, or null when there
/// is nothing worth filling.
///
/// A maximum below the display precision is treated as nothing: `format`
/// truncates, so 0.0000099 renders as "0", and filling that would leave a
/// field reading zero above a live Deposit button armed with dust.
export function fillMaxDepositInput<T extends TokenAmountLike>(
  maximumDeposit: T,
): string | null {
  if (maximumDeposit.raw.isZero()) return null
  const display = maximumDeposit.format(DEPOSIT_AMOUNT_DISPLAY_DECIMALS)
  if (Number(display) === 0) return null
  return display
}
