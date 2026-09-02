import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  rankMarketsByActivity,
  selectTopMarketsByActivity,
} from "./activityRanking"

const DAY_SECONDS = 24 * 60 * 60
const NOW = 4000 * DAY_SECONDS

const market = (id: string, score: number, daysSinceDeposit?: number) => ({
  id,
  score,
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

const highestScoreFirst = (
  a: ReturnType<typeof market>,
  b: ReturnType<typeof market>,
) => b.score - a.score

describe("rankMarketsByActivity", () => {
  it("ranks recent markets before more highly scored fallbacks", () => {
    const recent = market("recent", 1, 10)
    const relaxed = market("relaxed", 2, 60)
    const dormant = market("dormant", 4, 120)
    const neverFunded = market("never-funded", 3)
    const markets = [dormant, recent, neverFunded, relaxed]

    expect(
      rankMarketsByActivity(
        markets,
        SupportedChainId.Mainnet,
        NOW,
        timestamps(markets),
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual(["recent", "relaxed", "dormant", "never-funded"])
  })

  it("uses the selected ranking within each activity tier", () => {
    const lowerRecent = market("lower-recent", 1, 5)
    const higherRecent = market("higher-recent", 2, 20)
    const lowerFallback = market("lower-fallback", 3, 100)
    const higherFallback = market("higher-fallback", 4, 200)
    const markets = [lowerRecent, lowerFallback, higherRecent, higherFallback]

    expect(
      rankMarketsByActivity(
        markets,
        SupportedChainId.Mainnet,
        NOW,
        timestamps(markets),
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual([
      "higher-recent",
      "lower-recent",
      "higher-fallback",
      "lower-fallback",
    ])
  })

  it("progressively widens Sepolia's activity windows", () => {
    const sevenDay = market("seven-day", 1, 5)
    const thirtyDay = market("thirty-day", 2, 20)
    const ninetyDay = market("ninety-day", 3, 60)
    const fallback = market("fallback", 4, 100)
    const markets = [fallback, ninetyDay, thirtyDay, sevenDay]

    expect(
      rankMarketsByActivity(
        markets,
        SupportedChainId.Sepolia,
        NOW,
        timestamps(markets),
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual(["seven-day", "thirty-day", "ninety-day", "fallback"])
  })

  it("preserves every market when no market has qualifying activity", () => {
    const lower = market("lower", 1)
    const higher = market("higher", 2, 1000)
    const markets = [lower, higher]

    expect(
      rankMarketsByActivity(
        markets,
        SupportedChainId.Mainnet,
        NOW,
        timestamps(markets),
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual(["higher", "lower"])
  })

  it("does not apply an activity gate to Plasma", () => {
    const active = market("active", 1, 5)
    const higher = market("higher", 2)
    const markets = [active, higher]

    expect(
      rankMarketsByActivity(
        markets,
        SupportedChainId.PlasmaMainnet,
        NOW,
        timestamps(markets),
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual(["higher", "active"])
  })
})

describe("selectTopMarketsByActivity", () => {
  it("sorts selected Sepolia markets by the requested criterion", () => {
    const recent = market("recent", 1, 5)
    const thirtyDay = market("thirty-day", 4, 20)
    const ninetyDay = market("ninety-day", 3, 60)
    const inactive = market("inactive", 100, 100)
    const markets = [inactive, recent, ninetyDay, thirtyDay]

    expect(
      selectTopMarketsByActivity(
        markets,
        SupportedChainId.Sepolia,
        NOW,
        timestamps(markets),
        highestScoreFirst,
        3,
      ).map(({ id }) => id),
    ).toEqual(["thirty-day", "ninety-day", "recent"])
  })

  it("keeps inactive markets out when activity fills the visible slots", () => {
    const recent = market("recent", 1, 5)
    const thirtyDay = market("thirty-day", 2, 20)
    const inactive = market("inactive", 100, 100)
    const markets = [inactive, thirtyDay, recent]

    expect(
      selectTopMarketsByActivity(
        markets,
        SupportedChainId.Sepolia,
        NOW,
        timestamps(markets),
        highestScoreFirst,
        2,
      ).map(({ id }) => id),
    ).toEqual(["thirty-day", "recent"])
  })
})
