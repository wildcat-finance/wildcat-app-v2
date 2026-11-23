import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { BorrowerProfile } from "@/app/api/profiles/interface"

export type MLAFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  /* What the chosen MLA is filled in with when the borrower views it */
  timeSigned: number
  salt: string
  borrowerProfile: BorrowerProfile | undefined
  tokenAsset: Token | undefined
}
