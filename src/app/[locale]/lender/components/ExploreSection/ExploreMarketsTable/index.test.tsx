/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { fireEvent, render, screen } from "@testing-library/react"
import {
  DepositStatus,
  HooksKind,
  MarketAccount,
  MarketVersion,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { useDestinations } from "@/hooks/destinations/useDestinations"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { MarketOnboardingMode } from "@/utils/marketOnboarding"

import { ExploreMarketsTable } from "."

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/lender",
}))
jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}))
jest.mock("@/app/[locale]/lender/context", () => ({
  useLenderMarketsContext: jest.fn(),
}))
jest.mock("@/hooks/destinations/useDestinations", () => ({
  useDestinations: jest.fn(),
}))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: jest.fn(),
}))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => ({ isTestnet: false, targetChainId: 1 }),
}))
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows }: { rows: { id: string; name: string }[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id}>{row.name}</div>
      ))}
    </div>
  ),
}))
jest.mock("@/components/Destinations", () => ({
  ComposableExpansionProvider: ({ children }: PropsWithChildren) => children,
  ComposableOnlySwitch: ({
    checked,
    onChange,
  }: {
    checked: boolean
    onChange: (checked: boolean) => void
  }) => (
    <input
      type="checkbox"
      aria-label="Composable only"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  ),
}))
jest.mock("@/components/MarketsFilterSelect", () => ({
  MarketsFilterSelect: () => null,
}))
jest.mock("@/components/AdsBanners/adsHelpers", () => ({
  getAdsCellProps: () => ({}),
  getAdsTooltipComponent: () => null,
}))
jest.mock("@/components/Mobile/MobileFilterButton", () => ({
  MobileFilterButton: () => null,
}))
jest.mock("@/components/Mobile/MobileSearchButton", () => ({
  MobileSearchButton: () => null,
}))
jest.mock("@/components/Mobile/MobileMarketCard", () => ({
  MobileMarketCard: ({ marketItem }: { marketItem: { name: string } }) => (
    <div>{marketItem.name}</div>
  ),
}))

const marketAddress = "0x0000000000000000000000000000000000000001"

const destinationState = (hasDestinations: boolean, isPending = false) =>
  ({
    markets: hasDestinations ? { [marketAddress]: [{}] } : {},
    showDestinations: hasDestinations || isPending,
    isPending,
  }) as unknown as ReturnType<typeof useDestinations>

describe.each([false, true])(
  "Explore integration filters (mobile: %s)",
  (mobile) => {
    beforeEach(() => {
      const token = new Token(
        1,
        "0x0000000000000000000000000000000000000002",
        "USD Coin",
        "USDC",
        6,
        false,
        new providers.JsonRpcProvider(),
      )
      const marketAccount = {
        depositAvailability: DepositStatus.Ready,
        market: {
          address: marketAddress,
          name: "Available market",
          borrower: "0x0000000000000000000000000000000000000003",
          chainId: 1,
          version: MarketVersion.V2,
          hooksKind: HooksKind.OpenTerm,
          underlyingToken: token,
          marketToken: { symbol: "marketUSDC" },
          totalSupply: token.parseAmount("100"),
          maxTotalSupply: token.parseAmount("1000"),
          totalDebts: token.parseAmount("100"),
          effectiveBorrowerAPR: token.parseAmount("0"),
          annualInterestBips: 500,
          withdrawalBatchDuration: 3600,
          timeDelinquent: 0,
          delinquencyGracePeriod: 0,
          latestDepositTimestamp: Math.floor(Date.now() / 1000),
        },
      } as unknown as MarketAccount
      jest.mocked(useMobileResolution).mockReturnValue(mobile)
      jest.mocked(useDestinations).mockReturnValue(destinationState(true))
      jest.mocked(useLenderMarketsContext).mockReturnValue({
        marketAccounts: [marketAccount],
        borrowers: [],
        isLoadingInitial: false,
        isLoadingUpdate: false,
        onboardingByMarket: {
          [marketAddress]: MarketOnboardingMode.SelfOnboard,
        },
        onboardingStatus: "ready",
        policyMarkets: new Set(),
        isPolicyMarketsLoading: false,
        defaults: {
          isLoading: false,
          isError: false,
          isDefaulted: () => false,
          defaultedMarketsOfBorrower: () => [],
        },
      })
    })

    afterEach(() => jest.clearAllMocks())

    it("only excludes the unresolved market and restores it after refresh", () => {
      const context = jest.mocked(useLenderMarketsContext)()
      const original = context.marketAccounts[0]
      const resolved = {
        ...original,
        market: {
          ...original.market,
          address: "0x0000000000000000000000000000000000000004",
          name: "Resolved market",
        },
      } as MarketAccount
      const marketAccounts = [original, resolved]
      const onboardingByMarket = {
        ...context.onboardingByMarket,
        [resolved.market.address]: MarketOnboardingMode.SelfOnboard,
      }
      jest.mocked(useLenderMarketsContext).mockReturnValue({
        ...context,
        marketAccounts,
        onboardingByMarket,
        defaults: {
          ...context.defaults,
          isError: true,
          isDefaulted: (address) =>
            address === marketAddress ? undefined : false,
        },
      })
      const { rerender } = render(<ExploreMarketsTable />)
      expect(screen.queryByText("Available market")).toBeNull()
      expect(screen.getByText("Resolved market")).toBeTruthy()

      jest
        .mocked(useLenderMarketsContext)
        .mockReturnValue({ ...context, marketAccounts, onboardingByMarket })
      rerender(<ExploreMarketsTable />)
      expect(screen.getByText("Available market")).toBeTruthy()
    })

    it("clears the composability filter when resetting an empty result", () => {
      const { rerender } = render(<ExploreMarketsTable />)
      fireEvent.click(screen.getByRole("checkbox", { name: "Composable only" }))
      expect(screen.getByText("Available market")).toBeTruthy()

      jest.mocked(useDestinations).mockReturnValue(destinationState(false))
      rerender(<ExploreMarketsTable />)
      expect(screen.queryByText("Available market")).toBeNull()
      fireEvent.click(
        screen.getByRole("button", { name: "buttons.resetFilters" }),
      )

      expect(screen.getByText("Available market")).toBeTruthy()
      expect(
        screen.queryByRole("checkbox", { name: "Composable only" }),
      ).toBeNull()
    })

    it("waits for discovery before showing a filtered empty state", () => {
      const { rerender } = render(<ExploreMarketsTable />)
      fireEvent.click(screen.getByRole("checkbox", { name: "Composable only" }))

      jest
        .mocked(useDestinations)
        .mockReturnValue(destinationState(false, true))
      rerender(<ExploreMarketsTable />)
      expect(
        screen.queryByText("dashboard.markets.noMarkets.filteredEmpty"),
      ).toBeNull()
      expect(
        screen.queryByRole("button", { name: "buttons.resetFilters" }),
      ).toBeNull()

      jest.mocked(useDestinations).mockReturnValue(destinationState(false))
      rerender(<ExploreMarketsTable />)
      expect(
        screen.getByText("dashboard.markets.noMarkets.filteredEmpty"),
      ).toBeTruthy()
    })
  },
)
