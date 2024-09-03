import { zodResolver } from "@hookform/resolvers/zod"
import { ethers } from "ethers"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const useAddLenderForm = (existingLenders: string[]) => {
  const addLenderValidationSchema = z.object({
    name: z.string(),
    address: z
      .string()
      .min(1, "Address is required")
      .min(42, "Address must be exactly 42 characters long")
      .max(42, "Address must be exactly 42 characters long")
      .refine(
        (value) =>
          !existingLenders.some(
            (address) => address.toLowerCase() === value.toLowerCase(),
          ),
        "This lender already exists",
      )
      .refine(
        (address) => ethers.utils.isAddress(address),
        "Invalid blockchain address",
      ),
  })

  type AddLenderValidationSchemaType = z.infer<typeof addLenderValidationSchema>

  const defaultAddLenderForm: Partial<AddLenderValidationSchemaType> = {
    name: "",
    address: "",
  }

  return useForm<AddLenderValidationSchemaType>({
    defaultValues: defaultAddLenderForm,
    resolver: zodResolver(addLenderValidationSchema),
    mode: "onChange",
  })
}
