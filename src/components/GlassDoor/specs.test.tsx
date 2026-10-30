import * as React from "react"

// Test-only dependency; the repository's global import rule has no test override.
// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen } from "@testing-library/react"

import type {
  BorrowerAnalytics,
  BorrowerMarketRow,
  MarketAnalytics,
  MetricValues,
} from "./api"
import { bookState, borrowerSpecs, lateShareRows } from "./borrowerSpecs"
import { WorstIncidentBars } from "./charts"
import { tokens, units } from "./format"
import { borrowerPosition, marketSpecs } from "./marketSpecs"
import { verdictExits, verdictInOrder, verdictWorstIncident } from "./rules"

const publication: MarketAnalytics["publication"] = {
  id: "publication-1",
  kind: "Intraday",
  day: null,
  publishedAt: null,
  cut: { block: 100, hash: "0xabc", timestamp: 1_790_000_000 },
}

const market = (values: MetricValues = {}): MarketAnalytics => ({
  publication,
  market: { chainId: 1, address: "0xAbC", name: "Example", symbol: "mUSD" },
  state: "Ok",
  reason: null,
  values,
  comparisons: {},
  protocol: null,
  flags: {},
})

const borrower = (
  values: MetricValues = {},
  markets: BorrowerMarketRow[] = [],
  partial = false,
): BorrowerAnalytics => ({
  publication,
  borrower: { chainId: 1, address: "0xdef" },
  state: "Ok",
  reason: null,
  partial,
  values,
  comparisons: {},
  protocol: null,
  markets,
})

const row = (
  address: string,
  values: MetricValues,
  state: BorrowerMarketRow["state"] = "Ok",
): BorrowerMarketRow => ({
  address,
  name: address,
  symbol: address,
  state,
  values,
})

const card = (values: MetricValues, id: string) => {
  const { rowA, supporting } = marketSpecs(market(values))
  return [...rowA, ...supporting].find((spec) => spec.id === id)!
}
const bookCard = (data: BorrowerAnalytics, id: string) =>
  borrowerSpecs(data).find((spec) => spec.id === id)!

describe("verdict rules from the design handoff", () => {
  it("grades In order by score, trend, staleness and evidence", () => {
    expect(verdictInOrder({ score: 92.1, trend: -2.3, days: 2257 })).toBe(
      "STRONG",
    )
    expect(verdictInOrder({ score: 82.6, days: 525 })).toBe("WATCH")
    expect(verdictInOrder({ score: 90, trend: -10.5, days: 525 })).toBe("WATCH")
    expect(verdictInOrder({ score: 99, days: 525, stale: true })).toBe("WATCH")
    expect(verdictInOrder({ score: 69.9, days: 525 })).toBe("PROBLEM")
    expect(verdictInOrder({ score: 100, days: 30 })).toBe("LIMITED")
    expect(verdictInOrder({ days: 30 })).toBeNull()
  })

  it("grades worst incident and exits by the spec's bands", () => {
    expect(verdictWorstIncident(113.7)).toBe("PROBLEM")
    expect(verdictWorstIncident(60)).toBe("WATCH")
    expect(verdictWorstIncident(59.9)).toBe("STRONG")
    expect(verdictExits({ pct: 83, deadlines: 323 })).toBe("WATCH")
    expect(verdictExits({ pct: 100, deadlines: 3 })).toBe("LIMITED")
    expect(verdictExits({ pct: 0, deadlines: 0 })).toBeNull()
  })
})

