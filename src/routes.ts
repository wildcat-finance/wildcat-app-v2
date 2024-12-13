const BORROWER_ROOT = "/borrower"
const LENDER_ROOT = "/lender"

export const ROUTES = {
  agreement: "/agreement",
  borrower: {
    root: BORROWER_ROOT,
    market: `${BORROWER_ROOT}/market`,
    newMarket: `${BORROWER_ROOT}/new-market`,
    createMarket: `${BORROWER_ROOT}/create-market`,
    lendersList: `${BORROWER_ROOT}/edit-lenders-list`,
    profile: `${BORROWER_ROOT}/profile`,
    editProfile: `${BORROWER_ROOT}/profile/edit`,
    notifications: `${BORROWER_ROOT}/notifications`,
    editPolicy: `${BORROWER_ROOT}/edit-policy`,
    invitation: `${BORROWER_ROOT}/invitation`,
  },
  lender: {
    root: LENDER_ROOT,
    market: `${LENDER_ROOT}/market`,
    profile: `${LENDER_ROOT}/profile`,
  },
}
