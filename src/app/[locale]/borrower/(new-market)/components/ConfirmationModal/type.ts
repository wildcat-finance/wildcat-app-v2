import { Token } from "@wildcatfi/wildcat-sdk"

import { useLegalInfoForm } from "@/app/[locale]/borrower/(new-market)/hooks/useLegalInfoForm"
import { useNewMarketForm } from "@/app/[locale]/borrower/create-market/hooks/useNewMarketForm"

export type ConfirmationModalProps = {
  open: boolean
  tokenAsset: Token | undefined
  getMarketValues: ReturnType<typeof useNewMarketForm>["getValues"]
  getInfoValues?: ReturnType<typeof useLegalInfoForm>["getValues"]
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  handleDeployMarket: () => void
}
