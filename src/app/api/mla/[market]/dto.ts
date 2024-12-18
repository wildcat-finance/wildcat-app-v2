import { z } from "zod"

import { MlaFieldValueKeys } from "@/lib/mla"

export const MlaTemplateFieldDTO = z.object({
  source: z.enum(MlaFieldValueKeys),
  placeholder: z.string(),
})

export const SetMasterLoanAgreementInputDTO = z.object({
  mlaTemplate: z.number(),
  timeSigned: z.number(),
  signature: z.string(),
})
