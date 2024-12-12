import { UseFormReturn } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"

export type BorrowerRestrictionsFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
}
