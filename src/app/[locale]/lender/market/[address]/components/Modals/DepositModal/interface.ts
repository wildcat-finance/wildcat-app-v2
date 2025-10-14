import { Dispatch, SetStateAction } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

export type DepositModalProps = {
  marketAccount: MarketAccount
  isMobileOpen?: boolean
  setIsMobileOpen?: Dispatch<SetStateAction<boolean>>
}
