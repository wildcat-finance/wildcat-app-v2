import { UseFormRegisterReturn } from "react-hook-form"

import { TokenInfo } from "@/app/api/tokens-list/interface"

export type TokenSelectorProps = {
  error?: boolean
  errorText?: string
  onBlur?: UseFormRegisterReturn["onBlur"]
  handleTokenSelect: (token: TokenInfo | null) => void
}
