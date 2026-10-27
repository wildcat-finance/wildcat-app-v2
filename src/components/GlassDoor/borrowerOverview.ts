import type { BorrowerAnalytics } from "./api"
import { borrowerCards, borrowerNow } from "./borrowerCards"
import { BLANK, count, display, hours, percent } from "./format"
import { reader } from "./helpers"
import type { RowCard } from "./IndexPanel"

/** Compact borrower summaries retain the source cards' evidence and definitions. */
export function borrowerOverview(borrower: BorrowerAnalytics): {
  summary: RowCard[]
} {
  const { rowA } = borrowerCards(borrower)
  const { n } = reader(borrower.values)
  const marketDays = n("MARKET_DAYS")
  const hasHistory = marketDays !== undefined && marketDays > 0
  const cash = hasHistory ? n("S05") : undefined
  let historyWord: string = BLANK.unavailable
  if (marketDays === 0) historyWord = "no recorded history"
  if (n("S01") === 0) historyWord = "no funded history"
  const total = n("S14")
  const funded = n("S15")
  let deadlines: string = BLANK.unavailable
  if (total === 0) deadlines = "None yet"
  else if (
    total !== undefined &&
    funded !== undefined &&
    funded >= 0 &&
    funded <= total
  )
    deadlines = `${count(funded)} / ${count(total)}`

  const now = borrowerNow(borrower)
  const known = now.open - now.unknown
  let states = `${count(known)} / ${count(now.open)}`
  if (borrower.partial) states += " · partial"
  if (now.open === 0) states = now.incomplete ? "Partial coverage" : "None open"
  const noFinished =
    !borrower.partial &&
    borrower.markets.length > 0 &&
    borrower.markets.every(
      (market) => market.state === "Ok" && market.values.M20 === 0,
    )
  const hasFinished = borrower.markets.some(
    (market) =>
      market.state === "Ok" && (reader(market.values).n("M20") ?? 0) > 0,
  )
  let cure: string = BLANK.unavailable
  if (noFinished) cure = "No finished incidents"
  else if (hasFinished) cure = display(n("D16"), hours)

  const overrides: Record<string, Partial<RowCard["card"]>> = {
    "3.1": {
      name: "Cash available",
      value: cash === undefined ? undefined : percent(cash),
      word: cash === undefined ? historyWord : rowA[0].card.word,
      detail: {
        label: "Contract kept",
        value: display(hasHistory ? n("D21") : undefined, percent),
      },
    },
    "3.3": {
      name: "Exits funded on time",
      detail: { label: "Deadlines", value: deadlines },
    },
    "3.4": {
      name: "Current state",
      state: {
        ...now.state,
        word: now.state.word.charAt(0) + now.state.word.slice(1).toLowerCase(),
      },
      detail: { label: "States known", value: states },
    },
    "3.6": {
      name: "Completed facilities",
      ...(n("S30") === 0 ? { word: "None yet" } : {}),
      detail: { label: "Verified closures", value: display(n("S33"), count) },
    },
    "3.8": {
      name: "Incident history",
      detail: { label: "Typical cure", value: cure },
    },
    "3.10": { name: "Historical lenders" },
  }

  return {
    summary: rowA.map((source) => {
      let { panel } = source
      if (panel && source.key === "3.4") {
        panel = {
          ...panel,
          numbers: [
            ...(panel.numbers ?? []),
            ["States known", states],
            ["Unavailable states", count(now.unknown)],
          ],
        }
      }
      if (panel && source.key === "3.8") {
        panel = {
          ...panel,
          numbers: panel.numbers?.map(([label, value]) => [
            label,
            label === "Mean finished-incident duration" ? cure : value,
          ]),
        }
      }
      return {
        ...source,
        panel,
        card: {
          ...source.card,
          sub: undefined,
          comparison: undefined,
          ...overrides[source.key],
        },
      }
    }),
  }
}
