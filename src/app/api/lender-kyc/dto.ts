import { z } from "zod"

import { LENDER_KYC_FIELD_MAX_LENGTH, LENDER_TYPES } from "@/config/lender-kyc"
import { hasLenderKycForbiddenCharacters } from "@/utils/lenderKycMessage"

const MAX_DATE_MS = 8_640_000_000_000_000

const AddressDTO = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value.toLowerCase())

const ChainIdDTO = z.number().int().positive()

const TextFieldDTO = z
  .string()
  .max(LENDER_KYC_FIELD_MAX_LENGTH * 4)
  .refine((value) => value.trim().length <= LENDER_KYC_FIELD_MAX_LENGTH, {
    message: "tooLong",
  })
  .refine((value) => !hasLenderKycForbiddenCharacters(value), {
    message: "invalidCharacters",
  })

const EmailFieldDTO = TextFieldDTO.refine(
  (value) => {
    const email = value.trim()
    return !email || z.string().email().safeParse(email).success
  },
  { message: "email" },
)

export const LenderKycStatusQueryDTO = z.object({
  address: AddressDTO,
  chainId: z.coerce.number().int().positive(),
})

export const LenderKycNonceInputDTO = z.object({
  address: AddressDTO,
  chainId: ChainIdDTO,
})

export const LenderKycSignedInputDTO = z.object({
  address: AddressDTO,
  chainId: ChainIdDTO,
  nonce: z.string().regex(/^[0-9a-f]{32}$/),
  secret: z.string().regex(/^[0-9a-f]{64}$/),
  timeSigned: z.number().int().positive().max(MAX_DATE_MS),
  signature: z
    .string()
    .regex(/^0x([0-9a-fA-F]{2})*$/)
    .max(8192),
})

export const LenderKycDetailsInputDTO = LenderKycSignedInputDTO.extend({
  details: z.object({
    fullName: TextFieldDTO,
    email: EmailFieldDTO,
    companyName: TextFieldDTO,
    lenderTypes: z.array(z.enum(LENDER_TYPES)).max(LENDER_TYPES.length),
  }),
})
