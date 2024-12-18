import { UseFormReturn } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"

export type MarketPolicyFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  policyOptions: ExtendedSelectOptionItem[]
}
