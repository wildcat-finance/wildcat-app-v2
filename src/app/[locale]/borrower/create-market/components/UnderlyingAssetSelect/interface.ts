import { ChangeEvent } from "react"

import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormRegisterReturn } from "react-hook-form"

import { TokenInfo } from "@/app/api/tokens-list/interface"

export type TokenSelectorProps = {
  error?: boolean
  errorText?: string
  onBlur?: UseFormRegisterReturn["onBlur"]
  handleTokenSelect: (token: TokenInfo | null) => void

  tokens: Token[] | TokenInfo[]
  isLoading: boolean
  setQuery: (query: string) => void
  query: string
  handleChange: (evt: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleSelect: (token: TokenInfo | null) => void
  value: string
}
