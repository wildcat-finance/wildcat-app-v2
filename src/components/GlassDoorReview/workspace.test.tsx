/* eslint-disable import/no-extraneous-dependencies */
import { useState } from "react"

import "@testing-library/jest-dom"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"

import { marketSpecs } from "@/components/GlassDoor/marketSpecs"
import { marketFixture } from "@/components/GlassDoor/storyFixtures"

import { CardWorkspace } from "./CardWorkspace"
import { SPEC_METRICS } from "./catalogue"
import { Decisions } from "./Decisions"
import { MetricItem } from "./MetricItem"
import { MetricNav } from "./MetricNav"
import { STORAGE_KEY } from "./options"
import { PagePreview } from "./PagePreview"
import {
  changeChoice,
  changeComparison,
  emptyReview,
  exportReview,
  isReviewed,
  loadReview,
  markReviewed,
  parseReview,
  REVIEW_KEY,
  ReviewConfiguration,
} from "./reviewState"
import { TREATMENT_KEY, treatmentData, treatmentIssue } from "./treatmentData"

const built = marketSpecs(marketFixture)
const specs = Object.fromEntries(
  [...built.rowA, ...built.supporting].map((spec) => [spec.id, spec]),
)
const datums = treatmentData(marketFixture, specs)
const context = {
  identity: "1:market:publication:blockhash",
  label: "Wintermute · wmtUSDC · Block 25,749,504",
}
const withChoice = () => changeChoice(emptyReview(), "2.1", "B")

describe("portable review configuration", () => {
  beforeEach(() => window.localStorage.clear())
  it("migrates saved choices and displays without manufacturing reviewed decisions", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ M18: ["value", "card"] }),
    )
    localStorage.setItem(TREATMENT_KEY, JSON.stringify({ "2.1": "B" }))
    const migrated = loadReview(localStorage)
    expect(migrated.picks).toEqual({ "2.1": "B" })
    expect(migrated.displays.M18).toEqual(["value", "card"])
    expect(migrated.reviewed).toEqual({})
    localStorage.setItem(REVIEW_KEY, exportReview(migrated, context))
    expect(loadReview(localStorage)).toEqual(migrated)
  })
  it("normalizes previously ignored legacy options before saving the unified configuration", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        M01: ["value", "card", "chart"],
        M18: ["value", "chart"],
      }),
    )
    const migrated = loadReview(localStorage)
    expect(migrated.displays.M01).toEqual(["value"])
    expect(parseReview(exportReview(migrated))).toEqual(migrated)
    localStorage.setItem(
      REVIEW_KEY,
      JSON.stringify({ ...migrated, displays: { M01: ["value", "card"] } }),
    )
    expect(loadReview(localStorage).displays.M01).toEqual(["value"])
  })
  it("round-trips defaults, display switches, treatment choices and snapshot-specific review status", () => {
    const review = markReviewed(
      changeComparison(withChoice(), "2.1", false),
      "2.1",
      context,
      true,
    )
    review.displays.M18 = []
    const restored = parseReview(exportReview(review, context))
    expect(restored).toEqual(review)
    expect(isReviewed(restored, "2.1", context)).toBe(true)
    expect(
      isReviewed(restored, "2.1", {
        ...context,
        identity: "different snapshot",
      }),
    ).toBe(false)
  })
  it("keeps approval for repeated selection but invalidates it when the setup changes", () => {
    const review = markReviewed(withChoice(), "2.1", context, true)
    expect(changeChoice(review, "2.1", "B")).toBe(review)
    expect(isReviewed(changeChoice(review, "2.1", "C"), "2.1", context)).toBe(
      false,
    )
    expect(
      isReviewed(changeComparison(review, "2.1", false), "2.1", context),
    ).toBe(false)
    expect(changeChoice(review, "2.1").picks).toEqual({})
    expect(
      isReviewed(
        markReviewed(emptyReview(), "2.1", context, true),
        "2.1",
        context,
      ),
    ).toBe(true)
  })
  it.each([
    "not JSON",
    JSON.stringify({ ...emptyReview(), version: 99 }),
    JSON.stringify({ ...emptyReview(), displays: { M01: ["chart"] } }),
    JSON.stringify({ ...emptyReview(), displays: { M99: ["value"] } }),
    JSON.stringify({ ...emptyReview(), picks: { "2.1": "J" } }),
    JSON.stringify({ ...emptyReview(), picks: { "2.4": "B" } }),
    JSON.stringify({
      ...emptyReview(),
      reviewed: { "2.1": { context: null } },
    }),
  ])("rejects invalid imports atomically", (input) => {
    expect(() => parseReview(input)).toThrow()
  })
  it("does not silently discard a legacy choice that now needs replacement", () => {
    localStorage.setItem(TREATMENT_KEY, JSON.stringify({ "2.4": "B" }))
    const migrated = loadReview(localStorage)
    localStorage.setItem(REVIEW_KEY, exportReview(migrated))
    expect(loadReview(localStorage).picks["2.4"]).toBe("B")
    expect(treatmentIssue("B", datums["2.4"])).toMatch(/current state/)
    expect(datums["2.4"].rail).toBe(-1)
    expect(datums["2.4"].grace).toBe(-1)
  })
})