describe("market cards", () => {
  it("preserves subunit token balances instead of presenting zero", () => {
    expect(tokens(0.00000001)).toBe("<0.000001")
    expect(units(1234.56789)).toBe("1,235")
    expect(units(40.452187)).toBe("40.4522")
    expect(units(0)).toBe("0")
  })

  it("keeps missing metrics unknown instead of healthy or empty", () => {
    const { rowA, supporting } = marketSpecs(market())
    ;[...rowA, ...supporting].forEach((spec) => {
      expect(spec.verdict).toBeNull()
      expect(spec.state ?? "neutral").toBe("neutral")
      expect(spec.value).not.toMatch(/^(0|100)(\.0)?%?$/)
    })
  })

  it("distinguishes an observed zero from missing data", () => {
    expect(card({ M11: 0 }, "2.5").value).toBe("0.00%")
    expect(card({ M30: 0, M31: 0, M32: 0 }, "2.3").value).toBe(
      "no exit history yet",
    )
    expect(card({ M48: 0, M49: 0 }, "2.9").value).toBe("no lenders yet")
    expect(card({ M06: 0, M86: 0 }, "2.6").value).toBe("no deposit capacity")
    expect(card({ M11: 0, M39: 0, M41: 0 }, "2.5").formula).toContain(
      "no yield history yet",
    )
  })

  it("says never late only from an exact zero and gates thin evidence", () => {
    const thin = card({ H01: 86_400, H02: 0, M18: 100, M05: 1 }, "2.1")
    expect(thin.value).toBe("never late")
    expect(thin.verdict).toBe("LIMITED")
    const rounded = card({ H01: 86_400, H02: 1, M18: 99.999, M05: 1 }, "2.1")
    expect(rounded.value).toBe("100.0")
    expect(rounded.verdict).toBe("LIMITED")
  })

  it("does not show a perfect record before any time is recorded", () => {
    const spec = card({ H01: 0, H02: 0, M18: 100, M26: 0, M05: 0 }, "2.1")
    expect(spec.value).toBe("no recorded history")
    expect(spec.verdict).toBeNull()
    expect(spec.sub).not.toMatch(/contract kept/)
    expect(spec.chart?.expanded).toBeUndefined()
  })

  it("keeps cash shortage separate from longer rolling penalty time", () => {
    const spec = card({ H01: 100, H02: 10, M18: 90, M26: 20, M05: 1 }, "2.1")
    expect(spec.sub).toBe("contract kept: 80.0 · clean so far, barely tested")
    render(<div>{spec.chart?.expanded}</div>)
    expect(screen.getByText("in order 90%")).toBeTruthy()
    expect(screen.getByText("past allowance 20.00%")).toBeTruthy()
    expect(screen.getByText(/outlasted the shortfall/)).toBeTruthy()
  })

  it("keeps contract kept below 100 unless no penalty time was charged", () => {
    expect(card({ H01: 100, H02: 1, M18: 99, M26: 0.04 }, "2.1").sub).toBe(
      "contract kept: 99.96",
    )
  })

  it("retains missed deadlines when their later funding is unknown", () => {
    const spec = card({ M30: 10, M31: 8, M32: 80 }, "2.3")
    render(<div>{spec.chart?.expanded}</div>)
    expect(
      screen.getByRole("img", {
        name: "fully funded on the deadline (M31) 8; not covered on the day 2",
      }),
    ).toBeTruthy()
    expect(spec.formula).toContain("split not available (D18)")
  })

  it("splits missed deadlines when D18 adds up", () => {
    const spec = card(
      { M30: 10, M31: 8, M32: 80, D18_LATE: 2, D18_NEVER: 0 },
      "2.3",
    )
    expect(spec.formula).toContain("paid late 2 / never paid 0 (D18)")
    expect(spec.verdict).toBe("WATCH")
  })

  it("does not divide a worst incident by a zero grace period", () => {
    const spec = card(
      { H01: 100, H02: 10, M15: 0, M23: 4, M24: 0, M20: 1 },
      "2.2",
    )
    expect(spec.value).toBe("4 h")
    expect(spec.verdict).toBeNull()
    expect(spec.chart?.expanded).toBeUndefined()
    expect(spec.formula).toContain("share of the allowance is undefined")
  })

  it("draws the worst incident against its own allowance", () => {
    render(
      <WorstIncidentBars
        rows={[{ label: "wmtUSDC", hours: 54.6, graceHours: 48 }]}
      />,
    )
    expect(screen.getByText("113.8% (54.6 of 48 h)")).toBeTruthy()
  })

  it("calls a residual penalty past the allowance without a cash shortfall", () => {
    const spec = card(
      { M77: "Open", M21: 0, M85: 1, D05: "6.5 h past grace", M37: 1 },
      "2.4",
    )
    expect(spec.value).toBe("PAST ALLOWED LATENESS")
    expect(spec.state).toBe("red")
    expect(spec.sub).toBe("by 6.5 h · 1 exit waiting")
    expect(spec.numbers).toContain("late within grace now no (M21)")
  })

  it("shows a countdown or cure age only where the live state supports it", () => {
    expect(
      card({ M77: "Open", M21: 1, M85: 0, D05: 4, M15: 48 }, "2.4").sub,
    ).toBe("4 h of 48 h left")
    const clear = card(
      {
        M77: "Open",
        M21: 0,
        M85: 0,
        D05: "no countdown (not late)",
        M20: 1,
        M84: 0.5,
      },
      "2.4",
    )
    expect(clear.value).toBe("ALL IN ORDER")
    expect(clear.sub).toBe("last incident cured 0.5 d ago")
    expect(clear.numbers).toContain("grace countdown: none, not late (D05)")
    const closed = card({ M77: "Closed", M21: 1, M85: 1, D05: 6 }, "2.4")
    expect(closed.value).toBe("FINISHED")
    expect(closed.numbers).toContain("grace countdown: none, finished (D05)")
    expect(card({ M77: "Open" }, "2.4").value).toBe("NOT AVAILABLE")
  })

  it("flags penalty-funded yield only above the spec's 5% threshold", () => {
    expect(card({ M11: 8.5, M41: 100, M27: 6, M42: 6 }, "2.5").flag).toBe(
      "yield partly from penalties",
    )
    expect(
      card({ M11: 8.5, M41: 100, M27: 1, M42: 1 }, "2.5").flag,
    ).toBeUndefined()
  })

  it("hides how the line is used for a finished market", () => {
    expect(
      marketSpecs(market({ M77: "Closed" })).supporting.map((spec) => spec.id),
    ).toEqual(["2.8", "2.9", "2.10"])
  })

  it("compares the same publication only and gives tied markets equal places", () => {
    const data = borrower({}, [
      row("0xabc", { M18: 90 }),
      row("0x123", { M18: 90 }),
    ])
    expect(borrowerPosition(market({ M18: 90 }), data)?.word).toBe(
      "joint strongest",
    )
    expect(
      borrowerPosition(market({ M18: 90 }), {
        ...data,
        publication: { ...publication, id: "old" },
      }),
    ).toBeUndefined()
  })

  it("draws a rank only where this market is graded", () => {
    const graded = marketSpecs({
      ...market({ H01: 100, H02: 10, M18: 90 }),
      comparisons: { M18: { median: 95, population: 63, betterThan: 9 } },
    }).rowA[0]
    expect(graded.chips.markets).toBe("better than 9 of 63 graded markets")
    expect(graded.chipCharts?.markets).toBeTruthy()
    const ungraded = marketSpecs({
      ...market({ H01: 100, H02: 10, M18: 90 }),
      comparisons: { M18: { median: 95, population: 63 } },
    }).rowA[0]
    expect(ungraded.chipCharts?.markets).toBeUndefined()
  })
})

