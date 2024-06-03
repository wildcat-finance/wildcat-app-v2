import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import { SidebarMarketAssets } from "@/store/slices/borrowerSidebarSlice/interface"

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

export const underlyingAssetsMock = [
  {
    id: 1,
    underlyingAsset: SidebarMarketAssets.WBTC,
  },
  {
    id: 2,
    underlyingAsset: SidebarMarketAssets.WETH,
  },
  {
    id: 3,
    underlyingAsset: SidebarMarketAssets.USDT,
  },
  {
    id: 4,
    underlyingAsset: SidebarMarketAssets.USDC,
  },
  {
    id: 5,
    underlyingAsset: SidebarMarketAssets.DAI,
  },
]

export const mockedMarketTypes = [
  {
    label: "Standard Loan",
    value: "standard",
  },
]

const mockedKYCPreferences = [
  {
    label: "Share contact info for direct KYC",
    value: "share",
  },
  {
    label: "Not share",
    value: "notShare",
  },
]

const mockedMLATemplates = [
  {
    label: "No MLA",
    value: "noMLA",
  },
  {
    label: "Wildcat MLA template",
    value: "wildcatMLA",
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

export const mockedKYCPreferencesOptions: ExtendedSelectOptionItem[] =
  mockedKYCPreferences.map((kycOption) => ({
    id: kycOption.value,
    label: kycOption.label,
    value: kycOption.value,
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
