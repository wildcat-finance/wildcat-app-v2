import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { SignMlaFromFormInputs } from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"

export type ConfirmationFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined
  handleDeploy: () => void
  salt: string
  timeSigned: number
  onClickSign: (args: SignMlaFromFormInputs) => void
  isSigning: boolean
  mlaSignature?:
    | {
        signature?: string
        safeTxHash?: string
      }
    | undefined
}
