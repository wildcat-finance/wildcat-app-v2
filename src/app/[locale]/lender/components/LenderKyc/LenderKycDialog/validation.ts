import { z } from "zod"

import { LENDER_KYC_FIELD_MAX_LENGTH } from "@/config/lender-kyc"
import { LenderKycDetails } from "@/utils/lenderKycMessage"

export type LenderKycFieldError = "email" | "tooLong"

export type LenderKycFieldErrors = Partial<
  Record<"fullName" | "email" | "companyName", LenderKycFieldError>
>

const emailSchema = z.string().email()

export const validateLenderKycDetails = (
  details: LenderKycDetails,
): LenderKycFieldErrors => {
  const errors: LenderKycFieldErrors = {}
  const fullName = details.fullName.trim()
  const email = details.email.trim()
  const companyName = details.companyName.trim()

  if (fullName.length > LENDER_KYC_FIELD_MAX_LENGTH) errors.fullName = "tooLong"
  if (companyName.length > LENDER_KYC_FIELD_MAX_LENGTH)
    errors.companyName = "tooLong"
  if (email.length > LENDER_KYC_FIELD_MAX_LENGTH) errors.email = "tooLong"
  else if (email && !emailSchema.safeParse(email).success)
    errors.email = "email"

  return errors
}

export const EMPTY_LENDER_KYC_DETAILS: LenderKycDetails = {
  fullName: "",
  email: "",
  companyName: "",
  lenderType: "",
}
