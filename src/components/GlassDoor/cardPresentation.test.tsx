import * as React from "react"

// Test-only dependency; the repository's global import rule has no test override.
// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen } from "@testing-library/react"

import { BorrowerAnalytics, MarketAnalytics, MetricValues } from "./api"
import { borrowerCards, borrowerNow, troubleOverTime } from "./borrowerCards"
import { rankChart } from "./charts"
import { tokens } from "./format"
import { marketCards, borrowerPosition } from "./marketCards"

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

const borrower = (values: MetricValues = {}): BorrowerAnalytics => ({
  publication,
  borrower: { chainId: 1, address: "0xdef" },
  state: "Ok",
  reason: null,
  partial: false,
  values,
  comparisons: {},
  protocol: null,
  markets: [],
})

const row = (address: string, values: MetricValues) => ({
  address,
  name: address,
  symbol: address,
  state: "Ok" as const,
  values,
})

describe("published analytics presentation", () => {
  it("preserves subunit token balances instead of presenting zero", () => {
    expect(tokens(0.4)).toBe("0.4")
    expect(tokens(0.00000001)).toBe("<0.000001")
    expect(tokens(-0.4)).toBe("−0.4")
    expect(tokens(0)).toBe("0")
    expect(tokens(1234.56789)).toBe("1,234.56789")
  })
  it("keeps missing metrics unknown instead of displaying a healthy or empty history", () => {
    const cards = marketCards(market())
    ;[...cards.rowA, ...cards.supporting].forEach(({ card }) => {
      expect(card.value).toBeUndefined()
      expect(card.verdict).toBeUndefined()
      expect(card.state?.tone ?? "neutral").toBe("neutral")
    })
    const book = borrowerCards(borrower()).rowA[0].card
    expect(book.word).toBe("not available")
    expect(book.value).toBeUndefined()
  })

  it("distinguishes an observed zero from missing data", () => {
    const cards = marketCards(
      market({ M11: 0, M30: 0, M31: 0, M32: 0, M48: 0 }),
    )
    expect(cards.rowA.find(({ key }) => key === "2.5")!.card.value).toBe("0%")
    expect(cards.rowA.find(({ key }) => key === "2.3")!.card.word).toBe(
      "no exit history yet",
    )
    expect(cards.supporting.find(({ key }) => key === "2.9")!.card.value).toBe(
      "0",
    )
    expect(
      cards.rowA.flatMap(({ panel }) => panel?.formula ?? []).join(" "),
    ).not.toMatch(/NaN|Infinity|\/ 0 /)
  })

  it("uses exact cash history to say never late and gates thin evidence", () => {
    const thin = marketCards(market({ H01: 86_400, H02: 0, M18: 100, M05: 1 }))
      .rowA[0].card
    expect(thin.word).toBe("never late")
    expect(thin.verdict).toBe("LIMITED")
    const rounded = marketCards(
      market({ H01: 86_400, H02: 1, M18: 99.999, M05: 1 }),
    ).rowA[0].card
    expect(rounded.value).toBe("100.0")
    expect(rounded.word).not.toBe("never late")
    expect(rounded.verdict).toBeUndefined()
  })

  it("does not display a perfect record before any time has been recorded", () => {
    const { card } = marketCards(
      market({ H01: 0, H02: 0, M18: 100, M26: 0, M05: 0 }),
    ).rowA[0]
    expect(card.value).toBeUndefined()
    expect(card.word).toBe("no recorded history")
    expect(card.sub).not.toContain("Contract kept")
    expect(card.chart).toBeUndefined()
  })

  it("does not treat a rounded book score as proof that no market was late", () => {
    const data = borrower({ S05: 100, MARKET_DAYS: 10, S01: 1 })
    data.markets = [row("a", { H02: 1 })]
    expect(borrowerCards(data).rowA[0].card.word).not.toBe("never late")
  })

  it("keeps cash shortage separate from longer rolling penalty time", () => {
    const data = market({ H01: 100, H02: 10, M18: 90, M26: 20, M05: 1 })
    const panel = marketCards(data).rowA[0].panel!
    render(<div>{panel.chart}</div>)
    expect(screen.getByText("Cash available 90%")).toBeTruthy()
    expect(screen.getByText("Cash short 10%")).toBeTruthy()
    expect(screen.queryByText(/within grace/i)).toBeNull()
    expect(panel.numbers).toContainEqual(["Time under penalty", "20.00%"])
  })

  it("retains missed deadlines when their later funding status is unknown", () => {
    const data = market({
      M30: 10,
      M31: 8,
      M32: 80,
      D18_LATE: "",
      D18_NEVER: "",
    })
    const panel = marketCards(data).rowA.find(({ key }) => key === "2.3")!
      .panel!
    render(<div>{panel.chart}</div>)
    expect(screen.getByText("On time 8")).toBeTruthy()
    expect(screen.getByText("Missed deadline 2")).toBeTruthy()
    expect(screen.queryByText(/Still unpaid 0/)).toBeNull()
  })

  it("does not divide a worst incident by a zero grace period", () => {
    const card = marketCards(market({ M15: 0, M23: 4, M24: 0, M20: 1 })).rowA[1]
    expect(card.card.value).toBe("4 h")
    expect(card.card.chart).toBeUndefined()
    expect(card.panel!.formula.join(" ")).toContain(
      "percentage of the allowance is undefined",
    )
  })

  it("calls a residual penalty active without asserting a current cash shortfall", () => {
    const card = marketCards(
      market({ M77: "Open", M21: 0, M85: 1, D05: "6 h past grace" }),
    ).rowA.find(({ key }) => key === "2.4")!
    expect(card.card.state).toEqual({ word: "PENALTY ACTIVE", tone: "bad" })
    expect(card.panel!.meaning).toContain("after cash is restored")
  })

  it("does not declare a partial book all clear", () => {
    const data = borrower({ S01: 2 })
    data.partial = true
    data.markets = [
      row("a", { M77: "Open", M21: 0, M85: 0 }),
      { ...row("b", {}), state: "UnderReview" },
    ]
    const now = borrowerNow(data)
    expect(now.state).toEqual({ word: "INCOMPLETE", tone: "neutral" })
    expect(now.unknown).toBe(1)
    data.markets[0].values.M85 = 1
    expect(borrowerNow(data).state.tone).toBe("bad")
  })

  it("presents affected debts by market and asset rather than a mixed-asset total", () => {
    const data = borrower({ S35: 105, S36: 0 })
    data.markets = [
      row("usd", { M77: "Open", M21: 1, M85: 0, M07: 100, M02: "USDC" }),
      row("eth", { M77: "Open", M21: 1, M85: 0, M07: 5, M02: "WETH" }),
    ]
    const numbers = borrowerCards(data).rowA.find(({ key }) => key === "3.4")!
      .panel!.numbers!
    expect(numbers).toContainEqual(["usd total debt", "100 USDC"])
    expect(numbers).toContainEqual(["eth total debt", "5 WETH"])
    expect(numbers.some(([, value]) => value.includes("105"))).toBe(false)
  })

  it("only compares matching publications and gives tied markets equal positions", () => {
    const data = borrower()
    data.markets = [row("0xabc", { M18: 90 }), row("0x123", { M18: 90 })]
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

  it("states the longest shortfall's headroom against the allowance", () => {
    const values = { H01: 100, H02: 10, M15: 48, M20: 1 }
    const past = marketCards(market({ ...values, M23: 54.6 })).rowA[1]
    render(<div>{past.card.chart}</div>)
    expect(screen.getByText("6.6 h past the allowance")).toBeTruthy()
    const inside = marketCards(market({ ...values, M23: 12 })).rowA[1]
    render(<div>{inside.card.chart}</div>)
    expect(screen.getByText("36 h inside the allowance")).toBeTruthy()
  })

  it("draws a market with an unavailable state as an outline, not in order", () => {
    const data = borrower()
    data.markets = [
      row("a", { M77: "Open", M21: 0, M85: 0 }),
      { ...row("b", {}), state: "UnderReview" },
    ]
    const card = borrowerCards(data).rowA.find(({ key }) => key === "3.4")!
    render(<div>{card.card.chart}</div>)
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "In order 1; State unavailable 1",
    )
  })

  it("draws a rank only where this one is graded", () => {
    expect(rankChart(undefined, "markets")).toBeUndefined()
    expect(rankChart({ median: 90, population: 63 }, "markets")).toBeUndefined()
    render(
      <div>
        {rankChart({ median: 90, population: 63, betterThan: 9 }, "markets")}
      </div>,
    )
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Better than 9 of 63 graded markets",
    )
  })

  it("excludes unknown histories from the cash-short chart", () => {
    const data = borrower()
    data.markets = [
      row("unknown", { H01: 100 }),
      { ...row("review", { H01: 100, H02: 1 }), state: "UnderReview" },
    ]
    expect(troubleOverTime(data).concentration).toBeNull()
  })
})
