import { rankMarketsByActivity } from "./activityRanking"

const DAY_SECONDS = 24 * 60 * 60
const NOW = 4000 * DAY_SECONDS

const market = (id: string, score: number, daysSinceDeposit?: number) => ({
  id,
  score,
  market: {
    latestDepositTimestamp:
      daysSinceDeposit === undefined
        ? undefined
        : NOW - daysSinceDeposit * DAY_SECONDS,
  },
})

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

    expect(
      rankMarketsByActivity(
        [dormant, recent, neverFunded, relaxed],
        false,
        NOW,
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual(["recent", "relaxed", "dormant", "never-funded"])
  })

  it("uses the selected ranking within each activity tier", () => {
    const lowerRecent = market("lower-recent", 1, 5)
    const higherRecent = market("higher-recent", 2, 20)
    const lowerFallback = market("lower-fallback", 3, 100)
    const higherFallback = market("higher-fallback", 4, 200)

    expect(
      rankMarketsByActivity(
        [lowerRecent, lowerFallback, higherRecent, higherFallback],
        false,
        NOW,
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual([
      "higher-recent",
      "lower-recent",
      "higher-fallback",
      "lower-fallback",
    ])
  })

  it("retains the existing ten-year activity window on testnets", () => {
    const active = market("active", 1, 3000)
    const fallback = market("fallback", 2)

    expect(
      rankMarketsByActivity(
        [fallback, active],
        true,
        NOW,
        highestScoreFirst,
      ).map(({ id }) => id),
    ).toEqual(["active", "fallback"])
  })

  it("preserves every market when no market has qualifying activity", () => {
    const lower = market("lower", 1)
    const higher = market("higher", 2, 1000)

    expect(
      rankMarketsByActivity([lower, higher], false, NOW, highestScoreFirst).map(
        ({ id }) => id,
      ),
    ).toEqual(["higher", "lower"])
  })
})
