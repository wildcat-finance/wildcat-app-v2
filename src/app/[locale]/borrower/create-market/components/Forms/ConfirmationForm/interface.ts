import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { SignMlaFromFormInputs } from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"
import { BorrowerProfile } from "@/app/api/profiles/interface"

export type ConfirmationFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined
  borrowerProfile: BorrowerProfile | undefined
  handleDeploy: () => void
  salt: string
  timeSigned: number
  onClickSign: (args: SignMlaFromFormInputs) => void
  onDiscardSignature: () => boolean
  signatureRequested: boolean
  paramsChangedSinceSigning: boolean
  isSigning: boolean
  isDeployReady: boolean
  mlaSignature?:
    | {
        signature?: string
        safeTxHash?: string
        message?: string
      }
    | undefined
}
