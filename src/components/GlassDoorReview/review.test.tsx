/* eslint-disable import/no-extraneous-dependencies */
import * as React from "react"

import "@testing-library/jest-dom"
import { fireEvent, render, screen, within } from "@testing-library/react"

import { borrowerSpecs } from "@/components/GlassDoor/borrowerSpecs"
import { hours } from "@/components/GlassDoor/format"
import { marketSpecs } from "@/components/GlassDoor/marketSpecs"
import {
  borrowerFixture,
  marketFixture,
} from "@/components/GlassDoor/storyFixtures"
import { CARD_IDS, METRIC_IDS, metricName } from "@/components/GlassDoor/text"
import {
  BORROWER_COMPARISONS,
  MARKET_COMPARISONS,
  OPEN_MARKET_COMPARISONS,
} from "@/lib/glassdoor/pipeline/comparisons"

import { SPEC_METRICS } from "./catalogue"
import {
  availabilityText,
  CHART_INPUTS,
  COMPARED,
  designDefault,
  designRole,
  HEADLINES,
  isValueOnly,
} from "./design"
import { isReviewPath, reviewEnabled } from "./gate"
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
  availableOn,
  changeText,
  countsText,
  DISPLAY_OPTIONS,
  isDefault,
  loadPicks,
  loadToggles,
  metricChanged,
  OptionKey,
  optionsOn,
  resetOptions,
  savePicks,
  saveToggles,
  setOption,
  STORAGE_KEY,
  summary,
  summaryText,
} from "./options"
import {
  choose,
  chosenTreatment,
  cleanPicks,
  drawable,
  findTreatmentCard,
  MARKET_CARDS,
  treatmentData,
  TILE_FALLBACK,
  TREATMENT_CODES,
  treatmentIssue,
  treatmentLines,
} from "./treatmentData"
import { TreatmentTile } from "./treatments"

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
    expect([...ids].sort()).toEqual([...METRIC_IDS].sort())
    SPEC_METRICS.forEach((metric) => {
      expect(metric.name).toBe(metricName(metric.id))
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
      if (card !== "3.12") expect(CARD_IDS).toContain(card)
    })
  })
})

