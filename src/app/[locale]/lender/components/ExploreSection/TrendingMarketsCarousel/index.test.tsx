// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen } from "@testing-library/react"
import {
  HooksKind,
  MarketAccount,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { useRecentDeposits } from "@/app/[locale]/lender/hooks/useRecentDeposits"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isMarketHealthy } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import {
  getTrendingMarketTermLabel,
  isBelowProjectedCapacity,
  TrendingMarketsCarousel,
} from "."
import { useTrendingUsdPrices } from "./useTrendingUsdPrices"

jest.mock("@/app/[locale]/lender/context", () => ({
  useLenderMarketsContext: jest.fn(),
}))
jest.mock("viem", () => ({
  formatUnits: (value: bigint) => value.toString(),
}))
jest.mock("@/app/[locale]/lender/hooks/useRecentDeposits", () => ({
  useRecentDeposits: jest.fn(),
}))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: jest.fn(),
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: jest.fn(),
}))
jest.mock("@/utils/marketStatus", () => ({
  getMarketStatusChip: jest.fn(() => ({})),
  getPenaltyBorrowers: jest.fn(() => new Set()),
  isExploreVisible: jest.fn(() => true),
  isMarketHealthy: jest.fn(() => true),
}))
jest.mock("@/utils/marketType", () => ({
  getMarketTypeChip: jest.fn(() => ({ kind: "OpenTerm" })),
}))
jest.mock("./useTrendingUsdPrices", () => ({
  useTrendingUsdPrices: jest.fn(),
}))
jest.mock("./TrendingMarketsCard", () => ({
  TrendingMarketCard: ({
    variant,
    value,
    context,
  }: {
    variant: string
    value: string
    context?: string
  }) => (
    <div
      data-testid={`trending-${variant}`}
      data-value={value}
      data-context={context}
    />
  ),
}))

const emptyActivity = {
  last7d: {},
  broad: {},
  latestDepositTimestampByMarket: {},
  netInflow7d: {},
  netInflow30d: {},
  netInflow90d: {},
}

const amount = (value: bigint) => ({
  raw: value,
  gt: (other: number) => value > BigInt(other),
})

const makeMarketAccount = ({
  totalSupply = BigInt(100),
  maxTotalSupply = BigInt(1_000_000),
}: {
  totalSupply?: bigint
  maxTotalSupply?: bigint
} = {}): MarketAccount =>
  ({
    market: {
      address: "0x0000000000000000000000000000000000000001",
      name: "Test Market",
      borrower: "0x0000000000000000000000000000000000000002",
      chainId: SupportedChainId.Mainnet,
      deployedEvent: { blockTimestamp: 1_700_000_000 },
      underlyingToken: {
        address: "0x0000000000000000000000000000000000000003",
        symbol: "USDC",
        decimals: 6,
      },
      totalSupply: amount(totalSupply),
      maxTotalSupply: amount(maxTotalSupply),
      annualInterestBips: 1_000,
      lastInterestAccruedTimestamp: Math.floor(Date.now() / 1000),
      timeDelinquent: 0,
      delinquencyGracePeriod: 0,
      delinquencyFeeBips: 0,
      withdrawalBatchDuration: 3_600,
    },
  }) as unknown as MarketAccount

const lenderContextDefaults = {
  borrowers: [],
  isLoadingInitial: false,
  isLoadingUpdate: false,
  onboardingByMarket: {},
  onboardingStatus: "ready" as const,
  liveDataStatus: "ready" as const,
}

describe("TrendingMarketsCarousel", () => {
  beforeEach(() => {
    Object.defineProperty(global, "ResizeObserver", {
      configurable: true,
      value: jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
      })),
    })
    jest.mocked(useMobileResolution).mockReturnValue(false)
    jest.mocked(isMarketHealthy).mockReturnValue(true)
    jest.mocked(useSelectedNetwork).mockReturnValue({
      chainId: SupportedChainId.Mainnet,
    } as ReturnType<typeof useSelectedNetwork>)
    jest
      .mocked(useTrendingUsdPrices)
      .mockReturnValue({ data: {} } as ReturnType<typeof useTrendingUsdPrices>)
  })

  afterEach(() => jest.clearAllMocks())

  it("keeps all five slots when activity data is unavailable", () => {
    jest.mocked(useLenderMarketsContext).mockReturnValue({
      ...lenderContextDefaults,
      marketAccounts: [makeMarketAccount()],
    })
    jest.mocked(useRecentDeposits).mockReturnValue({
      data: emptyActivity,
      isLoading: false,
      isError: true,
    })

    render(<TrendingMarketsCarousel />)

    expect(screen.getAllByTestId(/^trending-/)).toHaveLength(5)
    expect(
      screen.getByTestId("trending-fastestGrowing").getAttribute("data-value"),
    ).toBe("—")
    expect(
      screen
        .getByTestId("trending-fastestGrowing")
        .getAttribute("data-context"),
    ).toBe("Unavailable")
    expect(
      screen.getByTestId("trending-popular").getAttribute("data-value"),
    ).toBe("—")
  })

  it("keeps all five slots when mainnet has no activity in 30 days", () => {
    jest.mocked(useLenderMarketsContext).mockReturnValue({
      ...lenderContextDefaults,
      marketAccounts: [makeMarketAccount()],
    })
    jest.mocked(useRecentDeposits).mockReturnValue({
      data: emptyActivity,
      isLoading: false,
      isError: false,
    })

    render(<TrendingMarketsCarousel />)

    expect(screen.getAllByTestId(/^trending-/)).toHaveLength(5)
  })

  it("keeps the Peak APR slot when every market is unfunded", () => {
    jest.mocked(useLenderMarketsContext).mockReturnValue({
      ...lenderContextDefaults,
      marketAccounts: [makeMarketAccount({ totalSupply: BigInt(0) })],
    })
    jest.mocked(useRecentDeposits).mockReturnValue({
      data: emptyActivity,
      isLoading: false,
      isError: false,
    })

    render(<TrendingMarketsCarousel />)

    expect(screen.getAllByTestId(/^trending-/)).toHaveLength(5)
    expect(screen.getByTestId("trending-hotRate")).toBeTruthy()
  })

  it("keeps all five slots when only non-healthy explore markets remain", () => {
    jest.mocked(isMarketHealthy).mockReturnValue(false)
    jest.mocked(useLenderMarketsContext).mockReturnValue({
      ...lenderContextDefaults,
      marketAccounts: [makeMarketAccount()],
    })
    jest.mocked(useRecentDeposits).mockReturnValue({
      data: emptyActivity,
      isLoading: false,
      isError: false,
    })

    render(<TrendingMarketsCarousel />)

    expect(screen.getAllByTestId(/^trending-/)).toHaveLength(5)
  })

  it("labels periodic markets without treating them as fixed term", () => {
    jest.mocked(getMarketTypeChip).mockReturnValue({
      kind: HooksKind.PeriodicTerm,
    })

    const { market } = makeMarketAccount()

    expect(getTrendingMarketTermLabel(market)).toBe("Periodic Term")
  })

  it("projects revolving capacity with the displayed effective APR", () => {
    const { market } = makeMarketAccount({
      totalSupply: BigInt(1_000),
      maxTotalSupply: BigInt(1_050),
    })
    market.lastInterestAccruedTimestamp = 0
    Object.defineProperty(market, "currentAprDisplayBips", {
      configurable: true,
      value: {
        currentEffectiveLenderAprBips: 100,
      },
    })

    expect(isBelowProjectedCapacity(market, 365 * 24 * 60 * 60)).toBe(true)
  })
})
