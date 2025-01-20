import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import { MarketAssets, MarketStatus } from "@/utils/marketStatus"

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
    value: "pi",
  },
  {
    label: "Private Company Limited by Shares",
    value: "llc",
  },
  {
    label: "Foundation Company Limited by Guarantee",
    value: "fnd",
  },
  {
    label: "Public Limited Company",
    value: "plc",
  },
  {
    label: "Limited Partnership",
    value: "lp",
  },
  {
    label: "General Partnership",
    value: "gp",
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

export const underlyingAssetsMock = [
  {
    id: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    name: MarketAssets.WBTC,
  },
  {
    id: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    name: MarketAssets.WETH,
  },
  {
    id: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    name: MarketAssets.USDT,
  },
  {
    id: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: MarketAssets.USDC,
  },
  {
    id: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    name: MarketAssets.DAI,
  },
]

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
