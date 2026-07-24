const BORROWER_ROOT = "/borrower"
const LENDER_ROOT = "/lender"

export const ROUTES = {
  // Legacy lender onboarding URL. New navigation should use the explicit
  // lender/borrower agreement routes below.
  agreement: "/agreement",
  borrower: {
    root: BORROWER_ROOT,
    agreement: `${BORROWER_ROOT}/agreement`,
    market: `${BORROWER_ROOT}/market`,
    newMarket: `${BORROWER_ROOT}/new-market`,
    createMarket: `${BORROWER_ROOT}/create-market`,
    lendersList: `${BORROWER_ROOT}/edit-lenders-list`,
    profile: `${BORROWER_ROOT}/profile`,
    editProfile: `${BORROWER_ROOT}/profile/edit`,
    notifications: `${BORROWER_ROOT}/notifications`,
    editPolicy: `${BORROWER_ROOT}/edit-policy`,
    policy: `${BORROWER_ROOT}/policy`,
    createPolicy: `${BORROWER_ROOT}/create-policy`,
    invitation: `${BORROWER_ROOT}/invitation`,
  },
  lender: {
    root: LENDER_ROOT,
    agreement: `${LENDER_ROOT}/agreement`,
    market: `${LENDER_ROOT}/market`,
    profile: `${LENDER_ROOT}/profile`,
  },
}
