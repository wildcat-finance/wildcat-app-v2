import { z } from "zod"

export const BorrowerProfileInputDTO = z.object({
  name: z.string().min(0).max(64).optional(),
  description: z.string().min(0).max(1024).optional(),
  founded: z.string().min(0).max(128).optional(),
  headquarters: z.string().min(0).max(128).optional(),
  website: z
    .string()
    .regex(
      /^(?:(?:https):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:(\/|\?|#)[^\s]*)?$/,
      {
        message: `Invalid URL`,
      },
    )
    .optional()
    .or(z.literal("")),
  twitter: z
    .string()
    .regex(/^(@?(\w){1,15}$)$/, {
      message: `Invalid Twitter username`,
    })
    .optional()
    .or(z.literal("")),
  telegram: z
    .string()
    .regex(/^(@?(\w){5,32}$)$/, {
      message: `Invalid Telegram username`,
    })
    .optional()
    .or(z.literal("")),
  linkedin: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  jurisdiction: z.string().min(0).max(64).optional(),
  physicalAddress: z.string().min(0).max(128).optional(),
  entityKind: z.string().min(0).max(64).optional(),
})

export const BorrowerProfileUpdateResponseDTO = z.object({
  updateId: z.number(),
  accept: z.boolean().optional(),
  rejectedReason: z.string().optional(),
})
