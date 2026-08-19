/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { AllMarketsSection } from "@/app/[locale]/lender/all-markets/components/AllMarketsSection"
import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { MyMarketsSection } from "@/app/[locale]/lender/my-markets/components/MyMarketsSection"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { LenderMarketDashboardSections } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("wagmi", () => ({ useAccount: jest.fn(() => ({})) }))
jest.mock("@/app/[locale]/lender/context", () => ({
  useLenderMarketsContext: jest.fn(),
}))
jest.mock("@/hooks/useAllTokensWithMarkets", () => ({
  useAllTokensWithMarkets: jest.fn(),
}))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: jest.fn(),
}))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: jest.fn(),
}))
jest.mock("@/store/hooks", () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}))
jest.mock("@/components/FilterTextfield", () => ({
  FilterTextField: () => null,
}))
jest.mock("@/components/MarketsFilterSelect", () => ({
  MarketsFilterSelect: () => null,
}))
jest.mock("@/components/Mobile/MobileFilterButton", () => ({
  MobileFilterButton: () => null,
}))
jest.mock("@/components/Mobile/MobileSearchButton", () => ({
  MobileSearchButton: () => null,
}))
jest.mock("@/components/WrongNetworkAlert", () => ({
  WrongNetworkAlert: () => null,
}))
jest.mock("@/app/[locale]/lender/all-markets/components/MobileHeader", () => ({
  MobileHeader: () => null,
}))
jest.mock("@/app/[locale]/lender/my-markets/components/MobileHeader", () => ({
  MobileHeader: () => null,
}))
jest.mock(
  "@/app/[locale]/lender/all-markets/components/MarketsTables/OtherMarketsTable",
  () => ({
    OtherMarketsTable: ({ isLoading }: { isLoading: boolean }) => (
      <div data-testid="all-markets-table" data-loading={isLoading} />
    ),
  }),
)
jest.mock(
  "@/app/[locale]/lender/my-markets/components/MarketsTables/ActiveMarketsTables",
  () => ({
    ActiveMarketsTables: ({ isLoading }: { isLoading: boolean }) => (
      <div data-testid="my-markets-table" data-loading={isLoading} />
    ),
  }),
)
jest.mock(
  "@/app/[locale]/lender/my-markets/components/MarketsTables/TerminatedMarketsTables",
  () => ({ TerminatedMarketsTables: () => null }),
)

const emptyFilters = {
  search: "",
  assets: [],
  statuses: [],
  withdrawalCycles: [],
}

describe("lender market navigation loading", () => {
  beforeEach(() => {
    jest.mocked(useAppDispatch).mockReturnValue(jest.fn())
    jest.mocked(useAppSelector).mockImplementation((selector) =>
      selector({
        marketFilters: { lender: emptyFilters },
        lenderDashboard: {
          marketSection: LenderMarketDashboardSections.ACTIVE,
        },
      } as unknown as Parameters<typeof selector>[0]),
    )
    jest.mocked(useMobileResolution).mockReturnValue(false)
    jest.mocked(useCurrentNetwork).mockReturnValue({
      isWrongNetwork: false,
      chainId: SupportedChainId.Mainnet,
      isTestnet: false,
    } as ReturnType<typeof useCurrentNetwork>)
    jest
      .mocked(useAllTokensWithMarkets)
      .mockReturnValue({ data: [] } as unknown as ReturnType<
        typeof useAllTokensWithMarkets
      >)
    jest.mocked(useLenderMarketsContext).mockReturnValue({
      marketAccounts: [],
      isLoadingInitial: false,
      isLoadingUpdate: true,
      onboardingByMarket: {},
      onboardingStatus: "loading",
      liveDataStatus: "loading",
      borrowers: [],
    })
  })

  afterEach(() => jest.clearAllMocks())

  it("renders All Markets while live data refreshes in the background", () => {
    render(<AllMarketsSection />)

    expect(
      screen.getByTestId("all-markets-table").getAttribute("data-loading"),
    ).toBe("false")
  })

  it("renders My Markets while live data refreshes in the background", () => {
    render(<MyMarketsSection />)

    expect(
      screen.getByTestId("my-markets-table").getAttribute("data-loading"),
    ).toBe("false")
  })
})
