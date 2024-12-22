import { ChangeEvent } from "react"

import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { TokenInfo } from "@/app/api/tokens-list/interface"

export type BasicSetupFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined

  tokens: Token[] | TokenInfo[]
  isLoading: boolean
  setQuery: (query: string) => void
  query: string
  handleChange: (evt: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleSelect: (token: TokenInfo | null) => void
}
