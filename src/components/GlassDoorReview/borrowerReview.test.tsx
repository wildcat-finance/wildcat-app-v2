/* eslint-disable import/no-extraneous-dependencies */
import { useState } from "react"

import "@testing-library/jest-dom"
import { fireEvent, render, screen, within } from "@testing-library/react"

import { BorrowerAnalytics } from "@/components/GlassDoor/api"
import { borrowerSpecs } from "@/components/GlassDoor/borrowerSpecs"
import {
  borrowerFixture,
  marketFixture,
} from "@/components/GlassDoor/storyFixtures"

import { borrowerTreatmentData } from "./borrowerTreatmentData"
import { CardWorkspace } from "./CardWorkspace"
import { SPEC_METRICS } from "./catalogue"
import { Decisions } from "./Decisions"
import { MetricItem } from "./MetricItem"
import { MetricNav } from "./MetricNav"
import { PagePreview } from "./PagePreview"
import {
  changeChoice,
  contextFor,
  emptyReview,
  exportReview,
  isReviewed,
  markReviewed,
  parseReview,
  publicationContext,
} from "./reviewState"
import {
  BORROWER_CARDS,
  TILE_FALLBACK,
  TREATMENT_CODES,
  treatmentIssue,
} from "./treatmentData"

// Next/Jest stubs SVGs as image objects; the app renders SVGR components.
jest.mock(
  "@/assets/icons/stack_icon.svg",
  () =>
    function StackIconMock() {
      return <svg aria-hidden="true" />
    },
)

const build = (borrower: BorrowerAnalytics = borrowerFixture) => {
  const specs = Object.fromEntries(
    borrowerSpecs(borrower).map((spec) => [spec.id, spec]),
  )
  return { specs, datums: borrowerTreatmentData(borrower, specs) }
}
const { specs, datums } = build()
const contexts = {
  market: publicationContext(
    marketFixture.market,
    marketFixture.publication,
    "Market",
  )!,
  borrower: publicationContext(
    borrowerFixture.borrower,
    borrowerFixture.publication,
    "Borrower",
  )!,
}