describe("borrower cards", () => {
  it("does not present a perfect book before any history is recorded", () => {
    const empty = bookCard(
      borrower({ S01: 1, S05: 100, D21: 100, MARKET_DAYS: 0 }, [
        row("a", { H02: 0 }),
      ]),
      "3.1",
    )
    expect(empty.value).toBe("no recorded history")
    expect(empty.verdict).toBeNull()
    const rounded = bookCard(
      borrower({ S01: 1, S05: 100, MARKET_DAYS: 10 }, [row("a", { H02: 1 })]),
      "3.1",
    )
    expect(rounded.value).toBe("100.0")
  })

  it("does not declare a partial book all clear", () => {
    const data = borrower(
      { S01: 2 },
      [row("a", { M77: "Open", M21: 0, M85: 0 }), row("b", {}, "UnderReview")],
      true,
    )
    expect(bookState(data)).toMatchObject({
      tone: "neutral",
      label: "INCOMPLETE",
    })
    data.markets[0].values.M85 = 1
    expect(bookState(data)).toMatchObject({
      tone: "red",
      label: "1 MARKET PAST ALLOWANCE",
    })
  })

  it("does not sum debts across different assets", () => {
    const data = borrower({ S18: 2, S35: 105, S36: 0 }, [
      row("usd", { M77: "Open", M21: 1, M85: 0, M07: 100, M02: "USDC" }),
      row("eth", { M77: "Open", M21: 1, M85: 0, M07: 5, M02: "WETH" }),
    ])
    const spec = bookCard(data, "3.4")
    expect(spec.value).toBe("2 MARKETS LATE, WITHIN ALLOWANCE")
    expect(spec.sub).toContain("not summed")
    expect(`${spec.sub} ${spec.formula}`).not.toContain("105")
    expect(spec.numbers).toContain(
      "usd late, within grace, owes 100 USDC (M07)",
    )
  })

  it("sums debts that share one asset", () => {
    const data = borrower({ S18: 1, S35: 100, S36: 0 }, [
      row("usd", { M77: "Open", M21: 1, M85: 0, M07: 100, M02: "USDC" }),
      row("usd2", { M77: "Open", M21: 0, M85: 0, M07: 5, M02: "USDC" }),
    ])
    expect(bookCard(data, "3.4").sub).toBe(
      "100 USDC whole-market debt within allowance · 0 past allowance",
    )
  })

  it("does not turn no finished incidents into a zero cure time", () => {
    const none = bookCard(
      borrower({ S12: 1, D16: 0 }, [row("a", { M20: 0 })]),
      "3.8",
    )
    expect(none.formula).toContain(
      "Typical cure time, all markets (D16) = no incidents yet",
    )
    const unknown = bookCard(
      borrower({ S12: 1, D16: 0 }, [row("a", {})]),
      "3.8",
    )
    expect(unknown.formula).toContain("(D16) = not available")
  })

  it("reads the longest episode against that market's own allowance", () => {
    const spec = bookCard(
      borrower({ D15: 54.6 / 24, S12: 3 }, [
        row("wmtUSDC", { M23: 54.6, M15: 48 }),
        row("wmtWBTC", { M23: 12, M15: 48 }),
      ]),
      "3.8",
    )
    expect(spec.compare).toBe("longest incident 54.6 h against 48 h")
    expect(spec.value).toBe("breaches TBD")
  })

  it("distinguishes no closures from missing metrics", () => {
    expect(bookCard(borrower({ S30: 0, S33: 0 }), "3.6").value).toBe(
      "none completed yet",
    )
    expect(bookCard(borrower(), "3.6").value).toBe("not available")
  })

  it("excludes unknown histories from the late-share chart", () => {
    expect(
      lateShareRows(
        borrower({}, [
          row("unknown", { H01: 100 }),
          row("review", { H01: 100, H02: 1 }, "UnderReview"),
        ]),
      ),
    ).toEqual([])
  })
})

