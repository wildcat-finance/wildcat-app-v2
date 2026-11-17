import { z } from "zod"

import { LENDER_KYC_FIELD_MAX_LENGTH, LENDER_TYPES } from "@/config/lender-kyc"

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

const EmailFieldDTO = TextFieldDTO.refine(
  (value) => {
    const email = value.trim()
    return !email || z.string().email().safeParse(email).success
  },
  { message: "email" },
)

export const LenderKycStartInputDTO = z.object({
  address: AddressDTO,
  chainId: ChainIdDTO,
  source: z.enum(["click", "walletSwitch"]).default("click"),
})

export const LenderKycStatusQueryDTO = z.object({
  address: AddressDTO,
  chainId: z.coerce.number().int().positive(),
})

export const LenderKycNonceInputDTO = z.object({
  address: AddressDTO,
  chainId: ChainIdDTO,
})

export const LenderKycStartActionDTO = z.discriminatedUnion("action", [
  z.object({ action: z.literal("closed") }),
  z.object({ action: z.literal("discard") }),
  z.object({ action: z.literal("forward") }),
  z.object({
    action: z.literal("notSigned"),
    reason: z.enum(["declined", "walletMismatch"]),
  }),
])

export const LenderKycSignedInputDTO = z.object({
  startId: z.string().uuid(),
  address: AddressDTO,
  chainId: ChainIdDTO,
  nonce: z.string().regex(/^[0-9a-f]{32}$/),
  secret: z.string().regex(/^[0-9a-f]{64}$/),
  timeSigned: z.number().int().positive(),
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
    lenderType: z.union([z.literal(""), z.enum(LENDER_TYPES)]),
  }),
})
