import { getCreateMarketFormFingerprint } from "./deployFingerprint"
import { MarketValidationSchemaType } from "./validationSchema"

/**
 * The values the create-market form holds after the policy step of the reported
 * repro: a new policy with lender self-onboarding, no MLA.
 */
const signedValues = {
  accessControl: "defaultPullProvider",
  policy: "createNewPolicy",
  policyName: "Test Policy",
  marketType: "standard",
  mla: "noMLA",
  namePrefix: "Demo ",
  symbolPrefix: "DEMO",
  asset: "0xb2FD149C8E462E851c7B88038e79579442Fb5c4d",
  maxTotalSupply: 10_000_000,
  annualInterestBips: 10,
  delinquencyFeeBips: 10,
  reserveRatioBips: 10,
  delinquencyGracePeriod: 24,
  withdrawalBatchDuration: 6,
  minimumDeposit: undefined,
  fixedTermEndTime: undefined,
  depositRequiresAccess: true,
  withdrawalRequiresAccess: false,
  transferRequiresAccess: false,
  disableTransfers: false,
  deployWrapper: false,
} as unknown as MarketValidationSchemaType

const fingerprintOf = (over: Partial<MarketValidationSchemaType>) =>
  getCreateMarketFormFingerprint({ ...signedValues, ...over })

describe("getCreateMarketFormFingerprint", () => {
  const signed = getCreateMarketFormFingerprint(signedValues)

  it("changes when only the access control changes", () => {
    // The reported repro: sign the MLA refusal on self-onboarding, then switch
    // to a borrower operated allowlist. The signed agreement text carries no
    // policy information, so this comparison is the only thing that can notice.
    expect(fingerprintOf({ accessControl: "manualApproval" })).not.toBe(signed)
  })

  it("returns to the signed value when the change is reverted", () => {
    expect(fingerprintOf({ accessControl: "defaultPullProvider" })).toBe(signed)
  })

  it("changes for the other settings the agreement text never covered", () => {
    expect(fingerprintOf({ deployWrapper: true })).not.toBe(signed)
    expect(fingerprintOf({ policyName: "Other Policy" })).not.toBe(signed)
    expect(
      fingerprintOf({
        policy: "0x4b320698991271bb89b2afa1662c12412d7acda6",
      }),
    ).not.toBe(signed)
  })

  it("changes for settings the agreement text does cover", () => {
    expect(fingerprintOf({ annualInterestBips: 12 })).not.toBe(signed)
    expect(fingerprintOf({ maxTotalSupply: 20_000_000 })).not.toBe(signed)
    expect(fingerprintOf({ namePrefix: "Other " })).not.toBe(signed)
  })

  it("is stable across key order", () => {
    const reordered = Object.fromEntries(
      Object.entries(signedValues).reverse(),
    ) as MarketValidationSchemaType
    expect(getCreateMarketFormFingerprint(reordered)).toBe(signed)
  })

  it("treats undefined and null as the same absent value", () => {
    expect(
      fingerprintOf({
        minimumDeposit: null as unknown as undefined,
      }),
    ).toBe(signed)
  })
})
