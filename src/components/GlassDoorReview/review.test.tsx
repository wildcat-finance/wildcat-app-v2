/* eslint-disable import/no-extraneous-dependencies */
import * as React from "react"

import "@testing-library/jest-dom"
import { fireEvent, render, screen, within } from "@testing-library/react"

import { marketSpecs } from "@/components/GlassDoor/marketSpecs"
import {
  borrowerFixture,
  marketFixture,
} from "@/components/GlassDoor/storyFixtures"
import {
  BREACH_RECOUNT,
  CARDS,
  METRIC_NAMES,
} from "@/components/GlassDoor/wording"
import {
  BORROWER_COMPARISONS,
  MARKET_COMPARISONS,
  OPEN_MARKET_COMPARISONS,
} from "@/lib/glassdoor/pipeline/comparisons"

import { SPEC_METRICS } from "./catalogue"
import {
  CHART_INPUTS,
  COMPARED,
  designDefault,
  designRole,
  HEADLINES,
} from "./design"
import { reviewEnabled } from "./gate"
import { MetricItem } from "./MetricItem"
import {
  cardNumbers,
  comparisonText,
  findMetric,
  metricsIn,
  ReviewData,
  reviewReason,
  shownValue,
} from "./metrics"
import {
  countsText,
  DISPLAY_OPTIONS,
  isDefault,
  loadToggles,
  resetOptions,
  saveToggles,
  setOption,
  STORAGE_KEY,
  summary,
  summaryText,
} from "./options"

// Temporary: the metric review page (product#917). Remove with the page.

const spec = (id: string) => SPEC_METRICS.find((metric) => metric.id === id)!

const ok: ReviewData = {
  market: { status: "ok", data: marketFixture },
  borrower: { status: "ok", data: borrowerFixture },
}

const memoryStore = () => {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
    removeItem: (key: string) => {
      items.delete(key)
    },
  }
}

describe("metric catalogue", () => {
  it("carries every metric of the spec under its spec name", () => {
    const ids = SPEC_METRICS.map((metric) => metric.id)
    expect(ids).toHaveLength(91)
    expect(new Set(ids).size).toBe(91)
    expect([...ids].sort()).toEqual(Object.keys(METRIC_NAMES).sort())
    SPEC_METRICS.forEach((metric) => {
      expect(metric.name).toBe(METRIC_NAMES[metric.id])
      ;["what", "where", "how", "unit", "example"].forEach((field) =>
        expect(metric[field as keyof typeof metric]).not.toBe(""),
      )
      expect(metric.cards.length).toBeGreaterThan(0)
    })
  })

  it("splits the metrics into the two groups", () => {
    const borrower = metricsIn("borrower").map((metric) => metric.id)
    expect(borrower).toHaveLength(26)
    expect(borrower.filter((id) => !id.startsWith("S"))).toEqual([
      "D11",
      "D15",
      "D16",
      "D21",
    ])
    expect(metricsIn("market")).toHaveLength(65)
  })

  it("only names cards that exist, besides 3.12", () => {
    const cards = new Set(SPEC_METRICS.flatMap(cardNumbers))
    cards.forEach((card) => {
      if (card !== "3.12") expect(CARDS[card]).toBeDefined()
    })
  })
})

describe("values and TBD reasons", () => {
  it("formats a published value by its unit", () => {
    expect(shownValue(spec("M11"), ok)).toMatchObject({
      kind: "value",
      text: "8.50%",
    })
  })

  it("keeps a metric without data listed with its reason", () => {
    expect(shownValue(spec("M25"), ok)).toEqual({
      kind: "tbd",
      reason: BREACH_RECOUNT,
    })
    expect(shownValue(spec("D11"), ok)).toMatchObject({ kind: "tbd" })
    expect(
      shownValue(spec("M21"), { ...ok, market: { status: "none" } }),
    ).toEqual({ kind: "tbd", reason: "TBD: select a market" })
    const review: ReviewData = {
      ...ok,
      market: {
        status: "ok",
        data: { ...marketFixture, state: "UnderReview", values: {} },
      },
    }
    expect(shownValue(spec("M18"), review)).toEqual({
      kind: "tbd",
      reason: "TBD: this market is under review, so its values are withheld",
    })
    // The reason shows once per group, not in every box.
    expect(reviewReason(review.market)).toBeUndefined()
    expect(
      reviewReason({
        status: "ok",
        data: { ...marketFixture, state: "UnderReview", reason: "gate failed" },
      }),
    ).toBe("gate failed")
    const missing: ReviewData = {
      ...ok,
      market: {
        status: "ok",
        data: { ...marketFixture, values: { M18: 82.6, M84: "" } },
      },
    }
    expect(shownValue(spec("M20"), missing)).toEqual({
      kind: "tbd",
      reason: "TBD: not in the current publication",
    })
    expect(shownValue(spec("M84"), missing)).toEqual({
      kind: "tbd",
      reason: "TBD: no value published for this market",
    })
  })

  it("states the published comparison or that there is none", () => {
    expect(comparisonText(spec("M18"), ok)).toBe(
      "median 97.5 across 63 graded markets; better than 9 of 63 graded markets",
    )
    expect(comparisonText(spec("M77"), ok)).toBe(
      "TBD: no comparison is published for this metric",
    )
  })
})

