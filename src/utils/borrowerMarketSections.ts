/// Landing and visibility policy for the borrower market-detail sections
/// (product#442, product#443). Section numbers follow the page's `checked`
/// value: 1 is Borrow and Repay, 2 is Status and Details.
///
/// The rule: Borrow and Repay exists for a borrower on the right chain
/// while the market is open. A terminated market has nothing to borrow or
/// repay, so the tab disappears and the landing screen becomes Status and
/// Details. Viewers who cannot interact at all fall back the same way, as
/// the page always did. Active markets keep Borrow and Repay as the
/// landing screen; the recorded designer concern on #443 rules out a
/// wider default change.

export const BORROW_REPAY_SECTION = 1
export const STATUS_DETAILS_SECTION = 2

export interface BorrowerMarketSectionInputs {
  canInteract: boolean
  isClosed: boolean
}

export function showBorrowRepayTab({
  canInteract,
  isClosed,
}: BorrowerMarketSectionInputs): boolean {
  return canInteract && !isClosed
}

/// Returns the section to switch to, or null when the current selection
/// stands. Only ever moves off Borrow and Repay; every other section is a
/// deliberate user choice and stays put.
export function borrowerMarketFallbackSection({
  canInteract,
  isClosed,
  checked,
}: BorrowerMarketSectionInputs & { checked: number }): number | null {
  if (checked !== BORROW_REPAY_SECTION) return null
  if (showBorrowRepayTab({ canInteract, isClosed })) return null
  return STATUS_DETAILS_SECTION
}
