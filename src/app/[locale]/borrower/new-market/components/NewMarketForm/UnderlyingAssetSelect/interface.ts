import { UseFormRegisterReturn } from "react-hook-form"

export type TokenSelectorProps = {
  error?: boolean
  errorText?: string
  onBlur?: UseFormRegisterReturn["onBlur"]
  handleTokenSelect: (value: string) => void
}
