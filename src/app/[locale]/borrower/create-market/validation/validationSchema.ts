import {
  DepositAccess,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import { isAddress } from "viem"
import { z } from "zod"

import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import {
  getMaxFixedTermDays,
  PERIODIC_TERM_LIMITS,
} from "@/config/market-duration"
import { dayjs } from "@/utils/dayjs"
import { isLetterNumber, isLetterNumberSpace } from "@/utils/validations"

const DepositAccessOptions = ["Open", "RequiresCredential"] as const

const WithdrawalAccessOptions = ["Open", "RequiresCredential"] as const

const TransferAccessOptions = [
  "Open",
  "RequiresCredential",
  "Disabled",
] as const

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
  periodicDurationUnit: z.enum(["Days", "Hours"]).optional(),
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

export const marketRefinementCallback = (
  data: {
    marketType: string
    fixedTermEndTime?: number
    firstWithdrawalWindowStart?: number
    periodDuration?: number
    withdrawalWindowDuration?: number
  },
  ctx: z.RefinementCtx,
) => {
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

  if (data.marketType === "periodicTerm") {
    const now = Math.floor(Date.now() / 1000)
    const {
      firstWithdrawalWindowStart,
      periodDuration,
      withdrawalWindowDuration,
    } = data

    const humanize = (seconds: number) =>
      humanizeDuration(seconds * 1000, { round: true, largest: 2 })

    if (!isPositiveNumber(firstWithdrawalWindowStart)) {
      ctx.addIssue({
        message: "First withdrawal window start must be set",
        path: ["firstWithdrawalWindowStart"],
        code: "custom",
      })
    } else if (
      // The contract (`PeriodicTermHooks._validatePeriodicTerm`) does NOT require
      // the start to be in the future — it is only the recurring-schedule anchor,
      // and a past anchor is projected forward to the next window. The only timing
      // rule is that the next window lands within `MaximumInitialWithdrawalWindowDelay`.
      // For a future anchor the next window IS the anchor, so this check matches the
      // contract; for a past anchor it is always satisfied.
      firstWithdrawalWindowStart >
      now + PERIODIC_TERM_LIMITS.maxInitialDelaySeconds
    ) {
      ctx.addIssue({
        message: `First withdrawal window must start within ${humanize(
          PERIODIC_TERM_LIMITS.maxInitialDelaySeconds,
        )} from now`,
        path: ["firstWithdrawalWindowStart"],
        code: "custom",
      })
    }

    if (!isPositiveNumber(periodDuration)) {
      ctx.addIssue({
        message: "Withdrawal period duration must be greater than zero",
        path: ["periodDuration"],
        code: "custom",
      })
    } else if (periodDuration < PERIODIC_TERM_LIMITS.minPeriodSeconds) {
      ctx.addIssue({
        message: `Withdrawal period must be at least ${humanize(
          PERIODIC_TERM_LIMITS.minPeriodSeconds,
        )}`,
        path: ["periodDuration"],
        code: "custom",
      })
    } else if (periodDuration > PERIODIC_TERM_LIMITS.maxPeriodSeconds) {
      ctx.addIssue({
        message: `Withdrawal period can not exceed ${humanize(
          PERIODIC_TERM_LIMITS.maxPeriodSeconds,
        )}`,
        path: ["periodDuration"],
        code: "custom",
      })
    }

    if (!isPositiveNumber(withdrawalWindowDuration)) {
      ctx.addIssue({
        message: "Withdrawal window duration must be greater than zero",
        path: ["withdrawalWindowDuration"],
        code: "custom",
      })
    } else if (
      withdrawalWindowDuration < PERIODIC_TERM_LIMITS.minWindowSeconds
    ) {
      ctx.addIssue({
        message: `Withdrawal window must be at least ${humanize(
          PERIODIC_TERM_LIMITS.minWindowSeconds,
        )}`,
        path: ["withdrawalWindowDuration"],
        code: "custom",
      })
    } else if (
      isPositiveNumber(periodDuration) &&
      withdrawalWindowDuration >= periodDuration
    ) {
      ctx.addIssue({
        message: "Withdrawal window must be shorter than the withdrawal period",
        path: ["withdrawalWindowDuration"],
        code: "custom",
      })
    }
  }
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
          const today = dayjs.unix(Date.now() / 1_000).startOf("day")
          const tomorrow = today.add(1, "day")
          const maxDate = today.add(maxDays, "days")
          return value >= tomorrow.unix() && value <= maxDate.unix()
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
