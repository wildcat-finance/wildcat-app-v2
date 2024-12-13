import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const privateValidationSchema = z.object({
  jurisdiction: z.string().optional(),
  legalNature: z.string().optional(),
  companyAddress: z.string().optional(),
  email: z.string().optional(),
})
export type PrivateValidationSchemaType = z.infer<
  typeof privateValidationSchema
>

export const useEditPrivateForm = () => {
  const defaultEditPrivateForm: PrivateValidationSchemaType = {
    jurisdiction: "",
    legalNature: "",
    companyAddress: "",
    email: "",
  }

  return useForm<PrivateValidationSchemaType>({
    defaultValues: defaultEditPrivateForm,
    resolver: zodResolver(privateValidationSchema),
    mode: "onBlur",
  })
}
