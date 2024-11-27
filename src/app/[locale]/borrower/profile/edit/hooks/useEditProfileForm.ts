import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const profileValidationSchema = z.object({
  legalName: z.string().optional(),
  description: z.string().optional(),
  founded: z.string().optional(),
  headquarters: z.string().optional(),
  website: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),

  jurisdiction: z.string().optional(),
  legalNature: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
})

export type ProfileValidationSchemaType = z.infer<
  typeof profileValidationSchema
>

export const useEditProfileForm = () => {
  const defaultEditProfileForm: ProfileValidationSchemaType = {
    legalName: "",
    description: "",
    founded: "",
    headquarters: "",
    website: "",

    jurisdiction: "",
    legalNature: "",
    address: "",
    email: "",
  }

  return useForm<ProfileValidationSchemaType>({
    defaultValues: defaultEditProfileForm,
    resolver: zodResolver(profileValidationSchema),
    mode: "onChange",
  })
}
