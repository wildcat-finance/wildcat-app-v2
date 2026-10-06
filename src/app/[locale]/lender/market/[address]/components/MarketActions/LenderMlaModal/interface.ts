import { Theme } from "@mui/material"
import { SxProps } from "@mui/system"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"

export type LenderMlaModalProps = {
  mla: MasterLoanAgreementResponse | undefined | null | { noMLA: boolean }
  isLoading: boolean
}
