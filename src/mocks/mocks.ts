import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import { MarketStatus } from "@/utils/marketStatus"

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
    label: "Open Term Loan",
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
    label: "Borrower Operated Allowlist",
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
    value: "Private Individual",
  },
  {
    label: "Decentralised Autonomous Organisation",
    value: "Decentralised Autonomous Organisation",
  },
  {
    label: "Registered Legal Entity",
    value: "Registered Legal Entity",
  },
]

export const mockedStories: ExtendedSelectOptionItem[] = MOCK.map(
  (mockItem) => ({
    id: mockItem.value,
    label: mockItem.label,
    value: mockItem.value,
  }),
)

export const marketStatusesMock = [
  {
    id: MarketStatus.HEALTHY,
    name: MarketStatus.HEALTHY,
  },
  {
    id: MarketStatus.DELINQUENT,
    name: MarketStatus.DELINQUENT,
  },
  {
    id: MarketStatus.PENALTY,
    name: MarketStatus.PENALTY,
  },
]

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
