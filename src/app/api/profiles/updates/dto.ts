import { z } from "zod"

export const BorrowerProfileInputDTO = z.object({
  address: z.string().min(2).max(42),
  name: z.string().min(2).max(64).optional(),
  description: z.string().min(2).max(64).optional(),
  founded: z.string().min(2).max(128).optional(),
  headquarters: z.string().min(2).max(128).optional(),
  website: z.string().min(2).max(64).optional(),
  twitter: z.string().min(2).max(64).optional(),
  linkedin: z.string().min(2).max(64).optional(),
  email: z.string().min(2).max(64).optional(),
})

export const BorrowerProfileUpdateResponseDTO = z.object({
  updateId: z.number(),
  accept: z.boolean().optional(),
  rejectedReason: z.string().optional(),
})
