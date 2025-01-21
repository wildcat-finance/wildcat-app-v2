import { ReactNode } from "react"

import { UseFormReturn } from "react-hook-form"

import { PublicValidationSchemaType } from "@/app/[locale]/borrower/profile/edit/hooks/useEditPublicForm"

import { PrivateValidationSchemaType } from "../../hooks/useEditPrivateForm"

export type EditProfileItemProps = {
  title: string
  tooltip: string
  form:
    | UseFormReturn<PublicValidationSchemaType & PrivateValidationSchemaType>
    | UseFormReturn<PrivateValidationSchemaType>
  field:
    | "legalName"
    | "description"
    | "founded"
    | "headquarters"
    | "website"
    | "twitter"
    | "linkedin"
    | "jurisdiction"
    | "entityKind"
    | "physicalAddress"
    | "email"
  oldValue: string | undefined
  newValue?: string
  children: ReactNode
  isLoading: boolean
}
