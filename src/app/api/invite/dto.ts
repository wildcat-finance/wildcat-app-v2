import { z, ZodObject, ZodRawShape, ZodTypeAny } from "zod"

export const AcceptInvitationInputDTO = z.object({
  address: z.string().min(2).max(42),
  name: z.string().min(1).max(64),
  description: z.string().min(2).max(1024).optional(),
  founded: z.string().min(0).max(128).optional(),
  headquarters: z.string().min(0).max(128).optional(),
  jurisdiction: z.string().min(0).max(64).optional(),
  physicalAddress: z.string().min(0).max(128).optional(),
  entityKind: z.string().min(0).max(64).optional(),
  signature: z.string().min(2).max(8192),
  timeSigned: z.number(),
})

export const BorrowerInvitationInputDTO = z.object({
  address: z.string().min(2).max(42),
  name: z.string().min(1).max(64),
  description: z.string().min(0).max(1024).optional(),
  founded: z.string().min(0).max(128).optional(),
  headquarters: z.string().min(0).max(128).optional(),
  jurisdiction: z.string().min(0).max(64).optional(),
  physicalAddress: z.string().min(0).max(128).optional(),
  entityKind: z.string().min(0).max(64).optional(),
})
