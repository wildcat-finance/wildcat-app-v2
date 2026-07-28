import {
  getDepositAgreementGateState,
  requiresExplicitMlaSelection,
} from "./depositAgreementGate"

const base = {
  generation: "v2.5",
  mla: null,
  mlaLoading: false,
  mlaError: false,
  signedMla: undefined,
  signedMlaLoading: false,
  signedMlaError: false,
  acknowledgement: undefined,
  acknowledgementLoading: false,
  acknowledgementError: false,
}

describe("requiresExplicitMlaSelection", () => {
  it.each([
    ["v1", false],
    ["v2", false],
    ["v2.1", false],
    ["v2.5", true],
    ["v2.6", true],
    ["v3", true],
    ["preview", false],
    [undefined, false],
  ])("classifies %s", (generation, expected) => {
    expect(requiresExplicitMlaSelection(generation)).toBe(expected)
  })
})

describe("getDepositAgreementGateState", () => {
  it("grandfathers a historical market with no stored MLA selection", () => {
    expect(
      getDepositAgreementGateState({
        ...base,
        generation: "v2.1",
      }),
    ).toBe("satisfied")
  })

  it("fails closed for a V2.5 market with no borrower MLA selection", () => {
    expect(getDepositAgreementGateState(base)).toBe(
      "requires-borrower-mla-selection",
    )
  })

  it("requires the lender signature for a configured MLA", () => {
    expect(
      getDepositAgreementGateState({
        ...base,
        mla: { chainId: 1, market: "0xmarket" },
        signedMla: null,
      }),
    ).toBe("requires-mla-signature")
  })

  it("requires acknowledgement when the borrower declined an MLA", () => {
    expect(
      getDepositAgreementGateState({
        ...base,
        mla: { noMLA: true },
        acknowledgement: null,
      }),
    ).toBe("requires-non-mla-acknowledgement")
  })

  it("is satisfied after the applicable lender legal step", () => {
    expect(
      getDepositAgreementGateState({
        ...base,
        mla: { chainId: 1, market: "0xmarket" },
        signedMla: { signature: "0xsigned" },
      }),
    ).toBe("satisfied")
    expect(
      getDepositAgreementGateState({
        ...base,
        mla: { noMLA: true },
        acknowledgement: { signature: "0xacknowledged" },
      }),
    ).toBe("satisfied")
  })

  it("keeps loading and error states fail closed", () => {
    expect(
      getDepositAgreementGateState({
        ...base,
        mla: undefined,
        mlaLoading: true,
      }),
    ).toBe("loading")
    expect(
      getDepositAgreementGateState({
        ...base,
        mlaError: true,
      }),
    ).toBe("error")
  })
})
