import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getActivityEligibleMarkets } from "./activitySelection"

const DAY_SECONDS = 24 * 60 * 60
const NOW = 200 * DAY_SECONDS

const market = (id: string, daysSinceDeposit?: number) => ({
  id,
  market: {
    address: id,
  },
  latestDepositTimestamp:
    daysSinceDeposit === undefined
      ? undefined
      : NOW - daysSinceDeposit * DAY_SECONDS,
})

const timestamps = (
  markets: ReturnType<typeof market>[],
): Record<string, number> =>
  Object.fromEntries(
    markets.flatMap(({ market: item, latestDepositTimestamp }) =>
      latestDepositTimestamp === undefined
        ? []
        : [[item.address, latestDepositTimestamp]],
    ),
  )

describe("getActivityEligibleMarkets", () => {
  it("uses mainnet markets with activity in the last 30 days", () => {
    const recent = market("recent", 10)
    const dormant = market("dormant", 40)
    const markets = [recent, dormant]

    expect(
      getActivityEligibleMarkets(
        markets,
        SupportedChainId.Mainnet,
        NOW,
        timestamps(markets),
      ),
    ).toEqual([recent])
  })

  it("falls back to the mainnet catalogue when the 30-day set is empty", () => {
    const markets = [market("dormant", 40), market("never")]

    expect(
      getActivityEligibleMarkets(
        markets,
        SupportedChainId.Mainnet,
        NOW,
        timestamps(markets),
      ),
    ).toEqual(markets)
  })

  it.each([5, 20, 60])(
    "uses Sepolia's first active window for a %s-day-old deposit",
    (days) => {
      const selected = market("selected", days as number)
      const older = market("older", 100)

      expect(
        getActivityEligibleMarkets(
          [selected, older],
          SupportedChainId.Sepolia,
          NOW,
          timestamps([selected, older]),
        ),
      ).toEqual([selected])
    },
  )

  it("falls back to the Sepolia catalogue when all activity is older than 90 days", () => {
    const markets = [market("older", 100), market("never")]

    expect(
      getActivityEligibleMarkets(
        markets,
        SupportedChainId.Sepolia,
        NOW,
        timestamps(markets),
      ),
    ).toEqual(markets)
  })

  it("does not apply a recency gate to Plasma", () => {
    const markets = [market("only-market", 500)]

    expect(
      getActivityEligibleMarkets(
        markets,
        SupportedChainId.PlasmaMainnet,
        NOW,
        timestamps(markets),
      ),
    ).toEqual(markets)
  })
})
