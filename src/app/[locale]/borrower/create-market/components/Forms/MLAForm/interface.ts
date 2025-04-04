import { UseFormReturn } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"

export type MLAFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
}
