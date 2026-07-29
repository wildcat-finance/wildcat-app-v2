import { getServiceAgreementPartyForPath } from "./serviceAgreementParty"

describe("getServiceAgreementPartyForPath", () => {
  it.each([
    ["/borrower", "Borrower"],
    ["/borrower/profile", "Borrower"],
    ["/borrower/market/0x1234", "Borrower"],
    ["/borrower/agreement", "Borrower"],
    ["/lender", "Lender"],
    ["/lender/market/0x1234", "Lender"],
    ["/lender/agreement", "Lender"],
    ["/profile/borrower/0x1234", "Lender"],
    ["/", "Lender"],
    [null, "Lender"],
    [undefined, "Lender"],
  ])("maps %s to %s capacity", (pathname, expected) => {
    expect(getServiceAgreementPartyForPath(pathname)).toBe(expected)
  })
})
