export const BORROW_REPAY_SECTION = 1
export const STATUS_DETAILS_SECTION = 2

export interface BorrowerMarketSectionInputs {
  canInteract: boolean
  isClosed: boolean
}

export const showBorrowRepayTab = ({
  canInteract,
  isClosed,
}: BorrowerMarketSectionInputs): boolean => canInteract && !isClosed

export const borrowerMarketFallbackSection = ({
  canInteract,
  isClosed,
  checked,
}: BorrowerMarketSectionInputs & { checked: number }): number | null => {
  if (checked !== BORROW_REPAY_SECTION) return null
  if (showBorrowRepayTab({ canInteract, isClosed })) return null
  return STATUS_DETAILS_SECTION
}