describe("design defaults", () => {
  it("come from the handoff's cards and charts and the compared metrics", () => {
    const ids = new Set(SPEC_METRICS.map((metric) => metric.id))
    ;[...Object.values(HEADLINES), ...Object.values(CHART_INPUTS)]
      .flat()
      .forEach((id) => expect(ids.has(id)).toBe(true))
    expect([...COMPARED].sort()).toEqual(
      Object.keys({
        ...MARKET_COMPARISONS,
        ...OPEN_MARKET_COMPARISONS,
        ...BORROWER_COMPARISONS,
      })
        .filter((id) => id !== "MARKET_DAYS")
        .sort(),
    )
  })

  it("start each metric from what the design shows for it", () => {
    expect(designDefault(spec("M18"))).toEqual([
      "value",
      "card",
      "chart",
      "comparison",
    ])
    expect(designDefault(spec("M05"))).toEqual(["value", "chart"])
    expect(designDefault(spec("S13"))).toEqual(["value", "card", "chart"])
    expect(designDefault(spec("M13"))).toEqual(["value"])
    expect(designDefault(spec("M01"))).toEqual(["value"])
    expect(designRole(spec("M05"))).toEqual({
      headline: [],
      supporting: ["2.1", "3.1"],
      charts: ["3.1"],
      compared: false,
      places: ["the page header"],
    })
  })
})

describe("toggle states", () => {
  it("survive a reload through storage, under their own key", () => {
    const store = memoryStore()
    const toggles = setOption({}, ["M21"], "comparison", true)
    expect(saveToggles(toggles, store)).toBe(true)
    expect(store.getItem(STORAGE_KEY)).toBe(
      '{"M21":["value","card","chart","comparison"]}',
    )
    expect(loadToggles(store)).toEqual(toggles)
  })

  it("fall back to defaults when storage is blocked or holds junk", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
    }
    expect(loadToggles(blocked)).toEqual({})
    expect(saveToggles({ M21: [] }, blocked)).toBe(false)
    const store = memoryStore()
    store.setItem(STORAGE_KEY, "not json")
    expect(loadToggles(store)).toEqual({})
    store.setItem(STORAGE_KEY, '{"M21":["chart","bogus"],"M18":"x"}')
    expect(loadToggles(store)).toEqual({ M21: ["chart"] })
  })

  it("list every metric and option on in the summary", () => {
    expect(countsText({})).toBe(
      "On: Value 91 · Card 18 · Chart 39 · Comparison 20. Changed from the design default: 0.",
    )
    let toggles = setOption({}, ["M21"], "chart", false)
    const borrowerIds = metricsIn("borrower").map((m) => m.id)
    DISPLAY_OPTIONS.forEach((option) => {
      toggles = setOption(toggles, borrowerIds, option.key, false)
    })
    const groups = summary(toggles)
    expect(groups[0].lines).toEqual([])
    expect(groups[0].off).toHaveLength(26)
    expect(groups[1].lines).toHaveLength(65)
    expect(groups[1].off).toEqual([])
    expect(groups[1].lines.find((line) => line.id === "M21")).toEqual({
      id: "M21",
      label: "Late within grace now (M21)",
      options: ["Value", "Card"],
      changed: true,
    })
    expect(groups[1].lines.find((line) => line.id === "M18")?.changed).toBe(
      false,
    )
    expect(countsText(toggles)).toBe(
      "On: Value 65 · Card 11 · Chart 30 · Comparison 13. Changed from the design default: 27.",
    )
    const text = summaryText(toggles, [
      "Reviewed against Wintermute · wmtUSDC.",
    ])
    expect(text).toContain(
      "(product#917)\nReviewed against Wintermute · wmtUSDC.\nOn: Value 65",
    )
    expect(text).toContain(
      "Borrower metrics (0 with an option on)\nNo display (26): Markets on Wildcat (S01); ",
    )
    expect(text).toContain(
      "- Late within grace now (M21): Value, Card (changed)",
    )
    expect(text).toContain(
      "- In order, cash there (M18): Value, Card, Chart, Comparison\n",
    )
    expect(isDefault(toggles, "M21")).toBe(false)
    expect(isDefault(resetOptions(toggles, ["M21"]), "M21")).toBe(true)
    expect(text).toContain("Market metrics (65 with an option on)")
    expect(text).toMatch(/No display \(0\): none$/)
  })

  it("find a metric by its label, id or name", () => {
    expect(findMetric("Late within grace now (M21)")).toBe("M21")
    expect(findMetric("m21")).toBe("M21")
    expect(findMetric("M1")).toBe("M01")
    expect(findMetric("(G4)")).toBe("G4")
    expect(findMetric("grace breaches")).toBe("M25")
    expect(findMetric("nothing like this")).toBeUndefined()
    expect(findMetric("  ")).toBeUndefined()
  })
})

