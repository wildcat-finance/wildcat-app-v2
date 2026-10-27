import type { BorrowerAnalytics, BorrowerMarketRow, MetricValues } from "./api"
import { borrowerOverview } from "./borrowerOverview"
import { borrowerFixture } from "./storyFixtures"

const market = (
  values: MetricValues,
  state: BorrowerMarketRow["state"] = "Ok",
): BorrowerMarketRow => ({
  address: "0x1",
  name: "Example",
  symbol: "mUSD",
  state,
  values,
})
const data = (
  values: MetricValues = {},
  markets: BorrowerMarketRow[] = [],
  partial = false,
): BorrowerAnalytics => ({
  ...borrowerFixture,
  values,
  markets,
  partial,
  comparisons: {},
})
const card = (borrower: BorrowerAnalytics, key: string) =>
  borrowerOverview(borrower).summary.find((item) => item.key === key)!

describe("compact borrower overview", () => {
  it("does not present a perfect book before any history is recorded", () => {
    const histories = [undefined, 0]
    histories.forEach((life) => {
      const values = {
        S01: 1,
        S05: 100,
        D21: 100,
        ...(life === undefined ? {} : { MARKET_DAYS: life }),
      }
      const cash = card(data(values, [market({ H02: 0 })]), "3.1").card
      expect(cash.value).toBeUndefined()
      expect(cash.detail?.value).toBe("not available")
    })
    const perfect = card(
      data({ S01: 1, S05: 100, D21: 100, MARKET_DAYS: 1 }, [
        market({ H02: 0 }),
      ]),
      "3.1",
    ).card
    expect(perfect.value).toBe("100%")
    expect(perfect.verdict).toBe("LIMITED")
    expect(
      card(
        data({ S01: 1, S05: 100, MARKET_DAYS: 1 }, [market({ H02: 1 })]),
        "3.1",
      ).card.verdict,
    ).toBeUndefined()
  })

  it("keeps partial and unknown state coverage visible even when known markets have penalties", () => {
    const borrower = data(
      {},
      [market({ M77: "Open", M21: 0, M85: 1 }), market({}, "UnderReview")],
      true,
    )
    const current = card(borrower, "3.4")
    expect(current.card.state).toEqual({ word: "Penalty active", tone: "bad" })
    expect(current.card.detail?.value).toBe("1 / 2 · partial")
    expect(current.panel?.numbers).toContainEqual(["Unavailable states", "1"])
    expect(
      card(data({}, [market({ M77: "Open", M21: 0, M85: 0 })], true), "3.4")
        .card.state?.word,
    ).toBe("Incomplete")
    expect(card(data({}, [], true), "3.4").card.detail?.value).toBe(
      "Partial coverage",
    )
  })

  it("does not turn no finished incidents or unknown counts into a measured zero cure time", () => {
    const none = card(data({ S12: 1, D16: 0 }, [market({ M20: 0 })]), "3.8")
    expect(none.card.detail?.value).toBe("No finished incidents")
    expect(none.panel?.numbers).toContainEqual([
      "Mean finished-incident duration",
      "No finished incidents",
    ])
    const unknown = card(data({ S12: 1, D16: 0 }, [market({})]), "3.8")
    expect(unknown.card.detail?.value).toBe("not available")
    expect(unknown.panel?.numbers).toContainEqual([
      "Mean finished-incident duration",
      "not available",
    ])
    expect(
      card(data({ D16: 0 }, [market({ M20: 1 })]), "3.8").card.detail?.value,
    ).toBe("0 h")
    expect(
      card(data({ D16: 0 }, [market({ M20: 0 })], true), "3.8").card.detail
        ?.value,
    ).toBe("not available")
  })

  it("distinguishes no closures and no deadlines from missing metrics", () => {
    const empty = data({ S30: 0, S33: 0, S14: 0, S15: 0, S16: 0 })
    expect(card(empty, "3.6").card.word).toBe("None yet")
    expect(card(empty, "3.6").card.detail?.value).toBe("0")
    expect(card(empty, "3.3").card.value).toBeUndefined()
    expect(card(empty, "3.3").card.word).toBe("no exit history yet")
    expect(card(empty, "3.3").card.detail?.value).toBe("None yet")
    expect(card(data(), "3.6").card.word).toBe("not available")
    expect(card(data(), "3.3").card.detail?.value).toBe("not available")
  })
})
