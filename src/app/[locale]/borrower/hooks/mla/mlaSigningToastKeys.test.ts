import { getMlaSigningToastKeys } from "./mlaSigningToastKeys"

describe("create-market MLA signing copy", () => {
  it("uses refusal copy when no MLA template is selected", () => {
    expect(getMlaSigningToastKeys(undefined)).toEqual({
      pending: "borrower.createMarket.mla.signing.refusal.pending",
      success: "borrower.createMarket.mla.signing.refusal.success",
      error: "borrower.createMarket.mla.signing.refusal.error",
    })
  })

  it("uses agreement copy when an MLA template is selected", () => {
    expect(getMlaSigningToastKeys(1)).toEqual({
      pending: "borrower.createMarket.mla.signing.agreement.pending",
      success: "borrower.createMarket.mla.signing.agreement.success",
      error: "borrower.createMarket.mla.signing.agreement.error",
    })
  })
})
