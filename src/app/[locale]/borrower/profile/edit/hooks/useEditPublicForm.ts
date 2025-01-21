import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const publicValidationSchema = z.object({
  legalName: z.string().min(1),
  description: z
    .string()
    .max(1000, "Description cannot be longer than 1000 characters")
    .optional(),
  founded: z.string().optional(),
  headquarters: z.string().optional(),
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
  linkedin: z.string().optional(),
})

export type PublicValidationSchemaType = z.infer<typeof publicValidationSchema>

export const useEditPublicForm = () => {
  const defaultEditPublicForm: PublicValidationSchemaType = {
    legalName: "",
    description: "",
    founded: "",
    headquarters: "",
    website: "",
  }

  return useForm<PublicValidationSchemaType>({
    defaultValues: defaultEditPublicForm,
    resolver: zodResolver(publicValidationSchema),
    mode: "onBlur",
  })
}
