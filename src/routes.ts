const BORROWER_ROOT = "/borrower"
const LENDER_ROOT = "/lender"

export const ROUTES = {
  agreement: "/agreement",
  borrower: {
    root: BORROWER_ROOT,
    market: `${BORROWER_ROOT}/market`,
    newMarket: `${BORROWER_ROOT}/new-market`,
    lendersList: `${BORROWER_ROOT}/edit-lenders-list`,
    profile: `${BORROWER_ROOT}/profile`,
    editProfile: `${BORROWER_ROOT}/profile/edit`,
    notifications: `${BORROWER_ROOT}/notifications`,
    editPolicy: `${BORROWER_ROOT}/edit-policy`,
  },
  lender: {
    root: LENDER_ROOT,
    market: `${LENDER_ROOT}/market`,
    profile: `${LENDER_ROOT}/profile`,
  },
}
