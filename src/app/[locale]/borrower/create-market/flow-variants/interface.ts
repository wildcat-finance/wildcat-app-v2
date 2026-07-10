import { ComponentType } from "react"

import { TFunction } from "i18next"

import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { ConfirmationFormProps } from "../components/Forms/ConfirmationForm/interface"
import { FinancialFormProps } from "../components/Forms/FinancialForm/interface"
import { GlossaryItem } from "../components/GlossarySidebar/interface"
import { MarketValidationSchemaType } from "../validation/validationSchema"

export type CreateMarketFlowVariantKey =
  MarketValidationSchemaType["implementationType"]

// Extension point for future market types with custom steps, validation, or policy sections.
export type CreateMarketFlowVariant = {
  key: CreateMarketFlowVariantKey
  FinancialForm: ComponentType<FinancialFormProps>
  ConfirmationForm: ComponentType<ConfirmationFormProps>
  getGlossaryItems: (
    step: CreateMarketSteps,
    t: TFunction,
    marketType?: string,
  ) => GlossaryItem[]
}
