import { BorrowerAnalytics } from "@/components/GlassDoor/api"
import { bookState } from "@/components/GlassDoor/borrowerSpecs"
import { CardSpec } from "@/components/GlassDoor/card"
import {
  block,
  count,
  percent,
  plural,
  score,
} from "@/components/GlassDoor/format"
import { reader } from "@/components/GlassDoor/helpers"

import { BORROWER_CARDS, datumFromSpec, IndexDatum } from "./treatmentData"

/** Borrower treatments use published book values, never a synthetic market. */
export const borrowerTreatmentData = (
  borrower: BorrowerAnalytics,
  specs: Record<string, CardSpec>,
): Record<string, IndexDatum> => {
  if (borrower.state !== "Ok" || !Object.keys(borrower.values).length) return {}
  const { n } = reader(borrower.values)
  const evidence = borrower.publication.cut
    ? `borrower record at block ${block(borrower.publication.cut.block)}${
        borrower.partial ? " · partial record" : ""
      }`
    : undefined
  const data: Record<string, IndexDatum> = {}
  BORROWER_CARDS.forEach((card) => {
    const spec = specs[card]
    if (!spec) return
    const datum = datumFromSpec(spec, evidence)
    datum.median = spec.compare
    datum.sentence = [spec.value, spec.sub].filter(Boolean).join(". ")
    datum.parts = [["headline", spec.value]]
    if (spec.sub) datum.parts.push(["record", spec.sub])
    if (spec.compare) datum.parts.push(["comparison", spec.compare])
    if (borrower.partial) datum.parts.push(["coverage", "partial record"])
    data[card] = datum
  })

  const inOrder = data["3.1"]
  const days = n("MARKET_DAYS")
  const cash = n("S05")
  if (inOrder && days !== undefined && days > 0 && cash !== undefined) {
    const comparison = borrower.comparisons.S05
    inOrder.rail = cash
    inOrder.railMed = comparison?.median ?? -1
    inOrder.better = "higher"
    inOrder.sentence = `Across ${
      borrower.partial ? "the available markets' " : ""
    }${plural(
      days,
      "market-day",
    )} of recorded history, the required cash was there ${percent(
      cash,
    )} of the time, weighted by market age.`
    if (comparison?.betterThan !== undefined)
      inOrder.rank = [comparison.betterThan, comparison.population]
    inOrder.parts = [
      ["cash there", score(cash)],
      ["recorded market-days", count(days)],
    ]
    const kept = n("D21")
    if (kept !== undefined) inOrder.parts.push(["contract kept", score(kept)])
    const floor = n("S06")
    const top = n("S07")
    if (floor !== undefined && top !== undefined)
      inOrder.parts.push(["market range", `${score(floor)} to ${score(top)}`])
    if (borrower.partial) inOrder.parts.push(["coverage", "partial record"])
  }

  const now = data["3.4"]
  if (now) {
    const state = bookState(borrower)
    now.verdict = {
      green: "STRONG" as const,
      amber: "WATCH" as const,
      red: "PROBLEM" as const,
      neutral: "CONTEXT" as const,
    }[state.tone]
    now.parts = [
      ["open markets", count(state.now.open)],
      ["late, within allowance", count(state.now.late - state.now.past)],
      ["past allowance", count(state.now.past)],
      ["unavailable states", count(state.now.unknown)],
    ]
    if (state.now.incomplete) now.parts.push(["coverage", "partial record"])
  }

  const cycle = data["3.6"]
  if (cycle) {
    // Capital is already guarded for mixed assets and partial books by the spec.
    const completed = n("S30")
    const verified = n("S33")
    const clean = n("S34")
    const share = n("S32")
    if (completed !== undefined)
      cycle.parts.push(["completed facilities", count(completed)])
    if (verified !== undefined)
      cycle.parts.push(["verified completions", count(verified)])
    if (clean !== undefined) cycle.parts.push(["clean closures", count(clean)])
    if (share !== undefined)
      cycle.parts.push(["share of recorded life completed", percent(share)])
  }

  const discipline = data["3.8"]
  if (discipline && specs["3.8"].value === "breaches TBD")
    discipline.sentence = `Grace-breach counts are not published yet. ${specs["3.8"].sub}.`

  const breadth = data["3.10"]
  const lenders = n("S37")
  if (breadth && lenders !== undefined) {
    const comparison = borrower.comparisons.S37
    breadth.sentence = `${plural(lenders, "distinct lender")} ${
      lenders === 1 ? "has" : "have"
    } funded this borrower across its ${
      borrower.partial ? "available " : ""
    }markets.`
    if (comparison?.betterThan !== undefined)
      breadth.rank = [comparison.betterThan, comparison.population]
    // A lender count has a rank, but is not a 0–100 grade or event frequency.
  }
  return data
}
