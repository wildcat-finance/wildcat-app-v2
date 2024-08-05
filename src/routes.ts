const BORROWER_ROOT = "/borrower"

export const ROUTES = {
  agreement: "/agreement",
  borrower: {
    root: BORROWER_ROOT,
    market: `${BORROWER_ROOT}/market`,
    newMarket: `${BORROWER_ROOT}/new-market`,
    profile: `${BORROWER_ROOT}/profile`,
  },
}
