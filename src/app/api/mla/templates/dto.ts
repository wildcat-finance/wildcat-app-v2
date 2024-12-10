import { z } from "zod"

import { MlaFieldValueKeys } from "@/lib/mla"

export const MlaTemplateFieldDTO = z.object({
  source: z.enum(MlaFieldValueKeys),
  placeholder: z.string(),
})

export const CreateMlaTemplateInputDTO = z.object({
  name: z.string(),
  description: z.string().optional(),
  html: z.string(),
  plaintext: z.string(),
  borrowerFields: z.array(MlaTemplateFieldDTO),
  lenderFields: z.array(MlaTemplateFieldDTO),
})
