const BORROWER_ROOT = "/borrower"
const LENDER_ROOT = "/lender"

export const ROUTES = {
  agreement: "/agreement",
  borrower: {
    root: BORROWER_ROOT,
    market: `${BORROWER_ROOT}/market`,
    newMarket: `${BORROWER_ROOT}/new-market`,
    lendersList: `${BORROWER_ROOT}/edit-lenders-list`,
    notifications: `${BORROWER_ROOT}/notifications`,
    profile: `${BORROWER_ROOT}/profile`,
  },
  lender: {
    root: LENDER_ROOT,
    market: `${LENDER_ROOT}/market`,
  },
}
