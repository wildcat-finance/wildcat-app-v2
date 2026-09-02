import {
  BORROW_REPAY_SECTION,
  borrowerMarketFallbackSection,
  showBorrowRepayTab,
  STATUS_DETAILS_SECTION,
} from "./borrowerMarketSections"

describe("showBorrowRepayTab", () => {
  it("shows the section for the borrower of an open market", () => {
    expect(showBorrowRepayTab({ canInteract: true, isClosed: false })).toBe(
      true,
    )
  })

  it("hides the section once the market is terminated", () => {
    expect(showBorrowRepayTab({ canInteract: true, isClosed: true })).toBe(
      false,
    )
  })

  it("hides the section from viewers who cannot interact", () => {
    expect(showBorrowRepayTab({ canInteract: false, isClosed: false })).toBe(
      false,
    )
    expect(showBorrowRepayTab({ canInteract: false, isClosed: true })).toBe(
      false,
    )
  })
})

describe("borrowerMarketFallbackSection", () => {
  it("keeps an open market on Borrow and Repay", () => {
    expect(
      borrowerMarketFallbackSection({
        canInteract: true,
        isClosed: false,
        checked: BORROW_REPAY_SECTION,
      }),
    ).toBeNull()
  })

  it("moves a terminated market to Status and Details", () => {
    expect(
      borrowerMarketFallbackSection({
        canInteract: true,
        isClosed: true,
        checked: BORROW_REPAY_SECTION,
      }),
    ).toBe(STATUS_DETAILS_SECTION)
  })

  it("keeps the existing fallback for viewers who cannot interact", () => {
    expect(
      borrowerMarketFallbackSection({
        canInteract: false,
        isClosed: false,
        checked: BORROW_REPAY_SECTION,
      }),
    ).toBe(STATUS_DETAILS_SECTION)
  })

  it("does not replace another selected section", () => {
    const sections = [2, 3, 4, 5, 6, 7, 8]
    sections.forEach((checked) => {
      expect(
        borrowerMarketFallbackSection({
          canInteract: true,
          isClosed: true,
          checked,
        }),
      ).toBeNull()
      expect(
        borrowerMarketFallbackSection({
          canInteract: false,
          isClosed: false,
          checked,
        }),
      ).toBeNull()
    })
  })
})
