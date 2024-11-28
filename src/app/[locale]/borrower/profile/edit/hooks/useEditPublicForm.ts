import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const publicValidationSchema = z.object({
  legalName: z.string().optional(),
  description: z.string().optional(),
  founded: z.string().optional(),
  headquarters: z.string().optional(),
  website: z.string().optional(),
  twitter: z.string().optional(),
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
    mode: "onChange",
  })
}
