import { useLegalInfoForm } from "../../hooks/useLegalInfoForm"
import { useNewMarketForm } from "../../hooks/useNewMarketForm"

export type ConfirmationModalProps = {
  open: boolean
  getMarketValues: ReturnType<typeof useNewMarketForm>["getValues"]
  getInfoValues?: ReturnType<typeof useLegalInfoForm>["getValues"]
}
