import { ReactNode } from "react"

import { SetValueConfig, UseFormReturn } from "react-hook-form"

import { PrivateValidationSchemaType } from "../../hooks/useEditPrivateForm"
import { PublicValidationSchemaType } from "../../hooks/useEditPublicForm"

export type EditProfileItemProps = {
  title: string
  tooltip?: string
  form:
    | UseFormReturn<PublicValidationSchemaType & PrivateValidationSchemaType>
    | UseFormReturn<PrivateValidationSchemaType>
    | UseFormReturn<PublicValidationSchemaType>
  field:
    | "legalName"
    | "alias"
    | "description"
    | "founded"
    | "headquarters"
    | "website"
    | "twitter"
    | "telegram"
    | "linkedin"
    | "jurisdiction"
    | "entityKind"
    | "physicalAddress"
    | "email"
    | "country"
    | "entityCategory"
  oldValue: string | undefined
  newValue?: string
  children: ReactNode
  isLoading: boolean
  oldLabel?: string
  onRestoreValue?: () => void
  setValueOptions?: SetValueConfig
}