describe("states the review found", () => {
  it("keeps a still-open episode in the worst incident and incident history", () => {
    const values = {
      H01: 40_415_556,
      H02: 34_049_880,
      M15: 72,
      M20: 0,
      M21: 0,
      M85: 1,
      M23: 9458.3,
      M24: 13_136.5,
      M69: 0,
      M70: 0,
      M71: 0,
      M72: 0,
    }
    const worst = card(values, "2.2")
    expect(worst.value).toBe("13,136.5%")
    expect(worst.verdict).toBe("PROBLEM")
    const history = card(values, "2.8")
    expect(history.value).toBe("1")
    expect(history.sub).toBe("incident, 1 still open")
    expect(history.chips.markets).toBe("not ranked: no finished episode yet")
  })

  it("counts an open episode beside the finished ones", () => {
    const history = card(
      {
        H01: 100,
        H02: 10,
        M20: 1,
        M21: 1,
        M85: 0,
        M22: 12.4,
        M69: 0,
        M70: 1,
        M71: 0,
        M72: 0,
      },
      "2.8",
    )
    expect(history.value).toBe("2")
    expect(history.sub).toBe(
      "incidents, 1 still open · typical 12.4 h · 100% of finished cured within a day",
    )
  })

  it("calls a never-late market never late, not incident-free by count", () => {
    const worst = card(
      { H01: 100, H02: 0, M20: 0, M23: 0, M24: 0, M15: 48 },
      "2.2",
    )
    expect(worst.value).toBe("never late")
    expect(worst.verdict).toBe("STRONG")
  })

  it("shows what a finished market earned, not its zeroed rate", () => {
    const pays = card({ M77: "Closed", M11: 0, M39: 3.6, M41: 100 }, "2.5")
    expect(pays.value).toBe("3.60%")
    expect(pays.flag).toBe("FINISHED")
    const graded = card(
      { M77: "Closed", H01: 100, H02: 1, M18: 99, M05: 200 },
      "2.1",
    )
    expect(graded.verdict).toBeNull()
    expect(graded.sub).toContain("frozen at closure · 200 days recorded")
  })

  it("says a market with no lenders has none, rather than 0 of 0", () => {
    const funds = card({ M48: 0, M49: 0, M51: 0, D10: 0 }, "2.9")
    expect(funds.value).toBe("no lenders yet")
    expect(funds.sub).toBe("")
  })

  it("ranks funded markets only and names a single-market borrower", () => {
    const own = row("0xabc", { M18: 41.7, H01: 100, M49: 3 })
    const data = borrower({ S01: 2 }, [
      own,
      row("0x123", { M18: 53, H01: 100, M49: 2 }),
      row("0x999", { M18: 100, H01: 0, M49: 0 }),
    ])
    const spec = marketSpecs(market({ M18: 41.7, H01: 100 }), data)
    expect(spec.banner).toBe(
      "This is this borrower's weakest market — their 2 markets: 41.7 to 53.0.",
    )
    const single = marketSpecs(
      market({ M18: 41.7, H01: 100 }),
      borrower({ S01: 1 }, [own]),
    )
    expect(single.rowA[0].chips.borrower).toBe(
      "single-market borrower — no spread to show",
    )
  })

  it("lets money lead completed facilities when the assets match", () => {
    const data = borrower(
      { S30: 2, S31: 492_661, S33: 2, S34: 2, MARKET_DAYS: 300, S32: 40 },
      [
        row("a", { M77: "Closed", M02: "USDC", M49: 4, H01: 100, M05: 60 }),
        row("b", { M77: "Closed", M02: "USDC", M49: 2, H01: 100, M05: 60 }),
      ],
    )
    const spec = bookCard(data, "3.6")
    expect(spec.value).toBe("492,661 USDC")
    expect(spec.sub).toBe(
      "through 2 completed facilities · 2 verified · 2 clean",
    )
  })

  it("phrases mixed-asset debt as not summed", () => {
    const data = borrower({ S18: 2, S35: 105, S36: 0 }, [
      row("usd", { M77: "Open", M21: 1, M85: 0, M07: 100, M02: "USDC" }),
      row("eth", { M77: "Open", M21: 1, M85: 0, M07: 5, M02: "WETH" }),
    ])
    expect(bookCard(data, "3.4").sub).toBe(
      "debt of 2 markets within allowance, not summed (different assets) · 0 past allowance",
    )
  })

  it("puts a narrow fill's label below the bar", () => {
    const line = card({ M06: 100, M86: 0.7, M07: 1 }, "2.6")
    const { container } = render(<div>{line.chart?.expanded}</div>)
    expect(container.querySelector('[class*="chFillLabelled"]')).toBeNull()
    expect(screen.getByText(/^0\.7% of 100/)).toBeTruthy()
  })
})
