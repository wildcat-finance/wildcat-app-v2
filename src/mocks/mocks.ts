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

export const mockLendersData = [
  {
    isAuth: true,
    address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
    markets: [
      {
        marketName: "Test EUG25 USDC USDC",
        address: "0xdaef38622b547907ca5966ec836e543e1ba65cb3",
      },
      {
        marketName: "JUL20 USDC",
        address: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      },
      {
        marketName: "Test MRKT V3 USDC",
        address: "0x9911419d445d8d05cdeca57873b3c5e8562cc41f",
      },
    ],
  },
  {
    isAuth: false,
    address: "0x5F55005B15B9E00Ec52528fe672eb30f450151F5",
    markets: [
      {
        marketName: "JUL20 USDC",
        address: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      },
    ],
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
