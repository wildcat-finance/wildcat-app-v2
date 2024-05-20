import { Token } from "@wildcatfi/wildcat-sdk"

import { useLegalInfoForm } from "../../hooks/useLegalInfoForm"
import { useNewMarketForm } from "../../hooks/useNewMarketForm"

export type ConfirmationModalProps = {
  open: boolean
  tokenAsset: Token | undefined
  getMarketValues: ReturnType<typeof useNewMarketForm>["getValues"]
  getInfoValues?: ReturnType<typeof useLegalInfoForm>["getValues"]
  handleDeployMarket: () => void
}
