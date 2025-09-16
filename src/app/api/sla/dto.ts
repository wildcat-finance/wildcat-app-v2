import { z } from "zod"

export const ServiceAgreementSignatureInputDTO = z.object({
  address: z.string().min(2).max(42),
  chainId: z.number(),
  signature: z.string().min(2).max(8192),
  timeSigned: z.number(),
})
