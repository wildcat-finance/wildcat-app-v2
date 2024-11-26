import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const profileValidationSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required"),
  description: z.string().trim().min(1, "Description is required"),
  founded: z.string().trim().min(1, "Founded date is required"),
  headquarters: z.string().trim().min(1, "Headquarters is required"),
  website: z.string().trim().min(1, "Website is required"),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
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
    twitter: "",
    linkedin: "",
  }

  return useForm<ProfileValidationSchemaType>({
    defaultValues: defaultEditProfileForm,
    resolver: zodResolver(profileValidationSchema),
    mode: "onChange",
  })
}
