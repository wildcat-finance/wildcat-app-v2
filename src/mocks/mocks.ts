import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"

export const mockedMarketTypes = [
  {
    label: "Standard Loan",
    value: "standard",
  },
]

export const mockedKYCPreferences = [
  {
    label: "Share contact info for direct KYC",
    value: "share",
  },
]

export const mockedMLATemplates = [
  {
    label: "No MLA",
    value: "noMLA",
  },
  {
    label: "Wildcat MLA template",
    value: "wildcatMLA",
  },
]

export const mockedMarketTypesOptions: ExtendedSelectOptionItem[] =
  mockedMarketTypes.map((marketType) => ({
    id: marketType.value,
    label: marketType.label,
    value: marketType.value,
  }))

export const mockedKYCPreferencesOptions: ExtendedSelectOptionItem[] =
  mockedKYCPreferences.map((marketType) => ({
    id: marketType.value,
    label: marketType.label,
    value: marketType.value,
  }))

export const mockedMLATemplatesOptions: ExtendedSelectOptionItem[] =
  mockedMLATemplates.map((marketType) => ({
    id: marketType.value,
    label: marketType.label,
    value: marketType.value,
  }))
