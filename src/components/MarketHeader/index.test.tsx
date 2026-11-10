// eslint-disable-next-line import/no-extraneous-dependencies
import { cleanup, render, screen } from "@testing-library/react"
import { Market } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"

import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { useMobileResolution } from "@/hooks/useMobileResolution"

import { MarketHeader } from "./index"

let mockDefaultStatus: boolean | undefined = false
let mockDisplayStatus: boolean | undefined = false

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock("humanize-duration", () => ({
  __esModule: true,
  default: jest.fn(() => "1 hour"),
}))

jest.mock(
  "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals",
  () => ({ useGetWithdrawals: jest.fn() }),
)
jest.mock("@/app/[locale]/lender/profile/hooks/useGetBorrowerProfile", () => ({
  useGetBorrowerProfile: jest.fn(() => ({ data: undefined })),
}))
jest.mock("@/assets/icons/avatar_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/assets/icons/defaulted_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/hooks/useDefaultedMarkets", () => ({
  useDefaultedMarkets: () => ({
    isLoading: false,
    isError: false,
    defaultedMarkets: {},
    isDefaulted: () => mockDefaultStatus,
    isDefaultedForDisplay: () => mockDisplayStatus,
    defaultedAt: () => undefined,
    defaultedMarketsOfBorrower: () => [],
  }),
}))
jest.mock("@/components/@extended/MarketStatusChip", () => ({
  MarketStatusChip: () => <span>Healthy</span>,
}))
jest.mock("@/components/MarketCycleChip", () => ({
  MarketCycleChip: ({ time }: { time: string }) => (
    <span data-testid="market-cycle">{time}</span>
  ),
}))
jest.mock("@/components/Mobile/MobileMoreButton", () => ({
  MobileMoreButton: () => <span data-testid="mobile-more" />,
}))
jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: jest.fn(() => false),
}))
jest.mock("@/utils/marketStatus", () => ({
  MarketStatus: {
    HEALTHY: "Healthy",
    TERMINATED: "Terminated",
    DEFAULTED: "Defaulted",
  },
  getMarketStatusChip: jest.fn(() => ({ status: "Healthy" })),
}))

const NOW_SECONDS = 1_800_000_000

const makeMarket = (pendingWithdrawalExpiry: number) =>
  ({
    name: "Test Market",
    chainId: 1,
    borrower: "0x0000000000000000000000000000000000000001",
    pendingWithdrawalExpiry,
    underlyingToken: { symbol: "USDC" },
  }) as unknown as Market

describe("MarketHeader", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(NOW_SECONDS * 1000))
    jest.clearAllMocks()
    mockDefaultStatus = false
    mockDisplayStatus = false
    jest.mocked(useMobileResolution).mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
    jest.useRealTimers()
  })

  it("uses the live pending withdrawal expiry without fetching batches", () => {
    render(<MarketHeader market={makeMarket(NOW_SECONDS + 60 * 60)} />)

    expect(useGetWithdrawals).not.toHaveBeenCalled()
    expect(humanizeDuration).toHaveBeenCalledWith(60 * 60 * 1000, {
      round: true,
      largest: 1,
      units: ["h", "m", "s"],
    })
    expect(screen.getByTestId("market-cycle").textContent).toBe("1 hour")
  })

  it("does not show a cycle when there is no pending expiry", () => {
    render(<MarketHeader market={makeMarket(0)} />)

    expect(humanizeDuration).not.toHaveBeenCalled()
    expect(screen.queryByTestId("market-cycle")).toBeNull()
  })

  it.each([false, true])(
    "does not label an unknown default status healthy (mobile: %s)",
    (isMobile) => {
      jest.mocked(useMobileResolution).mockReturnValue(isMobile)
      mockDefaultStatus = undefined
      mockDisplayStatus = undefined
      const market = makeMarket(0)
      const { rerender } = render(<MarketHeader market={market} />)
      expect(screen.getByLabelText("Loading market status")).toBeTruthy()
      expect(screen.queryByText("Healthy")).toBeNull()

      mockDefaultStatus = false
      mockDisplayStatus = false
      rerender(<MarketHeader market={market} />)
      expect(screen.getByText("Healthy")).toBeTruthy()
    },
  )

  it.each([false, true])(
    "keeps the last known status while an expired status refreshes (mobile: %s)",
    (isMobile) => {
      jest.mocked(useMobileResolution).mockReturnValue(isMobile)
      mockDefaultStatus = undefined
      mockDisplayStatus = false
      render(<MarketHeader market={makeMarket(0)} />)
      expect(screen.queryByLabelText("Loading market status")).toBeNull()
      expect(screen.getByText("Healthy")).toBeTruthy()
    },
  )

  it("renders mobile market actions before account data is ready", () => {
    jest.mocked(useMobileResolution).mockReturnValue(true)
    render(<MarketHeader market={makeMarket(0)} />)

    expect(screen.getByTestId("mobile-more")).not.toBeNull()
  })
  it.each([false, true])(
    "shows indexed identity with a placeholder for live status (mobile: %s)",
    (isMobile) => {
      jest.mocked(useMobileResolution).mockReturnValue(isMobile)
      const market = makeMarket(NOW_SECONDS + 3600)
      const { rerender } = render(
        <MarketHeader market={market} isLiveMarketReady={false} />,
      )
      expect(screen.getByText("Test Market")).toBeTruthy()
      if (!isMobile) expect(screen.getByText("USDC")).toBeTruthy()
      expect(screen.getByLabelText("Loading market status")).toBeTruthy()
      expect(screen.queryByText("Healthy")).toBeNull()
      expect(screen.queryByTestId("market-cycle")).toBeNull()
      expect(humanizeDuration).not.toHaveBeenCalled()
      rerender(<MarketHeader market={market} isLiveMarketReady />)
      expect(screen.queryByLabelText("Loading market status")).toBeNull()
      expect(screen.getByText("Healthy")).toBeTruthy()
      expect(screen.getByTestId("market-cycle")).toBeTruthy()
    },
  )
})
