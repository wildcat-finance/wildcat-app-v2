import { utils } from "ethers"
import { z } from "zod"

import { isLetterNumber, isLetterNumberSpace } from "@/utils/validations"

export const marketValidationSchema = z.object({
  marketName: z.string().min(1),
  mla: z.string().min(1),
  kyc: z.string().min(1),
  marketType: z.string().min(1),
  asset: z.string().refine((value) => utils.isAddress(value), {
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
  maxTotalSupply: z.coerce.string(),
  annualInterestBips: z.coerce.number(),
  delinquencyFeeBips: z.coerce.number(),
  reserveRatioBips: z.coerce.number(),
  delinquencyGracePeriod: z.coerce.number(),
  withdrawalBatchDuration: z.coerce.number(),
})

export const infoValidationSchema = z.object({
  legalName: z.string().min(1),
  jurisdiction: z.string().min(1),
  legalNature: z.string().min(1),
  address: z.string().min(1),
  email: z.string().min(1),
})

export type MarketValidationSchemaType = z.infer<typeof marketValidationSchema>

export type InfoValidationSchemaType = z.infer<typeof marketValidationSchema>