describe("borrower treatment evidence", () => {
  it("covers the five native borrower cards without turning the trouble chart into a card", () => {
    expect(Object.keys(datums)).toEqual(BORROWER_CARDS)
    expect(Object.keys(specs)).toEqual(BORROWER_CARDS)
    expect(datums["3.1"].rail).toBe(borrowerFixture.values.S05)
    expect(datums["3.1"].railMed).toBe(borrowerFixture.comparisons.S05.median)
    expect(datums["3.1"].rank).toEqual([
      borrowerFixture.comparisons.S05.betterThan,
      borrowerFixture.comparisons.S05.population,
    ])
    expect(treatmentIssue("C", datums["3.1"])).toBeUndefined()
    // Short market-days out of every 100 (100 − S05).
    expect(treatmentIssue("B", datums["3.1"])).toBeUndefined()
    expect(datums["3.1"].grace).toBeCloseTo(
      100 - Number(borrowerFixture.values.S05),
    )
    // A lender count sits on a rail against the median; it has no share of 100.
    expect(treatmentIssue("C", datums["3.10"])).toBeUndefined()
    expect(treatmentIssue("B", datums["3.10"])).toMatch(/count of lenders/)
    // Breaches per 100 incidents against the median borrower, lower better.
    expect(datums["3.8"]).toMatchObject({ grace: 0, better: "lower" })
    expect(treatmentIssue("C", datums["3.8"])).toBeUndefined()
    expect(treatmentIssue("L", datums["3.8"])).toBeUndefined()
    expect(datums["3.8"].sentence).toBe(
      "6 grace breaches in 450 incidents: 1.3 per 100 episodes.",
    )
  })
  it("draws every tile or gives that tile's own reason, never a generic blank", () => {
    const generic = new Set(Object.values(TILE_FALLBACK))
    Object.values(datums).forEach((datum) =>
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
  it("never grades a missing history or current-state count as a score", () => {
    const noHistory = build({
      ...borrowerFixture,
      values: { ...borrowerFixture.values, MARKET_DAYS: 0 },
    })
    expect(noHistory.datums["3.1"].value).toBe("no recorded history")
    expect(treatmentIssue("C", noHistory.datums["3.1"])).toBeDefined()
    expect(noHistory.datums["3.1"].rank).toBeNull()
    expect(treatmentIssue("C", datums["3.4"])).toMatch(/current state/)
    expect(treatmentIssue("B", datums["3.4"])).toMatch(/current state/)
    expect(build({ ...borrowerFixture, values: {} }).datums).toEqual({})
    expect(build({ ...borrowerFixture, state: "UnderReview" }).datums).toEqual(
      {},
    )
    expect(build({ ...borrowerFixture, state: "Preparing" }).datums).toEqual({})
  })
  it("keeps partial books and unavailable market states explicit", () => {
    const partial = build({
      ...borrowerFixture,
      partial: true,
      markets: borrowerFixture.markets.map((market, i) => ({
        ...market,
        state: i === 0 ? "UnderReview" : "Ok",
        values: { ...market.values, M21: 0, M85: 0 },
      })),
    })
    expect(partial.datums["3.1"].sentence).toContain("available markets'")
    expect(partial.datums["3.1"].evidence).toContain("partial record")
    expect(partial.datums["3.10"].sentence).toContain("available markets")
    expect(partial.datums["3.4"].value).toBe("INCOMPLETE")
    expect(partial.datums["3.4"].verdict).toBe("CONTEXT")
    expect(partial.datums["3.4"].parts).toContainEqual([
      "unavailable states",
      "1",
    ])
  })
  it("uses the native mixed-asset capital guard in every text treatment", () => {
    const mixed = build({
      ...borrowerFixture,
      values: { ...borrowerFixture.values, S30: 2, S31: 123456 },
      markets: borrowerFixture.markets.slice(0, 2).map((market, i) => ({
        ...market,
        values: { ...market.values, M77: "Closed", M02: i ? "WBTC" : "USDC" },
      })),
    })
    expect(mixed.datums["3.6"].value).toBe(mixed.specs["3.6"].value)
    expect(JSON.stringify(mixed.datums["3.6"])).not.toContain("123,456")
    // The rail is the completed share of the record, never summed capital.
    expect(mixed.datums["3.6"].railValue ?? "").not.toContain("123,456")
  })
})

describe("borrower review integration", () => {
  it("isolates review status by entity and publication while preserving market configuration", () => {
    let review = changeChoice(
      changeChoice(emptyReview(), "2.1", "B"),
      "3.1",
      "D",
    )
    review = markReviewed(review, "2.1", contexts.market, true)
    review = markReviewed(review, "3.1", contexts.borrower, true)
    const restored = parseReview(
      exportReview(review, contexts.market, contexts),
    )
    expect(restored).toEqual(review)
    const otherMarket = {
      ...contexts,
      market: { ...contexts.market, identity: "other market" },
    }
    expect(isReviewed(restored, "3.1", contextFor("3.1", otherMarket))).toBe(
      true,
    )
    expect(isReviewed(restored, "2.1", contextFor("2.1", otherMarket))).toBe(
      false,
    )
    const nextPublication = publicationContext(
      borrowerFixture.borrower,
      { ...borrowerFixture.publication, id: "new publication" },
      "Borrower",
    )!
    expect(isReviewed(restored, "3.1", nextPublication)).toBe(false)
    const otherBorrower = publicationContext(
      { ...borrowerFixture.borrower, address: "another borrower" },
      borrowerFixture.publication,
      "Borrower",
    )!
    expect(isReviewed(restored, "3.1", otherBorrower)).toBe(false)
    expect(isReviewed(restored, "2.1", contexts.market)).toBe(true)
    expect(
      parseReview(exportReview(changeChoice(emptyReview(), "2.1", "B"))).picks,
    ).toEqual({ "2.1": "B" })
  })
  it("groups cards by page, supports ID-first navigation and filters borrower changes", () => {
    const onCard = jest.fn()
    render(
      <MetricNav
        view="cards"
        card="3.1"
        metric="S05"
        review={changeChoice(emptyReview(), "3.1", "D")}
        contexts={contexts}
        onView={jest.fn()}
        onCard={onCard}
        onMetric={jest.fn()}
      />,
    )
    expect(
      within(screen.getByRole("region", { name: "Market cards" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(9)
    expect(
      within(
        screen.getByRole("region", { name: "Borrower cards" }),
      ).getAllByRole("button"),
    ).toHaveLength(5)
    fireEvent.click(
      screen.getByRole("button", { name: "(3.1) In order, all markets" }),
    )
    expect(onCard).toHaveBeenCalledWith("3.1")
    fireEvent.click(screen.getByRole("switch", { name: "Changed only" }))
    expect(screen.queryByRole("region", { name: "Market cards" })).toBeNull()
    expect(
      within(
        screen.getByRole("region", { name: "Borrower cards" }),
      ).getAllByRole("button"),
    ).toHaveLength(1)
  })
  it("uses chosen borrower treatments in metrics and the full borrower page", () => {
    const review = changeChoice(emptyReview(), "3.1", "D")
    const cards = { borrower: specs, treatments: datums, picks: review.picks }
    const { unmount } = render(
      <MetricItem
        metric={SPEC_METRICS.find((entry) => entry.id === "S05")!}
        on={["card"]}
        data={{
          market: { status: "none" },
          borrower: { status: "ok", data: borrowerFixture },
        }}
        cards={cards}
        onToggle={jest.fn()}
        onReset={jest.fn()}
        onOpenTreatments={jest.fn()}
      />,
    )
    expect(screen.getByText(datums["3.1"].sentence)).toBeInTheDocument()
    unmount()
    const onScope = jest.fn()
    render(
      <PagePreview
        borrower={borrowerFixture}
        borrowerName="Wintermute"
        cards={cards}
        review={review}
        scope="borrower"
        onScope={onScope}
        onBack={jest.fn()}
      />,
    )
    expect(screen.getByText(datums["3.1"].sentence)).toBeInTheDocument()
    expect(
      screen.getByRole("table", { name: "Borrower markets" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("region", { name: "Trouble over time" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Phone" }))
    expect(screen.getByRole("button", { name: "Phone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    fireEvent.click(screen.getByRole("button", { name: "Market" }))
    expect(onScope).toHaveBeenCalledWith("market")
  })
  it("keeps an unavailable borrower preview separate from an available market", () => {
    render(
      <PagePreview
        market={marketFixture}
        borrowerName="Wintermute"
        cards={{}}
        review={emptyReview()}
        scope="borrower"
        borrowerReason="Borrower record is under review."
        onBack={jest.fn()}
      />,
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Borrower record is under review.",
    )
    expect(screen.queryByRole("group", { name: "Market cards" })).toBeNull()
  })
  it("lists all five borrower decisions beside the nine market decisions", () => {
    const review = markReviewed(emptyReview(), "3.1", contexts.borrower, true)
    render(
      <Decisions
        review={review}
        contexts={contexts}
        datums={datums}
        onChange={jest.fn()}
        onCard={jest.fn()}
        onMetric={jest.fn()}
      />,
    )
    expect(
      within(screen.getByRole("table", { name: "Borrower" })).getAllByRole(
        "row",
      ),
    ).toHaveLength(6)
    expect(
      within(screen.getByRole("table", { name: "Market" })).getAllByRole("row"),
    ).toHaveLength(10)
    expect(screen.getByText("1 / 14 reviewed")).toBeInTheDocument()
  })
  it("chooses, reviews and restores a borrower card without crossing into market navigation", () => {
    const onCard = jest.fn()
    const Workspace = () => {
      const [review, setReview] = useState(emptyReview)
      return (
        <CardWorkspace
          card="3.1"
          spec={specs["3.1"]}
          datum={datums["3.1"]}
          reason="Unavailable"
          review={review}
          context={contexts.borrower}
          onCard={onCard}
          onChoose={(id, code) =>
            setReview((current) => changeChoice(current, id, code))
          }
          onComparison={jest.fn()}
          onReviewed={(id, on) =>
            setReview((current) =>
              markReviewed(current, id, contexts.borrower, on),
            )
          }
          onPreview={jest.fn()}
        />
      )
    }
    render(<Workspace />)
    fireEvent.click(screen.getByRole("button", { name: "D · Sentence" }))
    fireEvent.click(
      screen.getByRole("button", { name: "Choose 3.1-D, Sentence" }),
    )
    expect(
      within(screen.getByRole("article", { name: "Selected setup" })).getByText(
        datums["3.1"].sentence,
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: "Reviewed" }))
    expect(screen.getByRole("checkbox", { name: "Reviewed" })).toBeChecked()
    fireEvent.click(screen.getByRole("button", { name: "Restore design" }))
    expect(screen.getByRole("checkbox", { name: "Reviewed" })).not.toBeChecked()
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    expect(onCard).toHaveBeenCalledWith("3.4")
  })
})
