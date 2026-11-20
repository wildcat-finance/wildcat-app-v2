import { z } from "zod"

import { LENDER_KYC_FIELD_MAX_LENGTH } from "@/config/lender-kyc"
import {
  hasLenderKycForbiddenCharacters,
  LenderKycDetails,
} from "@/utils/lenderKycMessage"

export type LenderKycFieldError = "email" | "tooLong" | "invalidCharacters"

export type LenderKycFieldErrors = Partial<
  Record<"fullName" | "email" | "companyName", LenderKycFieldError>
>

const emailSchema = z.string().email()

const validateText = (value: string): LenderKycFieldError | undefined => {
  if (hasLenderKycForbiddenCharacters(value)) return "invalidCharacters"
  if (value.trim().length > LENDER_KYC_FIELD_MAX_LENGTH) return "tooLong"
  return undefined
}

export const validateLenderKycDetails = (
  details: LenderKycDetails,
): LenderKycFieldErrors => {
  const errors: LenderKycFieldErrors = {}
  const email = details.email.trim()

  const fullNameError = validateText(details.fullName)
  if (fullNameError) errors.fullName = fullNameError
  const companyNameError = validateText(details.companyName)
  if (companyNameError) errors.companyName = companyNameError
  const emailError = validateText(details.email)
  if (emailError) errors.email = emailError
  else if (email && !emailSchema.safeParse(email).success)
    errors.email = "email"

  return errors
}

export const EMPTY_LENDER_KYC_DETAILS: LenderKycDetails = {
  fullName: "",
  email: "",
  companyName: "",
  lenderTypes: [],
}