describe("values and their reasons", () => {
  it("formats a published value by its unit", () => {
    expect(shownValue(spec("M11"), ok)).toMatchObject({
      kind: "value",
      text: "8.50%",
    })
  })

  it("keeps a metric without data listed with its reason", () => {
    // Grace breaches are published now: 5 for the reference market.
    expect(shownValue(spec("M25"), ok)).toMatchObject({
      kind: "value",
      text: "5",
    })
    expect(shownValue(spec("D11"), ok)).toMatchObject({ kind: "tbd" })
    expect(
      shownValue(spec("M21"), { ...ok, market: { status: "none" } }),
    ).toEqual({ kind: "tbd", reason: "Select a market to see its value" })
    const review: ReviewData = {
      ...ok,
      market: {
        status: "ok",
        data: { ...marketFixture, state: "UnderReview", values: {} },
      },
    }
    expect(shownValue(spec("M18"), review)).toEqual({
      kind: "tbd",
      reason: "Withheld: this market is under review",
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
      reason: "Not published: not in the current publication",
    })
    expect(shownValue(spec("M84"), missing)).toEqual({
      kind: "tbd",
      reason: "No value: none published for this market",
    })
  })

  it("states the published comparison or that there is none", () => {
    expect(comparisonText(spec("M18"), ok)).toBe(
      "median 97.5 across 63 graded markets; better than 9 of 63 graded markets",
    )
    expect(comparisonText(spec("M77"), ok)).toBe(
      "No comparison published for this metric at this snapshot",
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
        .filter((id) => ids.has(id))
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
    expect(designDefault(spec("M05"))).toEqual(["value", "card", "chart"])
    expect(designDefault(spec("S13"))).toEqual(["value", "card", "chart"])
    expect(designDefault(spec("M13"))).toEqual(["value", "card"])
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
    const toggles = setOption({}, ["M05"], "card", true)
    expect(saveToggles(toggles, store)).toBe(true)
    expect(store.getItem(STORAGE_KEY)).toBe('{"M05":["value","card","chart"]}')
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
      "On: Value 91 · Card 86 · Chart 39 · Comparison 28. Changed from the design: 0 metrics, 0 card treatments.",
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
      "On: Value 65 · Card 62 · Chart 30 · Comparison 18. Changed from the design: 27 metrics, 0 card treatments.",
    )
    const text = summaryText(toggles, {}, [
      "Reviewed against Wintermute · wmtUSDC.",
    ])
    expect(text).toContain("Changes from the design (27)\n")
    expect(text).toContain("- Late within grace now (M21): −Chart\n")
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
  const view = (
    id: string,
    on: OptionKey[],
    extra: Partial<React.ComponentProps<typeof MetricItem>> = {},
  ) => (
    <MetricItem
      metric={spec(id)}
      on={on}
      data={ok}
      cards={{}}
      onToggle={jest.fn()}
      onReset={jest.fn()}
      onOpenTreatments={jest.fn()}
      {...extra}
    />
  )
  const article = (id: string) =>
    screen.getByRole("article", { name: new RegExp(`\\(${id}\\)$`) })

  it("offers only the displays the design has, named by what they draw", () => {
    const { rerender } = render(
      view("M18", ["value", "card", "chart", "comparison"]),
    )
    const m18 = article("M18")
    const options = m18
    expect(
      within(options)
        .getAllByRole("switch")
        .map((control) => control.textContent),
    ).toEqual(["Value", "Cards", "Comparison", "Charts"])
    // The value sits beside the name, with what the metric means under it.
    expect(within(m18).getByText("82.6")).toBeInTheDocument()
    expect(within(m18).getByText(spec("M18").what)).toBeInTheDocument()
    expect(
      within(m18).getByRole("img", {
        name: "Better than 9 of 63 graded markets",
      }),
    ).toBeInTheDocument()
    rerender(view("M01", ["value"]))
    const m01 = article("M01")
    expect(within(m01).getAllByRole("switch")).toHaveLength(1)
  })

  it("says what changed from the design in words and resets it", () => {
    const onReset = jest.fn()
    const onToggle = jest.fn()
    render(view("M18", ["value", "comparison"], { onReset, onToggle }))
    const m18 = article("M18")
    expect(
      within(m18).getByText(/^Changed from design: −Card, −Chart/),
    ).toBeInTheDocument()
    fireEvent.click(
      within(m18).getByRole("button", { name: "Reset to design" }),
    )
    expect(onReset).toHaveBeenCalledWith("M18")
    fireEvent.click(within(m18).getByRole("switch", { name: "Cards" }))
    expect(onToggle).toHaveBeenCalledWith("M18", "card", true)
  })

  it("opens the spec by default and lets the reviewer collapse it", () => {
    render(view("M18", ["value"]))
    const m18 = article("M18")
    const toggle = within(m18).getByRole("button", { name: "Spec" })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(
      within(m18)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual([
      "What it is",
      "How it is calculated",
      "What its cards tell you",
      "What its cards do not tell you",
    ])
    expect(within(m18).queryByText(/not in the metric spec/)).toBeNull()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(within(m18).queryByRole("term")).toBeNull()
  })

  it("links a card's headline metric to the card's treatments", () => {
    const onOpenTreatments = jest.fn()
    render(
      view("M18", ["value"], {
        treatmentCard: "2.1",
        treatment: "C",
        treatmentChanged: true,
        onOpenTreatments,
      }),
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: /Review card 2\.1 · C Rail/,
      }),
    )
    expect(onOpenTreatments).toHaveBeenCalledWith("2.1")
  })

  it("opens every card's panel in its own row and names the cards it feeds", () => {
    const { rowA } = marketSpecs(marketFixture, undefined)
    const cards = {
      market: Object.fromEntries(rowA.map((card) => [card.id, card])),
      borrower: Object.fromEntries(
        borrowerSpecs(borrowerFixture).map((card) => [card.id, card]),
      ),
    }
    render(view("M18", ["card"], { cards }))
    const m18 = article("M18")
    expect(within(m18).getByText("Card 2.1 · headline")).toBeInTheDocument()
    expect(
      within(m18).getByText("Card 3.1 · headline S05; this metric feeds it"),
    ).toBeInTheDocument()
    const card = m18.querySelector<HTMLButtonElement>(
      'button[data-card="2.1"]',
    )!
    // Open by default, both the headline card's panel and the fed card's.
    expect(card).toHaveAttribute("aria-expanded", "true")
    const panel = within(m18).getByRole("region", { name: "In order" })
    expect(
      within(m18).getByRole("region", { name: "In order, all markets" }),
    ).toBeInTheDocument()
    // The panel is not inside the row of cards, so the card stays in place.
    expect(panel.parentElement?.contains(card)).toBe(false)
    fireEvent.click(card)
    expect(card).toHaveAttribute("aria-expanded", "false")
    expect(within(m18).queryByRole("region", { name: "In order" })).toBeNull()
    // Closing one leaves the other open.
    expect(
      within(m18).getByRole("region", { name: "In order, all markets" }),
    ).toBeInTheDocument()
    fireEvent.click(card)
    expect(card).toHaveAttribute("aria-expanded", "true")
    fireEvent.keyDown(card, { key: "Escape" })
    expect(within(m18).queryByRole("region", { name: "In order" })).toBeNull()
    expect(card).toHaveFocus()
  })
})

describe("what each metric can have", () => {
  it("ignores options a metric cannot have and counts treatment changes", () => {
    expect(availableOn("M01")).toEqual(["value"])
    expect(optionsOn({ M01: ["value", "chart"] }, "M01")).toEqual(["value"])
    expect(setOption({}, ["M01", "M05"], "card", true)).toEqual({
      M05: ["value", "card", "chart"],
    })
    expect(
      SPEC_METRICS.filter(isValueOnly)
        .map((metric) => metric.id)
        .sort(),
    ).toEqual(["D11", "M01", "M02", "S02"])
    expect(availabilityText(spec("M01"))).toBe("Value only")
    expect(availabilityText(spec("M18"))).toBe(
      "Card 2.1 headline, 3.1 · Chart 2.1, 3.1 · Comparison · 16 treatments (card 2.1)",
    )
    expect(metricChanged({}, { "2.1": "C" }, "M18")).toBe(true)
    expect(metricChanged({}, {}, "M18")).toBe(false)
    expect(changeText({ M18: ["value", "comparison"] }, "M18")).toBe(
      "−Card, −Chart",
    )
  })
})

describe("preview gate", () => {
  it("never serves the page on production", () => {
    expect(reviewEnabled({ VERCEL_ENV: "production" })).toBe(false)
    expect(reviewEnabled({ VERCEL_ENV: "preview" })).toBe(true)
    expect(reviewEnabled({})).toBe(true)
  })

  it("knows the page's path, with or without a locale", () => {
    expect(isReviewPath("/glassdoor-review")).toBe(true)
    expect(isReviewPath("/fr/glassdoor-review/")).toBe(true)
    expect(isReviewPath("/lender")).toBe(false)
    expect(isReviewPath("/glassdoor-review/other")).toBe(false)
  })
})

describe("display treatments", () => {
  const liveSpecs = () => {
    const built = marketSpecs(marketFixture)
    return Object.fromEntries(
      [...built.rowA, ...built.supporting].map((card) => [card.id, card]),
    )
  }

  // The fixture is the handoff's worked example (wmtUSDC), so the live
  // datums match treatments-data.json where the publication holds the field.
  it("build each market card's index from the live values", () => {
    const data = treatmentData(marketFixture, liveSpecs())
    expect(Object.keys(data)).toEqual(MARKET_CARDS)
    expect(data["2.1"]).toMatchObject({
      rail: 82.6,
      railMed: 97.5,
      rank: [9, 63],
      better: "higher",
      countClaim: "17 days in every 100 the promised cash was short.",
    })
    expect(Math.round(data["2.1"].grace)).toBe(17)
    // Penalty time is not a slice of the short days, so it is never
    // subtracted from them; it is stated beside the count.
    expect(data["2.1"].past).toBe(0)
    expect(
      data["2.1"].countNote.endsWith(
        "separately, under 1 in 100 days past the allowance (M26)",
      ),
    ).toBe(true)
    expect(data["2.2"]).toMatchObject({
      rail: 113.7,
      railMed: 89,
      better: "lower",
    })
    // Breaches out of every 100 incidents (M25), drawn as red cells.
    expect(data["2.2"].grace).toBe(0)
    expect(data["2.2"].past).toBeGreaterThan(0)
    expect(data["2.2"].countNote).toMatch(/^5 of [\d,]+ incidents breached/)
    expect(data["2.2"].cov?.slice(0, 3)).toEqual([
      54.6,
      48,
      `${hours(48)} allowance`,
    ])
    expect(data["2.3"]).toMatchObject({
      rail: 83,
      railMed: 100,
      countClaim: "17 of every 100 payout deadlines were missed on the day.",
    })
    expect(data["2.6"]).toMatchObject({ rail: 58.4, railMed: 8.9, rank: null })
    expect(data["2.6"].better).toBeUndefined()
    expect(data["2.6"].cov?.[3]).toBe("41.6 points of room left")
    // Terms have no count out of 100, but the grace period sits on a rail.
    expect(data["2.10"]).toMatchObject({ rail: 48, grace: -1 })
  })

  it("draw every tile or give that tile's own reason, never a generic blank", () => {
    const data = treatmentData(marketFixture, liveSpecs())
    const generic = new Set(Object.values(TILE_FALLBACK))
    Object.values(data).forEach((datum) =>
      TREATMENT_CODES.forEach((code) => {
        const issue = treatmentIssue(code, datum)
        expect([datum.id, code, Boolean(issue && generic.has(issue))]).toEqual([
          datum.id,
          code,
          false,
        ])
      }),
    )
  })

  it("know which tiles can be drawn and colour a difference by direction", () => {
    const data = treatmentData(marketFixture, liveSpecs())
    expect(drawable("B", data["2.10"])).toBe(false)
    expect(treatmentIssue("B", data["2.10"])).toMatch(/^Contract facts/)
    expect(drawable("C", data["2.10"])).toBe(true)
    expect(drawable("F", data["2.10"])).toBe(true)
    expect(drawable("M", data["2.2"])).toBe(true)
    render(
      <TreatmentTile
        code="K"
        datum={data["2.2"]}
        chosen={false}
        onChoose={jest.fn()}
      />,
    )
    // A worst incident above the median is worse, not better.
    expect(screen.getByText("+24.7").className).toMatch(/bad/)
  })

  it("keep one stable choice per card until explicitly reset", () => {
    expect(chosenTreatment({}, "2.1")).toBe("A")
    const picked = choose({}, "2.1", "B")
    expect(picked).toEqual({ "2.1": "B" })
    expect(choose(picked, "2.1", "B")).toEqual(picked)
    expect(choose(picked, "2.1", "A")).toEqual({})
    expect(choose({}, "2.6", "M")).toEqual({ "2.6": "M" })
    expect(cleanPicks({ "2.1": "Z", "9.9": "A", "2.6": "M" })).toEqual({
      "2.6": "M",
    })
    const store = memoryStore()
    expect(savePicks(picked, store)).toBe(true)
    expect(loadPicks(store)).toEqual(picked)
    expect(treatmentLines(picked)[0].text).toBe(
      "2.1 In order: 2.1-B Counted (changed; design: 2.1-A Grade card)",
    )
    expect(treatmentLines({})[1].text).toBe(
      "2.2 Worst incident: 2.2-A Grade card (design)",
    )
    expect(treatmentLines({})[4].text).toBe(
      "2.5 What it pays: the live card (design)",
    )
    expect(countsText({}, picked)).toMatch(/0 metrics, 1 card treatment\.$/)
    const text = summaryText({}, picked)
    expect(text).toContain(
      "Changes from the design (1)\n- Card 2.1 In order: 2.1-B Counted (design: 2.1-A Grade card)",
    )
    expect(text).toContain(
      "Display treatments (A–P) per market card\n- 2.1 In order: 2.1-B Counted (changed; design: 2.1-A Grade card)",
    )
    expect(findTreatmentCard("card 2.2")).toBe("2.2")
    expect(findTreatmentCard("2.7")).toBeUndefined()
    expect(findTreatmentCard("M18")).toBeUndefined()
  })
})
