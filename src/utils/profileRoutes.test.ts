import { isBorrowerAppPath, isBorrowerContextPath } from "./profileRoutes"

describe("profile route context", () => {
  it.each([
    ["/borrower", true],
    ["/borrower/profile", true],
    ["/borrower/profile/0x1234", true],
    ["/borrower/agreement", true],
    ["/lender", false],
    ["/lender/profile", false],
    ["/profile/borrower/0x1234", false],
    ["/agreement", false],
    ["/borrowers", false],
    ["/", false],
  ])("classifies %s as borrower context: %s", (pathname, expected) => {
    expect(isBorrowerAppPath(pathname)).toBe(expected)
    expect(isBorrowerContextPath(pathname)).toBe(expected)
  })
})
