import { Token } from "@wildcatfi/wildcat-sdk"

import { useNewMarketForm } from "@/app/[locale]/borrower/create-market/hooks/useNewMarketForm"
import { useLegalInfoForm } from "@/app/[locale]/borrower/(new-market)/hooks/useLegalInfoForm"

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
