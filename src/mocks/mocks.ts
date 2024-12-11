import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"

const MOCK = [
  {
    label: "Item 1",
    value: "1",
  },
  {
    label: "Item 2",
    value: "2",
  },
  {
    label: "Item 3",
    value: "3",
  },
]

export const mockedMarketTypes = [
  {
    label: "Standard Loan",
    value: "standard",
  },
  {
    label: "Fixed Term Loan",
    value: "fixedTerm",
  },
]

const mockedAccessControls = [
  {
    label: "Lender Self-Onboarding",
    value: "defaultPullProvider",
  },
  {
    label: "Manually Add Lenders",
    value: "manualApproval",
  },
]

const mockedMLATemplates = [
  {
    label: "Wildcat MLA Template",
    value: "wildcatMLA",
  },
  {
    label: "Don’t Use",
    value: "noMLA",
  },
]

const mockedNatures = [
  {
    label: "Private Individual",
    value: "pi",
  },
  {
    label: "Limited Liability Company",
    value: "llc",
  },
  {
    label: "Decentralised Autonomous Organisation",
    value: "dao",
  },
]

export const mockedStories: ExtendedSelectOptionItem[] = MOCK.map(
  (mockItem) => ({
    id: mockItem.value,
    label: mockItem.label,
    value: mockItem.value,
  }),
)

export const mockedMarketTypesOptions: ExtendedSelectOptionItem[] =
  mockedMarketTypes.map((marketType) => ({
    id: marketType.value,
    label: marketType.label,
    value: marketType.value,
  }))

export const mockedAccessControlOptions: ExtendedSelectOptionItem[] =
  mockedAccessControls.map((option) => ({
    id: option.value,
    label: option.label,
    value: option.value,
  }))

export const mockedMLATemplatesOptions: ExtendedSelectOptionItem[] =
  mockedMLATemplates.map((mlaOption) => ({
    id: mlaOption.value,
    label: mlaOption.label,
    value: mlaOption.value,
  }))

export const mockedNaturesOptions: ExtendedSelectOptionItem[] =
  mockedNatures.map((natureOption) => ({
    id: natureOption.value,
    label: natureOption.label,
    value: natureOption.value,
  }))
