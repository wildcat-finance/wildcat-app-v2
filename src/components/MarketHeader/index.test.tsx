// eslint-disable-next-line import/no-extraneous-dependencies
import { cleanup, render, screen } from "@testing-library/react"
import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"

import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { useMobileResolution } from "@/hooks/useMobileResolution"

import { MarketHeader } from "./index"

jest.mock("humanize-duration", () => ({
  __esModule: true,
  default: jest.fn(() => "1 hour"),
}))
jest.mock("next/navigation", () => ({
  usePathname: () => "/lender/market/0xmarket",
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

  it("renders mobile account controls only after account data is ready", () => {
    jest.mocked(useMobileResolution).mockReturnValue(true)
    const market = makeMarket(0)
    const { rerender } = render(<MarketHeader market={market} />)

    expect(screen.queryByTestId("mobile-more")).toBeNull()

    rerender(
      <MarketHeader market={market} marketAccount={{} as MarketAccount} />,
    )

    expect(screen.getByTestId("mobile-more")).not.toBeNull()
  })
})
