import { z } from "zod"

import { MlaFieldValueKeys } from "@/lib/mla"
import { hasTemplateBraces } from "@/lib/mlaTemplateText"

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

/// A custom MLA: the borrower's agreement text, pasted verbatim.
export const CreateCustomMlaInputDTO = z.object({
  chainId: z.number(),
  borrowerId: z.string().uuid(),
  name: z.string().trim().min(1).max(128),
  version: z.string().trim().min(1).max(64),
  description: z.string().trim().max(1024).optional(),
  text: z
    .string()
    .refine((text) => text.trim().length > 0, "Paste the agreement text")
    .refine(
      (text) => !hasTemplateBraces(text),
      "The agreement text cannot contain {{",
    ),
})

export const UpdateMlaTemplateInputDTO = z.object({
  retired: z.literal(true),
})
