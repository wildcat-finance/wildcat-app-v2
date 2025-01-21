import { ReactNode } from "react"

import { UseFormReturn } from "react-hook-form"

import { PrivateValidationSchemaType } from "../../hooks/useEditPrivateForm"

export type SelectProfileItemProps = {
  title: string
  tooltip: string
  form: UseFormReturn<PrivateValidationSchemaType>
  oldValue?: string
  oldLabel?: string
  newValue?: string
  children: ReactNode
  isLoading: boolean
}
