import { z } from "zod"

import { MlaFieldValueKeys } from "@/lib/mla"

export const MlaTemplateFieldDTO = z.object({
  source: z.enum(MlaFieldValueKeys),
  placeholder: z.string(),
})

export const CreateMlaTemplateInputDTO = z
  .object({
    chainId: z.number(),
    // Set to register a custom MLA that only this borrower may select.
    borrowerId: z.string().uuid().optional(),
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
  .refine((input) => !input.borrowerId || !!input.version, {
    message: "A custom MLA needs a version",
    path: ["version"],
  })
  .refine((input) => !input.borrowerId || !input.isDefault, {
    message: "A custom MLA cannot be the default template",
    path: ["isDefault"],
  })

export const UpdateMlaTemplateInputDTO = z.object({
  retired: z.literal(true),
})
