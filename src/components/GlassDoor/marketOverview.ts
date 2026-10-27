import type { BorrowerAnalytics, MarketAnalytics } from "./api"
import { BLANK, count, days, display, hours, percent } from "./format"
import { leadingNumber, reader } from "./helpers"
import type { RowCard } from "./IndexPanel"
import { marketCards } from "./marketCards"
import { GD } from "./tokens"

type FundingGroup = { label: string; value: number; color: string }
type MarketFact = { label: string; value: string; detailKey?: string }

export type MarketOverview = {
  summary: RowCard[]
  funding: { total?: number; groups: FundingGroup[] }
  facts: MarketFact[]
  details: RowCard[]
}

const observedCount = (value: number | undefined) =>
  value !== undefined && Number.isInteger(value) && value >= 0
    ? value
    : undefined

/** Compact layout model; the published metric definitions and disclosures stay intact. */
export function marketOverview(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
): MarketOverview {
  const { rowA, supporting } = marketCards(market, borrower)
  const { n, s } = reader(market.values)
  const life = n("H01")
  const hasHistory = life !== undefined && life > 0
  const noHistory = life === 0 ? "no recorded history" : BLANK.unavailable
  const cash = hasHistory ? n("M18") : undefined
  const penalty = hasHistory ? n("M26") : undefined
  const longest = hasHistory ? n("M23") : undefined
  const grace = n("M15")
  const total = observedCount(n("M30"))
  const funded = observedCount(n("M31"))
  const late = observedCount(n("D18_LATE"))
  const unpaid = observedCount(n("D18_NEVER"))
  const groups: FundingGroup[] = []

  if (
    total !== undefined &&
    total > 0 &&
    funded !== undefined &&
    funded <= total
  ) {
    const missed = total - funded
    groups.push({ label: "Funded on time", value: funded, color: GD.link })
    if (
      late !== undefined &&
      unpaid !== undefined &&
      late + unpaid === missed
    ) {
      // Keep observed zeros for the ledger. A zero contributes no bar width.
      groups.push(
        { label: "Funded late", value: late, color: GD.fundedLate },
        { label: "Still unpaid", value: unpaid, color: GD.pastAllowance },
      )
    } else {
      groups.push({
        label: "Missed deadlines",
        value: missed,
        color: GD.ghost,
      })
    }
  }

  const summary = ["2.1", "2.3", "2.2", "2.4", "2.5"].map((key): RowCard => {
    const source = rowA.find((item) => item.key === key)!
    const card = {
      ...source.card,
      sub: undefined,
      comparison: undefined,
    }
    if (key === "2.1") {
      return {
        ...source,
        card: {
          ...card,
          name: "Cash available",
          value: cash === undefined ? undefined : percent(cash),
          word: cash === undefined ? noHistory : card.word,
          detail: {
            label: "Contract kept",
            value: display(
              penalty === undefined ? undefined : 100 - penalty,
              percent,
            ),
          },
        },
      }
    }
    if (key === "2.3") {
      let evidence: string = BLANK.unavailable
      if (total === 0) evidence = "None yet"
      else if (total !== undefined && funded !== undefined && funded <= total)
        evidence = `${count(funded)} / ${count(total)}`
      return {
        ...source,
        card: {
          ...card,
          name: "Exits funded on time",
          detail: {
            label: "Deadlines",
            value: evidence,
          },
        },
      }
    }
    if (key === "2.2") {
      return {
        ...source,
        card: {
          ...card,
          name: "Longest shortfall",
          value: longest === undefined ? undefined : hours(longest),
          word: noHistory,
          detail: {
            label: "Allowance",
            value: grace === 0 ? "No grace period" : display(grace, hours),
          },
        },
      }
    }
    if (key === "2.4") {
      const state = card.state?.word
      const numbers = [...(source.panel?.numbers ?? [])]
      const countdown = n("D05") ?? leadingNumber(s("D05"))
      if (state === "WITHIN GRACE" || state === "PENALTY ACTIVE") {
        numbers.push([
          state === "WITHIN GRACE" ? "Grace remaining" : "Time above grace",
          display(
            countdown !== undefined && countdown >= 0 ? countdown : undefined,
            hours,
          ),
        ])
      }
      const lastCured = n("M84")
      if (
        ["IN ORDER", "WITHIN GRACE", "PENALTY ACTIVE"].includes(state ?? "") &&
        n("M20") !== undefined &&
        n("M20")! > 0 &&
        lastCured !== undefined &&
        lastCured >= 0
      ) {
        numbers.push(["Last cured", `${days(lastCured)} ago`])
      }
      return {
        ...source,
        panel: source.panel ? { ...source.panel, numbers } : undefined,
        card: {
          ...card,
          name: "Current state",
          state: card.state
            ? {
                ...card.state,
                word:
                  card.state.word.charAt(0) +
                  card.state.word.slice(1).toLowerCase(),
              }
            : undefined,
          detail: { label: "Unpaid batches", value: display(n("M37"), count) },
        },
      }
    }
    return {
      ...source,
      card: {
        ...card,
        name: "Posted APR",
        detail: {
          label: "Realised APR",
          value: n("M41") === 0 ? BLANK.noYield : display(n("M39"), percent),
        },
      },
    }
  })

  return {
    summary,
    funding: { total, groups },
    facts: [
      {
        label: "Capacity used",
        value:
          n("M06") === 0 ? "No deposit capacity" : display(n("M86"), percent),
        detailKey: "2.6",
      },
      {
        label: "Active lenders",
        value: display(n("M48"), count),
        detailKey: "2.9",
      },
      {
        label: "Historical lenders",
        value: display(n("M49"), count),
        detailKey: "2.9",
      },
      {
        label: "Largest lender share",
        value: display(n("D10"), percent),
        detailKey: "2.9",
      },
      {
        label: "Grace period",
        value: display(grace, hours),
        detailKey: "2.10",
      },
      {
        label: "Withdrawal cycle",
        value: display(n("M16"), hours),
        detailKey: "2.10",
      },
      {
        label: "Finished incidents",
        value: display(n("M20"), count),
        detailKey: "2.8",
      },
    ],
    details: supporting,
  }
}
