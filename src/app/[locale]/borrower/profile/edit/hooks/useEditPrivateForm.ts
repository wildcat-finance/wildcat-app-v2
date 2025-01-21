import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const entityCategories = [
  "Private Individual",
  "Registered Legal Entity",
  "Decentralised Autonomous Organisation",
] as const

export const entityCategoryOptions = entityCategories.map((category) => ({
  id: category,
  label: category,
  value: category,
}))

export type EntityCategory = (typeof entityCategories)[number]

export const privateValidationSchema = z.object({
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  entityKind: z.string().min(1, "Entity form is required"),
  physicalAddress: z
    .string()
    .min(
      1,
      "Physical address is required. Put Physical Address Withheld if not applicable.",
    ),
  email: z.string().email().optional().or(z.literal("")),
  country: z
    .string({
      required_error: "Country is required",
    })
    .min(1, "Country is required"),
  entityCategory: z.enum(entityCategories).optional(),
})
export type PrivateValidationSchemaType = z.infer<
  typeof privateValidationSchema
>

export const useEditPrivateForm = () => {
  const defaultEditPrivateForm: PrivateValidationSchemaType = {
    jurisdiction: "",
    entityKind: "",
    physicalAddress: "",
    email: "",
    country: "",
    entityCategory: "Registered Legal Entity",
  }

  return useForm<PrivateValidationSchemaType>({
    defaultValues: defaultEditPrivateForm,
    resolver: zodResolver(privateValidationSchema),
    mode: "onBlur",
  })
}
