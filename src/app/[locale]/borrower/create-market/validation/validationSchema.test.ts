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
    expect(result.error?.issues[0]?.path).toEqual(["commitmentFeePercent"])
    expect(result.error?.issues[0]?.message).toBe(
      "Commitment fee is required for revolving markets",
    )
  })

  it("enforces the SDK commitment fee bound", () => {
    const result = schema.safeParse({
      ...baseData,
      implementationType: "revolving" as const,
      commitmentFeePercent: 100.01,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["commitmentFeePercent"])
  })

  it("rejects restricted withdrawals when transfers remain open", () => {
    const result = schema.safeParse({
      ...baseData,
      withdrawalRequiresAccess: true,
      transferRequiresAccess: false,
      disableTransfers: false,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ["withdrawalRequiresAccess"],
        message:
          "Restricted withdrawals require restricted deposits and restricted or disabled transfers",
      }),
    )
  })

  it("rejects restricted withdrawals when deposits remain open", () => {
    const result = schema.safeParse({
      ...baseData,
      withdrawalRequiresAccess: true,
      depositRequiresAccess: false,
      transferRequiresAccess: true,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ["withdrawalRequiresAccess"],
        message:
          "Restricted withdrawals require restricted deposits and restricted or disabled transfers",
      }),
    )
  })

  it.each([
    { transferRequiresAccess: true, disableTransfers: false },
    { transferRequiresAccess: false, disableTransfers: true },
  ])(
    "accepts restricted withdrawals with closed transfer escape paths",
    ({ transferRequiresAccess, disableTransfers }) => {
      const result = schema.safeParse({
        ...baseData,
        withdrawalRequiresAccess: true,
        transferRequiresAccess,
        disableTransfers,
      })

      expect(result.success).toBe(true)
    },
  )

  it("rejects wrapper deployment when market transfers are disabled", () => {
    const result = schema.safeParse({
      ...baseData,
      disableTransfers: true,
      deployWrapper: true,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ["deployWrapper"],
        message:
          "A wrapper cannot be deployed when market transfers are disabled",
      }),
    )
  })
})
