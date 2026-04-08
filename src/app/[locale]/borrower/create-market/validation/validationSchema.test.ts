import { createMarketValidationSchema } from "./validationSchema"

const schema = createMarketValidationSchema(false)

const baseData = {
  implementationType: "legacy" as const,
  marketName: "Test Market",
  mla: "noMLA",
  accessControl: "manualApproval",
  marketType: "standard",
  asset: "0x0000000000000000000000000000000000000001",
  namePrefix: "WLD",
  symbolPrefix: "WLD",
  maxTotalSupply: 1_000_000,
  annualInterestBips: 500,
  delinquencyFeeBips: 100,
  reserveRatioBips: 1_000,
  minimumDeposit: 1,
  delinquencyGracePeriod: 24,
  withdrawalBatchDuration: 24,
  policy: "createNewPolicy",
  policyName: "Test Policy",
  fixedTermEndTime: undefined,
  allowForceBuyBack: false,
  allowClosureBeforeTerm: false,
  allowTermReduction: false,
  disableTransfers: false,
  transferRequiresAccess: false,
  depositRequiresAccess: true,
  withdrawalRequiresAccess: false,
  deployWrapper: false,
}

describe("create market validation schema", () => {
  it("accepts legacy markets without commitment fee", () => {
    const result = schema.safeParse(baseData)

    expect(result.success).toBe(true)
  })

  it("requires commitment fee for revolving markets", () => {
    const result = schema.safeParse({
      ...baseData,
      implementationType: "revolving" as const,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["commitmentFeeBips"])
    expect(result.error?.issues[0]?.message).toBe(
      "Commitment fee is required for revolving markets",
    )
  })

  it("enforces the SDK commitment fee bound", () => {
    const result = schema.safeParse({
      ...baseData,
      implementationType: "revolving" as const,
      commitmentFeeBips: 10_001,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["commitmentFeeBips"])
  })
})