const Workspace = ({
  card = "2.1",
  initial = withChoice(),
}: {
  card?: string
  initial?: ReviewConfiguration
}) => {
  const [review, setReview] = useState(initial)
  return (
    <CardWorkspace
      card={card}
      spec={specs[card]}
      datum={datums[card]}
      reason="Unavailable"
      review={review}
      context={context}
      onCard={jest.fn()}
      onChoose={(id, code) =>
        setReview((current) => changeChoice(current, id, code))
      }
      onComparison={(id, on) =>
        setReview((current) => changeComparison(current, id, on))
      }
      onReviewed={(id, on) =>
        setReview((current) => markReviewed(current, id, context, on))
      }
      onPreview={jest.fn()}
    />
  )
}

describe("comparison workspace", () => {
  it("opens details in an accessible dialog without stretching the comparison cards", async () => {
    render(<Workspace />)
    fireEvent.click(
      within(screen.getByRole("article", { name: "Selected setup" })).getByRole(
        "button",
        { name: "Details" },
      ),
    )
    const dialog = screen.getByRole("dialog", { name: "Card 2.1 details" })
    expect(
      within(dialog).getByRole("region", { name: "In order" }),
    ).toBeInTheDocument()
    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
  it("keeps the selected setup visible while shortlisting without changing it", () => {
    render(<Workspace />)
    fireEvent.click(screen.getByRole("button", { name: "D · Sentence" }))
    expect(
      within(screen.getByRole("article", { name: "Selected setup" })).getByText(
        /days in every 100/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Choose 2.1-D, Sentence" }),
    ).toBeEnabled()
    fireEvent.click(
      screen.getByRole("button", { name: "Choose 2.1-D, Sentence" }),
    )
    expect(
      within(screen.getByRole("article", { name: "Selected setup" })).getByText(
        "D · Sentence",
      ),
    ).toBeInTheDocument()
  })
  it("renders the changed comparison line, retaining the original beside it", () => {
    render(<Workspace initial={changeChoice(emptyReview(), "2.1", "C")} />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Comparison line" }))
    const selected = screen.getByRole("article", { name: "Selected setup" })
    expect(within(selected).queryByText(datums["2.1"].median)).toBeNull()
    expect(
      within(
        screen.getByRole("article", { name: "Original design" }),
      ).getByText(specs["2.1"].compare),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: "Reviewed" }))
    expect(screen.getByRole("checkbox", { name: "Reviewed" })).toBeChecked()
    fireEvent.click(screen.getByRole("button", { name: "Restore design" }))
    expect(screen.getByRole("checkbox", { name: "Reviewed" })).not.toBeChecked()
  })
  it("keeps reference and unsupported treatments out of final choices", () => {
    render(<Workspace card="2.4" initial={emptyReview()} />)
    fireEvent.click(screen.getByRole("button", { name: "All treatments" }))
    expect(
      screen.queryByRole("button", { name: /Choose 2.4-[BCGHJKN]/ }),
    ).toBeNull()
    expect(screen.queryByText(/all 100 in order/)).toBeNull()
    expect(screen.getByText(/^Reference only/)).toBeInTheDocument()
  })
  it("opens names as navigation without toggling visibility or choices", () => {
    const onMetric = jest.fn()
    render(
      <MetricNav
        view="metrics"
        card="2.1"
        metric="M18"
        review={withChoice()}
        contexts={{ market: context }}
        onView={jest.fn()}
        onCard={jest.fn()}
        onMetric={onMetric}
      />,
    )
    fireEvent.change(screen.getByRole("textbox", { name: "Search metrics" }), {
      target: { value: "M18" },
    })
    const item = screen.getByRole("button", {
      name: "(M18) In order, cash there",
    })
    fireEvent.click(item)
    fireEvent.click(item)
    expect(onMetric.mock.calls).toEqual([["M18"], ["M18"]])
    expect(screen.queryByRole("button", { name: /Market age/ })).toBeNull()
  })
  it("uses the chosen specimen in both metric and composed page previews", () => {
    const review = withChoice()
    const cards = { market: specs, treatments: datums, picks: review.picks }
    const { unmount } = render(
      <MetricItem
        metric={SPEC_METRICS.find((entry) => entry.id === "M18")!}
        on={["card"]}
        data={{
          market: { status: "ok", data: marketFixture },
          borrower: { status: "none" },
        }}
        cards={cards}
        onToggle={jest.fn()}
        onReset={jest.fn()}
        onOpenTreatments={jest.fn()}
      />,
    )
    expect(screen.getByText(datums["2.1"].countClaim)).toBeInTheDocument()
    unmount()
    render(
      <PagePreview
        market={marketFixture}
        borrowerName="Wintermute"
        cards={cards}
        review={review}
        onBack={jest.fn()}
      />,
    )
    expect(screen.getByText(datums["2.1"].countClaim)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Phone" }))
    expect(screen.getByRole("button", { name: "Phone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })
  it("keeps malformed import from replacing decisions and allows undo after a valid import", () => {
    const onChange = jest.fn()
    render(
      <Decisions
        review={withChoice()}
        contexts={{ market: context }}
        datums={datums}
        onChange={onChange}
        onCard={jest.fn()}
        onMetric={jest.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Import JSON" }))
    fireEvent.change(screen.getByLabelText("Review configuration"), {
      target: { value: "bad" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply configuration" }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent("Enter valid JSON")
    fireEvent.change(screen.getByLabelText("Review configuration"), {
      target: { value: exportReview(emptyReview()) },
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply configuration" }))
    expect(onChange).toHaveBeenLastCalledWith(emptyReview())
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(onChange).toHaveBeenLastCalledWith(withChoice())
  })
})
