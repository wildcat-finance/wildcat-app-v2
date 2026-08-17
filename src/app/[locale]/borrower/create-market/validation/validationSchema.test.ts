import {
  createMarketValidationSchema,
  getPeriodicTermIssues,
} from "./validationSchema"

const schema = createMarketValidationSchema(false)

const baseData = {
  implementationType: "standard" as const,
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
  it("accepts standard markets without commitment fee", () => {
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

describe("periodic term validation", () => {
  const now = 1_700_000_000
  const validPeriodicTerms = {
    marketType: "periodicTerm",
    firstWithdrawalWindowStart: now,
    periodDuration: 360,
    withdrawalWindowDuration: 60,
  }

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(now * 1_000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("accepts the exact protocol minimums", () => {
    expect(getPeriodicTermIssues(validPeriodicTerms)).toEqual([])
  })

  it("rejects a withdrawal period below six minutes", () => {
    expect(
      getPeriodicTermIssues({
        ...validPeriodicTerms,
        periodDuration: 359,
      }),
    ).toContainEqual({
      path: "periodDuration",
      message: "Withdrawal period must be at least 6 minutes",
    })
  })

  it("rejects a withdrawal window below one minute", () => {
    expect(
      getPeriodicTermIssues({
        ...validPeriodicTerms,
        withdrawalWindowDuration: 59,
      }),
    ).toContainEqual({
      path: "withdrawalWindowDuration",
      message: "Withdrawal window must be at least 1 minute",
    })
  })

  it("accepts the exact maximum period and initial delay", () => {
    expect(
      getPeriodicTermIssues({
        ...validPeriodicTerms,
        firstWithdrawalWindowStart: now + 31_536_000,
        periodDuration: 31_536_000,
      }),
    ).toEqual([])
  })

  it("rejects values above the maximum period and initial delay", () => {
    expect(
      getPeriodicTermIssues({
        ...validPeriodicTerms,
        firstWithdrawalWindowStart: now + 31_536_001,
        periodDuration: 31_536_001,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "firstWithdrawalWindowStart" }),
        expect.objectContaining({ path: "periodDuration" }),
      ]),
    )
  })

  it.each([360, 361])(
    "rejects a withdrawal window of %i seconds against a 360-second period",
    (withdrawalWindowDuration) => {
      expect(
        getPeriodicTermIssues({
          ...validPeriodicTerms,
          withdrawalWindowDuration,
        }),
      ).toContainEqual({
        path: "withdrawalWindowDuration",
        message: "Withdrawal window must be shorter than the withdrawal period",
      })
    },
  )

  it("compares values after display units have been normalized to seconds", () => {
    const oneDay = 24 * 60 * 60
    const twentyFiveHours = 25 * 60 * 60

    expect(
      getPeriodicTermIssues({
        ...validPeriodicTerms,
        periodDuration: oneDay,
        withdrawalWindowDuration: twentyFiveHours,
      }),
    ).toContainEqual(
      expect.objectContaining({ path: "withdrawalWindowDuration" }),
    )
  })

  it("allows a past timestamp to anchor the recurring schedule", () => {
    expect(
      getPeriodicTermIssues({
        ...validPeriodicTerms,
        firstWithdrawalWindowStart: now - 31_536_000,
      }),
    ).toEqual([])
  })

  it("requires all schedule values during full-form validation", () => {
    expect(
      getPeriodicTermIssues(
        { marketType: "periodicTerm" },
        { requireValues: true },
      ).map(({ path }) => path),
    ).toEqual([
      "firstWithdrawalWindowStart",
      "periodDuration",
      "withdrawalWindowDuration",
    ])
  })

  it("does not apply periodic constraints to another market type", () => {
    expect(
      getPeriodicTermIssues({
        marketType: "openTerm",
        periodDuration: 1,
        withdrawalWindowDuration: 1,
      }),
    ).toEqual([])
  })
})
