import { z } from "zod"

export const ServiceAgreementSignatureInputDTO = z.object({
  address: z.string().min(2).max(42),
  signature: z.string().min(2).max(8192),
  dateSigned: z.string(),
})
