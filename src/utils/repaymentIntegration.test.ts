import {
  DepositStatus,
  HooksKind,
  LenderRole,
  Market,
  MarketAccount,
  MarketOnboardingMode,
  MarketParameterConstraints,
  MarketVersion,
  QueueWithdrawalStatus,
  SignerOrProvider,
  Token,
} from "@wildcatfi/wildcat-sdk"

import {
  getEffectiveLenderRole,
  resolveLenderAccessState,
  resolveLenderWithdrawalActionState,
} from "@/app/[locale]/lender/market/[address]/utils"

import { SDK_ERRORS_MAPPING } from "./errors"
import { formatConstrainToNumber } from "./formatters"
import { getLenderMarketAction, LenderMarketAction } from "./marketOnboarding"
import { getAprChangeError } from "./marketParameterChanges"
import { getMarketTypeChip } from "./marketType"
import {
  getPeriodicWindowTiming,
  isPeriodicWithdrawalWindowClosed,
} from "./periodicWithdrawalWindow"

const REPAYMENT_DATE = 1_800_000_000
const TEMPLATE = "0x79DA352868305d37D0179f460Ded88886D4eE524"
const PREDECESSOR = "0x9C83C59fB30816EFafDec25147f9C214Bf80688b"
const borrower = "0x1111111111111111111111111111111111111111"

// Real SDK getters and previews; no RPC is needed for observed-state decisions.
const makeAccount = () => {
  const provider = {} as SignerOrProvider
  const token = new Token(
    11155111,
    borrower,
    "Asset",
    "AST",
    6,
    false,
    provider,
  )
  const market = Object.assign(Object.create(Market.prototype), {
    chainId: 11155111,
    version: MarketVersion.V2,
    borrower,
    underlyingToken: token,
    marketToken: token,
    hooksTemplateAddress: TEMPLATE,
    repaymentDate: REPAYMENT_DATE,
    lastInterestAccruedTimestamp: REPAYMENT_DATE - 1,
    annualInterestBips: 1000,
    isClosed: false,
    hooksConfig: {
      kind: HooksKind.PeriodicTerm,
      flags: { useOnDeposit: true, useOnQueueWithdrawal: true },
      depositRequiresAccess: true,
      queueWithdrawalRequiresAccess: true,
      firstWithdrawalWindowStart: REPAYMENT_DATE + 1000,
      periodDuration: 300,
      withdrawalWindowDuration: 30,
      periodicTermClosed: false,
      periodicWithdrawalWindowOpen: false,
    },
  }) as Market
  return new MarketAccount({
    market,
    account: borrower,
    role: LenderRole.Null,
    isKnownLender: false,
    scaledMarketBalance: BigInt(10),
    marketBalance: token.getAmount(10),
    underlyingBalance: token.getAmount(10),
    underlyingApproval: BigInt(0),
  })
}

describe("SDK repayment integration", () => {
  it("allows existing lenders to withdraw outside windows without credentials at repayment", () => {
    const account = makeAccount()
    const { market } = account
    expect(isPeriodicWithdrawalWindowClosed(market, REPAYMENT_DATE)).toBe(true)
    expect(account.withdrawalAvailability).toBe(
      QueueWithdrawalStatus.WithdrawalWindowClosed,
    )
    market.lastInterestAccruedTimestamp = REPAYMENT_DATE
    expect(account.withdrawalAvailability).toBe(QueueWithdrawalStatus.Ready)
    expect(isPeriodicWithdrawalWindowClosed(market, REPAYMENT_DATE)).toBe(false)
    expect(getPeriodicWindowTiming(market, REPAYMENT_DATE)).toMatchObject({
      isOpen: true,
      isTermClosed: true,
      currentWindowEnd: undefined,
    })
    expect(getMarketTypeChip(market).periodicWindow?.isTermClosed).toBe(true)
    const accessState = resolveLenderAccessState({
      authoritativeStatus: "resolved",
      role: getEffectiveLenderRole(account),
    })
    expect(
      resolveLenderWithdrawalActionState({
        accessState,
        hasMarketAccount: true,
        hasMarketBalance: true,
        withdrawalAvailability: account.withdrawalAvailability,
        periodicWindowClosed: isPeriodicWithdrawalWindowClosed(
          market,
          REPAYMENT_DATE,
        ),
      }),
    ).toBe("ready")
  })

  it("does not send managed lenders to request access once deposits have stopped", () => {
    const account = makeAccount()
    account.market.lastInterestAccruedTimestamp = REPAYMENT_DATE
    expect(account.depositAvailability).toBe(DepositStatus.MarketInRepayment)
    expect(
      getLenderMarketAction(
        MarketOnboardingMode.Managed,
        account.depositAvailability,
      ),
    ).toBe(LenderMarketAction.Unavailable)
    expect(
      SDK_ERRORS_MAPPING.deposit[DepositStatus.MarketInRepayment],
    ).toContain("repayment date")
  })

  it("uses observed state and template identity for proposals, while core APR changes freeze for both generations", () => {
    const account = makeAccount()
    const { market } = account
    jest.spyOn(Date, "now").mockReturnValue((REPAYMENT_DATE + 500) * 1000)
    try {
      expect(getAprChangeError(market)).toBeUndefined()
      expect(getAprChangeError(market, true)).toBeUndefined()
      market.lastInterestAccruedTimestamp = REPAYMENT_DATE
      expect(getAprChangeError(market)).toContain("repayment date")
      expect(getAprChangeError(market, true)).toContain("repayment date")
      market.hooksTemplateAddress = PREDECESSOR
      expect(getAprChangeError(market)).toContain("repayment date")
      expect(getAprChangeError(market, true)).toBeUndefined()
      market.isClosed = true
      expect(getAprChangeError(market, true)).toBe("Market is closed")
    } finally {
      jest.restoreAllMocks()
    }
  })

  it.each([undefined, 0])(
    "preserves unscheduled/legacy behavior for repaymentDate=%s",
    (date) => {
      const account = makeAccount()
      account.market.repaymentDate = date
      expect(getAprChangeError(account.market, true)).toBeUndefined()
      expect(
        isPeriodicWithdrawalWindowClosed(account.market, REPAYMENT_DATE),
      ).toBe(true)
    },
  )

  it("preserves absent repayment constraints and treats present bounds as durations", () => {
    const constraints = {
      maximumReserveRatioBips: 10_000,
      maximumWithdrawalBatchDuration: 7_200,
      maximumRepaymentDateDelay: 0,
    } as MarketParameterConstraints
    expect(
      formatConstrainToNumber(constraints, "maximumReserveRatioBips"),
    ).toBe(100)
    expect(
      formatConstrainToNumber(constraints, "maximumWithdrawalBatchDuration"),
    ).toBe(2)
    expect(
      formatConstrainToNumber(constraints, "maximumRepaymentPeriod"),
    ).toBeUndefined()
    expect(
      formatConstrainToNumber(constraints, "maximumRepaymentDateDelay"),
    ).toBe(0)
    constraints.maximumRepaymentPeriod = 86_400
    expect(formatConstrainToNumber(constraints, "maximumRepaymentPeriod")).toBe(
      24,
    )
  })
})
