import { zodResolver } from "@hookform/resolvers/zod"
import { ethers } from "ethers"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const addLenderValidationSchema = z.object({
  name: z.string(),
  address: z
    .string()
    .min(1, "Address is required")
    .min(42, "Address must be exactly 42 characters long")
    .max(42, "Address must be exactly 42 characters long")
    .refine(
      (address) => ethers.utils.isAddress(address),
      "Invalid blockchain address",
    ),
})

export type AddLenderValidationSchemaType = z.infer<
  typeof addLenderValidationSchema
>

export const defaultAddLenderForm: Partial<AddLenderValidationSchemaType> = {
  name: "",
  address: "",
}

export const useAddLenderForm = () =>
  useForm<AddLenderValidationSchemaType>({
    defaultValues: defaultAddLenderForm,
    resolver: zodResolver(addLenderValidationSchema),
    mode: "onChange",
  })
