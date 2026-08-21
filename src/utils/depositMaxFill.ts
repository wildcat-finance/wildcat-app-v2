/// Fill rules for the deposit modal's Max control (product#608).
///
/// The fillable maximum is the SDK's `marketAccount.maximumDeposit`,
/// already min(wallet balance of the underlying, remaining market
/// capacity). The display string comes from the SDK's truncating format
/// (never rounds up, never contains commas the parser would choke on),
/// and the exact TokenAmount rides alongside so the transaction deposits
/// the true value rather than a five-decimal truncation. The exact value
/// is honoured only while the input still equals the string the fill
/// wrote; any manual edit falls back to parsing what the user typed.

/// Structural slice of TokenAmount so the pure rules test without the SDK.
export interface TokenAmountLike {
  format: (decimals: number) => string
  raw: { isZero: () => boolean }
}

export const DEPOSIT_AMOUNT_DISPLAY_DECIMALS = 5

/// The string the Max control writes into the input, or null when there
/// is nothing to fill (zero max hides the control).
export function fillMaxDepositInput<T extends TokenAmountLike>(
  maximumDeposit: T,
): string | null {
  if (maximumDeposit.raw.isZero()) return null
  return maximumDeposit.format(DEPOSIT_AMOUNT_DISPLAY_DECIMALS)
}

/// Picks the amount the transaction should use: the exact fill while the
/// input is untouched, the parsed input otherwise.
export function effectiveDepositAmount<T extends TokenAmountLike>({
  exact,
  parsed,
  input,
}: {
  exact: T | undefined
  parsed: T
  input: string
}): T {
  if (exact && input === exact.format(DEPOSIT_AMOUNT_DISPLAY_DECIMALS)) {
    return exact
  }
  return parsed
}
