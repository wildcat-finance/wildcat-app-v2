import {
  DepositAccess,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { isAddress } from "viem"
import { z } from "zod"

import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import {
  getMaxFixedTermDays,
  PERIODIC_TERM_LIMITS,
} from "@/config/market-duration"
import { WRAPPER_TRANSFERS_DISABLED_ERROR } from "@/utils/createMarketDeploy"
import {
  pickerDateToUtcMaturity,
  utcTodayAsPickerDate,
} from "@/utils/formatters"
import { isLetterNumber, isLetterNumberSpace } from "@/utils/validations"

import {
  formatDurationFromSeconds,
  PERIODIC_DURATION_UNITS,
} from "../utils/units"

const DepositAccessOptions = ["Open", "RequiresCredential"] as const

const WithdrawalAccessOptions = ["Open", "RequiresCredential"] as const

const TransferAccessOptions = [
  "Open",
  "RequiresCredential",
  "Disabled",
] as const

const MAX_CREATE_FLOW_COMMITMENT_FEE_PERCENT = 100

export const selectTransferAccessOptions: ExtendedSelectOptionItem<
  keyof typeof TransferAccess
>[] = [
  {
    label: "Open Access",
    value: "Open",
    id: "open",
  },
  {
    label: "Requires Credential",
    value: "RequiresCredential",
    id: "requiresCredential",
  },
  {
    label: "Disabled",
    value: "Disabled",
    id: "disabled",
  },
]

export const selectWithdrawalAccessOptions: ExtendedSelectOptionItem<
  keyof typeof WithdrawalAccess
>[] = [
  {
    label: "Open Access",
    value: "Open",
    id: "open",
  },
  {
    label: "Requires Credential",
    value: "RequiresCredential",
    id: "requiresCredential",
  },
]

export const selectDepositAccessOptions: ExtendedSelectOptionItem<
  keyof typeof DepositAccess
>[] = [
  {
    label: "Open Access",
    value: "Open",
    id: "open",
  },
  {
    label: "Requires Credential",
    value: "RequiresCredential",
    id: "requiresCredential",
  },
]

export const baseMarketSchemaFields = {
  implementationType: z.enum(["standard", "revolving"]),
  marketName: z.string().min(1),
  mla: z.string().optional(),
  accessControl: z.string().min(1),
  marketType: z.string().min(1),
  asset: z.string().refine((value) => isAddress(value), {
    message: "Invalid address: please ensure you have the correct token.",
  }),
  namePrefix: z
    .string()
    .min(3)
    .refine(isLetterNumberSpace.validate, isLetterNumberSpace.message),
  symbolPrefix: z
    .string()
    .min(3)
    .refine(isLetterNumber.validate, isLetterNumber.message),
  maxTotalSupply: z.coerce.number().gt(0),
  annualInterestBips: z.coerce.number().gte(0),
  delinquencyFeeBips: z.coerce.number().gte(0),
  reserveRatioBips: z.coerce.number().gte(0),
  commitmentFeePercent: z.coerce
    .number()
    .gte(0)
    .lte(MAX_CREATE_FLOW_COMMITMENT_FEE_PERCENT)
    .optional(),
  minimumDeposit: z.coerce.number().optional(),
  delinquencyGracePeriod: z.coerce.number().gt(0).lte(2160),
  withdrawalBatchDuration: z.coerce.number().gt(0).lte(2160),
  policy: z.string().min(1),
  policyName: z.string(),
  // fixedTermEndTime validation is added dynamically based on network
  fixedTermEndTime: z.coerce.number().optional(),
  firstWithdrawalWindowStart: z.coerce.number().optional(),
  periodDuration: z.coerce.number().optional(),
  withdrawalWindowDuration: z.coerce.number().optional(),
  // Display-only unit for periodic duration inputs; not sent on-chain.
  periodicDurationUnit: z.enum(PERIODIC_DURATION_UNITS).optional(),
  allowClosureBeforeTerm: z.boolean().optional(),
  allowTermReduction: z.boolean().optional(),
  disableTransfers: z.boolean(),
  transferRequiresAccess: z.boolean(),
  depositRequiresAccess: z.boolean(),
  withdrawalRequiresAccess: z.boolean(),
  deployWrapper: z.boolean().optional(),
}

const isPositiveNumber = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0

export type PeriodicTermIssuePath =
  | "firstWithdrawalWindowStart"
  | "periodDuration"
  | "withdrawalWindowDuration"

export type PeriodicTermIssue = {
  path: PeriodicTermIssuePath
  message: string
}

export type PeriodicTermValues = {
  marketType?: string
  firstWithdrawalWindowStart?: number
  periodDuration?: number
  withdrawalWindowDuration?: number
}

export const getPeriodicTermIssues = (
  data: PeriodicTermValues,
  { requireValues = false }: { requireValues?: boolean } = {},
): PeriodicTermIssue[] => {
  if (data.marketType !== "periodicTerm") return []

  const now = Math.floor(Date.now() / 1000)
  const {
    firstWithdrawalWindowStart,
    periodDuration,
    withdrawalWindowDuration,
  } = data
  const issues: PeriodicTermIssue[] = []

  if (!isPositiveNumber(firstWithdrawalWindowStart)) {
    if (requireValues) {
      issues.push({
        path: "firstWithdrawalWindowStart",
        message: "First withdrawal window start must be set",
      })
    }
  } else if (
    // The contract (`PeriodicTermHooks._validatePeriodicTerm`) does NOT require
    // the start to be in the future — it is only the recurring-schedule anchor,
    // and a past anchor is projected forward to the next window. The only timing
    // rule is that the next window lands within `MaximumInitialWithdrawalWindowDelay`.
    firstWithdrawalWindowStart >
    now + PERIODIC_TERM_LIMITS.maxInitialDelaySeconds
  ) {
    issues.push({
      path: "firstWithdrawalWindowStart",
      message: `First withdrawal window must start within ${formatDurationFromSeconds(
        PERIODIC_TERM_LIMITS.maxInitialDelaySeconds,
      )} from now`,
    })
  }

  if (!isPositiveNumber(periodDuration)) {
    if (requireValues) {
      issues.push({
        path: "periodDuration",
        message: "Withdrawal period duration must be greater than zero",
      })
    }
  } else if (periodDuration < PERIODIC_TERM_LIMITS.minPeriodSeconds) {
    issues.push({
      path: "periodDuration",
      message: `Withdrawal period must be at least ${formatDurationFromSeconds(
        PERIODIC_TERM_LIMITS.minPeriodSeconds,
      )}`,
    })
  } else if (periodDuration > PERIODIC_TERM_LIMITS.maxPeriodSeconds) {
    issues.push({
      path: "periodDuration",
      message: `Withdrawal period can not exceed ${formatDurationFromSeconds(
        PERIODIC_TERM_LIMITS.maxPeriodSeconds,
      )}`,
    })
  }

  if (!isPositiveNumber(withdrawalWindowDuration)) {
    if (requireValues) {
      issues.push({
        path: "withdrawalWindowDuration",
        message: "Withdrawal window duration must be greater than zero",
      })
    }
  } else if (withdrawalWindowDuration < PERIODIC_TERM_LIMITS.minWindowSeconds) {
    issues.push({
      path: "withdrawalWindowDuration",
      message: `Withdrawal window must be at least ${formatDurationFromSeconds(
        PERIODIC_TERM_LIMITS.minWindowSeconds,
      )}`,
    })
  } else if (
    isPositiveNumber(periodDuration) &&
    withdrawalWindowDuration >= periodDuration
  ) {
    issues.push({
      path: "withdrawalWindowDuration",
      message: "Withdrawal window must be shorter than the withdrawal period",
    })
  }

  return issues
}

export const marketRefinementCallback = (
  data: {
    implementationType: "standard" | "revolving"
    marketType: string
    fixedTermEndTime?: number
    commitmentFeePercent?: number
    firstWithdrawalWindowStart?: number
    periodDuration?: number
    withdrawalWindowDuration?: number
    disableTransfers: boolean
    transferRequiresAccess: boolean
    depositRequiresAccess: boolean
    withdrawalRequiresAccess: boolean
    deployWrapper?: boolean
  },
  ctx: z.RefinementCtx,
) => {
  if (
    data.implementationType === "revolving" &&
    data.commitmentFeePercent === undefined
  ) {
    ctx.addIssue({
      message: "Commitment fee is required for revolving markets",
      path: ["commitmentFeePercent"],
      code: "custom",
    })
  }

  if (
    data.withdrawalRequiresAccess &&
    (!data.depositRequiresAccess ||
      (!data.disableTransfers && !data.transferRequiresAccess))
  ) {
    ctx.addIssue({
      message:
        "Restricted withdrawals require restricted deposits and restricted or disabled transfers",
      path: ["withdrawalRequiresAccess"],
      code: "custom",
    })
  }

  if (data.disableTransfers && data.deployWrapper) {
    ctx.addIssue({
      message: WRAPPER_TRANSFERS_DISABLED_ERROR,
      path: ["deployWrapper"],
      code: "custom",
    })
  }

  if (data.marketType === "fixedTerm") {
    const now = Math.floor(Date.now() / 1000)
    if (data.fixedTermEndTime === undefined) {
      ctx.addIssue({
        message: "Loan maturity date must be set",
        path: ["fixedTermEndTime"],
        code: "custom",
      })
    } else if (data.fixedTermEndTime <= now) {
      ctx.addIssue({
        message: "Loan maturity date must be in the future",
        path: ["fixedTermEndTime"],
        code: "custom",
      })
    }
  }

  getPeriodicTermIssues(data, { requireValues: true }).forEach(
    ({ path, message }) => {
      ctx.addIssue({ message, path: [path], code: "custom" })
    },
  )
}

export const createBaseMarketSchemaObject = (
  isTestnet: boolean,
  maxLabel: string,
) => {
  const maxDays = getMaxFixedTermDays(isTestnet)

  return z.object({
    ...baseMarketSchemaFields,
    // overide fixedTermEndtime with network aware validation
    fixedTermEndTime: z.coerce
      .number()
      .optional()
      .refine((value) => {
        if (value !== undefined) {
          // The picker stores 00:00 UTC for the selected calendar day, so its
          // validation bounds must use that same calendar rather than local time.
          const today = utcTodayAsPickerDate()
          const tomorrow = pickerDateToUtcMaturity(today.add(1, "day"))
          const maxDate = pickerDateToUtcMaturity(today.add(maxDays, "days"))
          return value >= tomorrow && value <= maxDate
        }
        return true
      }, `Must be between tomorrow and ${maxLabel} from now`),
  })
}

export const createMarketValidationSchema = (
  isTestnet: boolean,
  maxLabel: string = "two years",
) =>
  createBaseMarketSchemaObject(isTestnet, maxLabel).superRefine(
    marketRefinementCallback,
  )

export const marketValidationSchema = createMarketValidationSchema(false)
// .refine(
//   (data) => {
//     if (data.marketType === "fixedTerm") {
//       // Check if fixedTermEndTime is in the future
//       const now = Math.floor(Date.now() / 1000) // Current time in seconds
//       return data.fixedTermEndTime && data.fixedTermEndTime > now
//     }
//     return true
//   },
//   {
//     message: "Fixed term end time must be in the future",
//     path: ["fixedTermEndTime"],
//   },
// )
// .refine(
//   (data) => {
//     if (data.marketType === "openTerm") {
//       return (
//         data.allowClosureBeforeTerm === undefined &&
//         data.allowTermReduction === undefined
//       )
//     }
//     return true
//   },
//   {
//     message:
//       "Open term markets cannot have allowClosureBeforeTerm or allowTermReduction set",
//     path: ["marketType"],
//   },
// )
/* type m = keyof typeof DepositAccess */
const infoValidationSchema = z.object({
  legalName: z.string().min(1),
  jurisdiction: z.string().min(1),
  entityKind: z.string().min(1),
  address: z.string().min(1),
  email: z.string().email(),
})
export default infoValidationSchema

export type MarketValidationSchemaType = z.infer<typeof marketValidationSchema>

export type InfoValidationSchemaType = z.infer<typeof infoValidationSchema>
