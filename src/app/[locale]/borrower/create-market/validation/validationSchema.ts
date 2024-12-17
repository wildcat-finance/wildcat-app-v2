import {
  DepositAccess,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { isAddress } from "viem"
import { z } from "zod"

import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
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

export const marketValidationSchema = z
  .object({
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
    annualInterestBips: z.coerce.number().gt(0),
    delinquencyFeeBips: z.coerce.number().gt(0),
    reserveRatioBips: z.coerce.number().gte(0),
    minimumDeposit: z.coerce.number().optional(),
    delinquencyGracePeriod: z.coerce.number().gt(0),
    withdrawalBatchDuration: z.coerce.number().gt(0),
    policy: z.string().min(1),
    policyName: z.string(),
    fixedTermEndTime: z.coerce.number().optional(),
    allowForceBuyBack: z.boolean(),
    allowClosureBeforeTerm: z.boolean().optional(),
    allowTermReduction: z.boolean().optional(),
    disableTransfers: z.boolean(),
    transferRequiresAccess: z.boolean(),
    depositRequiresAccess: z.boolean(),
    withdrawalRequiresAccess: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.marketType === "fixedTerm") {
      const now = Math.floor(Date.now() / 1000) // Current time in seconds
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
  })
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
  legalNature: z.string().min(1),
  address: z.string().min(1),
  email: z.string().email(),
})
export default infoValidationSchema

export type MarketValidationSchemaType = z.infer<typeof marketValidationSchema>

export type InfoValidationSchemaType = z.infer<typeof infoValidationSchema>