describe("one metric", () => {
  it("shows the five parts in order and its displays as toggled", () => {
    const onToggle = jest.fn()
    const view = (on: ("value" | "card" | "chart" | "comparison")[]) => (
      <MetricItem
        metric={spec("M18")}
        on={on}
        data={ok}
        cards={{}}
        onToggle={onToggle}
        onReset={jest.fn()}
      />
    )
    const { rerender } = render(view(["value"]))
    const article = screen.getByRole("article", {
      name: /In order, cash there \(M18\)/,
    })
    expect(
      within(article)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual([
      "How it is calculated",
      "Comparison",
      "What it means",
      "What it tells you",
      "What it does not tell you",
    ])
    expect(within(article).getByText("82.6")).toBeInTheDocument()
    const rank = { name: "Better than 9 of 63 graded markets" }
    expect(within(article).queryByRole("img", rank)).toBeNull()
    fireEvent.click(within(article).getByLabelText("Comparison"))
    expect(onToggle).toHaveBeenCalledWith("M18", "comparison", true)
    rerender(view(["comparison"]))
    expect(within(article).queryByText("82.6")).toBeNull()
    expect(within(article).getByRole("img", rank)).toBeInTheDocument()
  })

  it("tags how the design shows it and resets to that default", () => {
    const onReset = jest.fn()
    const { rerender } = render(
      <MetricItem
        metric={spec("M18")}
        on={["value", "card", "chart", "comparison"]}
        data={ok}
        cards={{}}
        onToggle={jest.fn()}
        onReset={onReset}
      />,
    )
    const article = screen.getByRole("article", {
      name: "In order, cash there (M18)",
    })
    ;["Card 2.1 headline", "Chart 2.1", "Chart 3.1", "Compared"].forEach(
      (tag) => expect(within(article).getByText(tag)).toBeInTheDocument(),
    )
    expect(
      within(article).getByText("also on card 3.1 · the per-market table"),
    ).toBeInTheDocument()
    expect(within(article).queryByText("Reset to design")).toBeNull()
    rerender(
      <MetricItem
        metric={spec("M18")}
        on={["value"]}
        data={ok}
        cards={{}}
        onToggle={jest.fn()}
        onReset={onReset}
      />,
    )
    fireEvent.click(within(article).getByText("Reset to design"))
    expect(onReset).toHaveBeenCalledWith("M18")
  })

  it("opens a card's panel in its own row and closes it on Escape", () => {
    const { rowA } = marketSpecs(marketFixture, undefined)
    const cards = {
      market: Object.fromEntries(rowA.map((card) => [card.id, card])),
    }
    render(
      <MetricItem
        metric={spec("M18")}
        on={["card"]}
        data={ok}
        cards={cards}
        onToggle={jest.fn()}
        onReset={jest.fn()}
      />,
    )
    const article = screen.getByRole("article", {
      name: /In order, cash there \(M18\)/,
    })
    const card = article.querySelector<HTMLButtonElement>(
      'button[data-card="2.1"]',
    )!
    expect(card).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(card)
    expect(card).toHaveAttribute("aria-expanded", "true")
    const panel = within(article).getByRole("region", { name: "In order" })
    // The panel is not inside the row of cards, so the card stays in place.
    expect(panel.parentElement?.contains(card)).toBe(false)
    fireEvent.keyDown(card, { key: "Escape" })
    expect(
      within(article).queryByRole("region", { name: "In order" }),
    ).toBeNull()
    expect(card).toHaveFocus()
  })
})

describe("preview gate", () => {
  it("never serves the page on production", () => {
    expect(reviewEnabled({ VERCEL_ENV: "production" })).toBe(false)
    expect(reviewEnabled({ VERCEL_ENV: "preview" })).toBe(true)
    expect(reviewEnabled({})).toBe(true)
  })
})
