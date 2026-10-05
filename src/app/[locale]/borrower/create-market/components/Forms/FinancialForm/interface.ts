import { SupportedChainId, Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { RepaymentConstraints } from "@/app/[locale]/borrower/create-market/validation/repaymentTerms"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"

export type FinancialFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined
  repaymentChainId?: SupportedChainId
  repaymentConstraints?: RepaymentConstraints
}
