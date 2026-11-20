import { z } from "zod"

import { MlaFieldValueKeys } from "@/lib/mla"

export const MlaTemplateFieldDTO = z.object({
  source: z.enum(MlaFieldValueKeys),
  placeholder: z.string(),
})

/// A market MLA, offered to every borrower of the network class.
export const CreateMlaTemplateInputDTO = z.object({
  chainId: z.number(),
  name: z.string().trim().min(1).max(128),
  version: z.string().trim().min(1).max(64).optional(),
  description: z.string().max(1024).optional(),
  hide: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  // Generated from the plain text when omitted.
  html: z.string().optional(),
  plaintext: z.string().trim().min(1),
  borrowerFields: z.array(MlaTemplateFieldDTO),
  lenderFields: z.array(MlaTemplateFieldDTO),
})

/// A custom MLA: the HTML and plain text of the borrower's copy of the
/// market MLA, placeholders included.
export const CreateCustomMlaInputDTO = z.object({
  chainId: z.number(),
  borrowerId: z.string().uuid(),
  name: z.string().trim().min(1).max(128),
  version: z.string().trim().min(1).max(64),
  description: z.string().trim().max(1024).optional(),
  html: z.string().trim().min(1, "Enter the HTML"),
  plaintext: z.string().trim().min(1, "Enter the plain text"),
})

export const UpdateMlaTemplateInputDTO = z.object({
  retired: z.literal(true),
})
