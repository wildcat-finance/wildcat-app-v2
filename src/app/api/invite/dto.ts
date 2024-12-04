import { z, ZodObject, ZodRawShape, ZodTypeAny } from "zod"

export const AcceptInvitationInputDTO = z.object({
  address: z.string().min(2).max(42),
  name: z.string().min(1).max(64),
  signature: z.string().min(2).max(8192),
  dateSigned: z.string(),
})

export const BorrowerInvitationInputDTO = z.object({
  address: z.string().min(2).max(42),
  name: z.string().min(1).max(64),
  inviter: z.string().min(2).max(42),
})
