import * as React from "react"

import { BorrowerAnalytics, BorrowerMarketRow, Comparison } from "./api"
import { CardSpec } from "./card"
import {
  AgeWeightedBars,
  BucketBar,
  CompletedBars,
  LateShareRow,
  RankStrip,
  Tbd,
  WeightedMarket,
} from "./charts"
import {
  BLANK,
  contractKept,
  count,
  days,
  hours,
  isNumber,
  percent,
  plural,
  score,
  trend,
  units,
} from "./format"
import { isFunded, openEpisodes, rankPhrase, reader, sentence } from "./helpers"
import { LIMITED_NOTE, Tone, verdictExits, verdictInOrder } from "./rules"
import { BREACH_RECOUNT } from "./wording"

const NA = BLANK.unavailable
const SINGLE_MARKET = "single-market borrower — no spread to show"
const join = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" · ")

export const marketLabel = (row: BorrowerMarketRow) =>
  row.symbol ?? `${row.address.slice(0, 6)}…${row.address.slice(-4)}`

/**
 * A sum of token amounts in one asset, or undefined when the markets use
 * different assets: those amounts are not added without prices.
 */
const sameAssetSum = (rows: BorrowerMarketRow[], total: number | undefined) => {
  if (total === undefined) return NA
  const assets = new Set(rows.map((row) => row.values.M02))
  if (assets.size > 1) return undefined
  const [asset] = [...assets]
  return typeof asset === "string" ? `${units(total)} ${asset}` : units(total)
}
/** The whole-market debt of late markets, phrased for mixed assets. */
const debt = (
  rows: BorrowerMarketRow[],
  total: number | undefined,
  where: string,
) => {
  const sum = sameAssetSum(rows, total)
  return sum === undefined
    ? `debt of ${plural(
        rows.length,
        "market",
      )} ${where}, not summed (different assets)`
    : `${sum} whole-market debt ${where}`
}

const rank = (comparison: Comparison | undefined) =>
  comparison?.betterThan === undefined ? undefined : (
    <RankStrip
      position={comparison.betterThan}
      population={comparison.population}
      label={`Better than ${count(comparison.betterThan)} of ${count(
        comparison.population,
      )} graded borrowers`}
    />
  )

/** Live state across the book. The absence of a flag is not evidence of health. */
export function borrowerNow(borrower: BorrowerAnalytics) {
  const open = borrower.markets.filter(
    (market) => market.state !== "Ok" || market.values.M77 !== "Closed",
  )
  const known = open.filter(
    (market) =>
      market.state === "Ok" &&
      market.values.M77 === "Open" &&
      isNumber(market.values.M21) &&
      [0, 1].includes(market.values.M21) &&
      isNumber(market.values.M85) &&
      [0, 1].includes(market.values.M85),
  )
  const lateRows = known.filter(
    (market) => market.values.M21 === 1 || market.values.M85 === 1,
  )
  const pastRows = known.filter((market) => market.values.M85 === 1)
  const unknown = open.length - known.length
  return {
    open: open.length,
    late: lateRows.length,
    past: pastRows.length,
    unknown,
    incomplete: unknown > 0 || borrower.partial || borrower.state !== "Ok",
    lateRows,
    pastRows,
  }
}

/** Card 3.4's headline, by the spec's rule; unknown states never read as clear. */
export function bookState(borrower: BorrowerAnalytics) {
  const now = borrowerNow(borrower)
  const { n } = reader(borrower.values)
  const markets = (value: number) =>
    `${count(value)} MARKET${value === 1 ? "" : "S"}`
  const within = now.lateRows.filter((row) => row.values.M85 !== 1)
  let state: { tone: Tone; label: string; sub: string }
  if (now.past)
    state = {
      tone: "red",
      label: `${markets(now.past)} PAST ALLOWANCE`,
      sub: debt(now.pastRows, n("S36"), "past allowance"),
    }
  else if (now.late)
    state = {
      tone: "amber",
      label: `${markets(now.late)} LATE, WITHIN ALLOWANCE`,
      sub: `${debt(within, n("S35"), "within allowance")} · 0 past allowance`,
    }
  else if (now.incomplete)
    state = {
      tone: "neutral",
      label: "INCOMPLETE",
      sub: `${plural(now.unknown, "market state")} unavailable`,
    }
  else if (now.open === 0)
    state = {
      tone: "neutral",
      label: borrower.markets.length ? "NO OPEN MARKETS" : "NO MARKETS",
      sub: "",
    }
  else
    state = {
      tone: "green",
      label: "ALL MARKETS IN ORDER",
      sub: `${plural(now.open, "open market")}`,
    }
  if (now.incomplete && now.late)
    state.sub = `${state.sub} · ${count(now.unknown)} unavailable`
  return { ...state, now, within }
}

export function borrowerSpecs(borrower: BorrowerAnalytics) {
  const { n, s } = reader(borrower.values)
  const cmp = borrower.comparisons
  const marketDays = n("MARKET_DAYS")
  const markets = n("S01")
  const hasHistory = marketDays !== undefined && marketDays > 0
  const book = hasHistory ? n("S05") : undefined
  const kept = hasHistory ? n("D21") : undefined
  const trailing = n("S27")
  const change = n("S28")
  const singleMarket = markets === 1
  const floor = hasHistory ? n("S06") : undefined
  const top = hasHistory ? n("S07") : undefined
  const show = <T,>(value: T | undefined, format: (value: T) => string) =>
    value === undefined ? NA : format(value)
  // The book counts funded markets only; a market that never took deposits
  // has no record to grade.
  const rows = borrower.markets.filter(
    (row) => row.state === "Ok" && isFunded(row.values),
  )
  const neverLate =
    !borrower.partial &&
    borrower.state === "Ok" &&
    rows.length > 0 &&
    hasHistory &&
    rows.every((market) => market.values.H02 === 0)

  // ---------- 3.1 In order, all markets ----------
  const deadlines = n("S14")
  const covered = n("S15")
  const exitRate = n("S16")
  const weakest = n("S17")
  const weakestRow = rows
    .filter(
      (row) =>
        isNumber(row.values.M30) &&
        row.values.M30 > 0 &&
        isNumber(row.values.M32),
    )
    .sort(
      (left, right) => Number(left.values.M32) - Number(right.values.M32),
    )[0]
  const split = s("D18")?.match(/^(\d+)\s*\/\s*(\d+)$/)
  const weighted: WeightedMarket[] = rows
    .filter(
      (row) =>
        isNumber(row.values.M18) &&
        isNumber(row.values.M05) &&
        row.values.M05 > 0,
    )
    .map((row) => ({
      label: marketLabel(row),
      grade: Number(row.values.M18),
      days: Number(row.values.M05),
    }))
  const terms = weighted
    .slice(0, 8)
    .map((row) => `${score(row.grade)}×${count(row.days)}`)
  let value: string = NA
  if (marketDays === 0 || markets === 0) value = "no recorded history"
  else if (neverLate) value = BLANK.neverLate
  else if (book !== undefined) value = score(book)
  let exitLine = `S16: ${NA}`
  if (deadlines === 0)
    exitLine = "S14 = 0: no withdrawal batch has reached its deadline"
  else if (
    deadlines !== undefined &&
    covered !== undefined &&
    exitRate !== undefined
  )
    exitLine = `S16 = 100 × S15 ${count(covered)} / S14 ${count(
      deadlines,
    )} = ${score(exitRate)}${
      weakest !== undefined && weakestRow
        ? ` · S17 = weakest market on exits = ${score(weakest)} of ${count(
            Number(weakestRow.values.M30),
          )}`
        : ""
    }`
  const inOrderVerdict =
    book === undefined
      ? null
      : verdictInOrder({ score: book, trend: change, days: marketDays })
  let floorText: string | undefined
  if (floor !== undefined)
    floorText = singleMarket ? undefined : `floor ${score(floor)}`
  const inOrder: CardSpec = {
    id: "3.1",
    page: "borrower",
    ids: "S05 · D21 · S06 S07 · S27 S28 · S14 S15 S16 S17 · D18",
    kind: book !== undefined && !neverLate ? "score" : "text",
    value,
    verdict: inOrderVerdict,
    sub: join(
      kept === undefined ? undefined : `contract kept: ${contractKept(kept)}`,
      floorText,
      change === undefined ? undefined : `trend ${trend(change)}`,
      inOrderVerdict === "LIMITED" ? LIMITED_NOTE : undefined,
    ),
    compare: join(
      cmp.S05 ? `median borrower ${score(cmp.S05.median)}` : undefined,
      deadlines && exitRate !== undefined
        ? `exits ${percent(exitRate)} of ${count(deadlines)}`
        : undefined,
    ),
    formula: [
      "S05 = Σ(In order, cash there (M18) × Market age (M05)) / Σ M05",
      book !== undefined && marketDays !== undefined && terms.length
        ? `= (${terms.join(" + ")}${
            weighted.length > terms.length ? " + …" : ""
          }) / ${count(marketDays)} = ${score(book)}`
        : `S05: ${NA}`,
      kept === undefined
        ? `D21: ${NA}`
        : `D21 = 100 − Σ(Time under penalty (M26) × M05) / Σ M05 = ${contractKept(
            kept,
          )}`,
      join(
        trailing !== undefined && book !== undefined && change !== undefined
          ? `S28 = S27 ${score(trailing)} − S05 ${score(book)} = ${trend(
              change,
            )}`
          : `S28: ${NA}`,
        floor === undefined ? undefined : `S06 = min M18 = ${score(floor)}`,
        top === undefined ? undefined : `S07 = max M18 = ${score(top)}`,
      ),
      exitLine,
    ].join("\n"),
    numbers: sentence(
      `${show(marketDays, (v) =>
        plural(v, "market-day"),
      )} of evidence (gate 90 market-days)`,
      `${show(markets, (v) => plural(v, "market"))} (S01)`,
      "STRONG requires S05 ≥ 85 and ≥ 90 market-days",
      weakestRow && weakest !== undefined
        ? `weakest market on exits ${marketLabel(weakestRow)} ${percent(
            weakest,
          )} (S17), verdict ${
            verdictExits({
              pct: weakest,
              deadlines: Number(weakestRow.values.M30),
            }) ?? "none"
          }`
        : undefined,
      split
        ? `uncovered deadlines: ${count(Number(split[1]))} paid late / ${count(
            Number(split[2]),
          )} never paid (D18)`
        : `uncovered deadlines: ${BLANK.splitSoon} (D18)`,
    ),
    chart: {
      expanded:
        book !== undefined && weighted.length ? (
          <AgeWeightedBars markets={weighted} book={book} />
        ) : undefined,
    },
    chips: {
      median: cmp.S05
        ? `median ${score(cmp.S05.median)} · ${count(
            cmp.S05.population,
          )} borrowers`
        : "TBD: no protocol median yet",
      markets: rankPhrase(cmp.S05, "borrowers"),
      borrower:
        singleMarket || floor === undefined || top === undefined
          ? SINGLE_MARKET
          : `their range: ${score(floor)} to ${score(top)}`,
    },
    chipCharts: { markets: rank(cmp.S05) },
  }

  // ---------- 3.4 Right now, all markets ----------
  const { now, within, ...state } = bookState(borrower)
  const { protocol } = borrower
  const withinSum = sameAssetSum(within, n("S35"))
  const pastSum = sameAssetSum(now.pastRows, n("S36"))
  const rightNow: CardSpec = {
    id: "3.4",
    page: "borrower",
    ids: "S18 · S35 · S36 (from M21, M85, M07)",
    kind: "state",
    value: state.label,
    state: state.tone,
    verdict: null,
    sub: state.sub,
    compare: protocol
      ? `protocol right now: ${count(protocol.lateNow)} of ${plural(
          protocol.openMarkets,
          "market",
        )} late`
      : "",
    formula: [
      `S18 = count of markets with M21 = 1 or M85 = 1 = ${show(
        n("S18"),
        count,
      )}`,
      `S35 = Σ Total owed to lenders now (M07) where M21 = 1 = ${
        withinSum ?? "not summed (different assets)"
      } (whole-market debt, not the shortfall)`,
      `S36 = Σ M07 where M85 = 1 = ${
        pastSum ?? "not summed (different assets)"
      } → ${state.tone}`,
      ...(now.incomplete
        ? [
            "Some market states are unavailable; the known states cannot establish an all-clear result.",
          ]
        : []),
    ].join("\n"),
    numbers: sentence(
      "green if S18 = 0; amber if S35 > 0 and S36 = 0; red if S36 > 0",
      "amounts are whole-market debt",
      ...now.lateRows.map((row) => {
        const { n: metric, s: text } = reader(row.values)
        return `${marketLabel(row)} ${
          row.values.M85 === 1 ? "past grace" : "late, within grace"
        }, owes ${show(metric("M07"), units)}${
          text("M02") ? ` ${text("M02")}` : ""
        } (M07)`
      }),
    ),
    chart: {
      expanded:
        now.open > 0 ? (
          <BucketBar
            inOrder={now.open - now.unknown - now.late}
            within={now.late - now.past}
            withinDebt={withinSum ?? "mixed assets"}
            past={now.past}
            pastDebt={pastSum ?? "mixed assets"}
          />
        ) : undefined,
    },
    chips: {
      median: "TBD: no borrower median of late markets is computed yet",
      markets: protocol
        ? `protocol right now: ${count(protocol.lateNow)} of ${plural(
            protocol.openMarkets,
            "open market",
          )} late`
        : "TBD: no protocol counts at this snapshot",
      borrower: now.incomplete
        ? "TBD: some of their market states are unavailable"
        : `their markets: ${
            now.lateRows.length
              ? now.lateRows
                  .map(
                    (row) =>
                      `${marketLabel(row)} ${
                        row.values.M85 === 1
                          ? "past grace"
                          : "late, within grace"
                      }`,
                  )
                  .join("; ")
              : "all in order"
          }`,
    },
  }

  // ---------- 3.6 Completed credit cycle ----------
  const completed = n("S30")
  const verified = n("S33")
  const clean = n("S34")
  const closedRows = rows.filter((row) => row.values.M77 === "Closed")
  const closedAssets = new Set(closedRows.map((row) => row.values.M02))
  const capital = n("S31")
  // Money leads and the count is fine print, unless the assets cannot be added.
  const capitalText =
    completed &&
    capital !== undefined &&
    closedAssets.size === 1 &&
    !borrower.partial &&
    closedRows.length === completed
      ? `${units(capital)} ${[...closedAssets][0]}`
      : undefined
  const mixedCapital = Boolean(completed) && closedAssets.size > 1
  const closedDays = closedRows.reduce(
    (total, row) => total + (isNumber(row.values.M05) ? row.values.M05 : 0),
    0,
  )
  const settled = n("S32")
  let cycleValue: string = show(completed, count)
  if (completed === 0) cycleValue = BLANK.noneCompleted
  else if (capitalText) cycleValue = capitalText
  let settledText = `none completed yet: all ${show(marketDays, (v) =>
    plural(v, "market-day"),
  )} still running`
  if (completed && settled !== undefined)
    settledText = `settled ${percent(settled)} · ${
      capitalText ?? (mixedCapital ? "mixed assets" : show(capital, units))
    }`
  const cycle: CardSpec = {
    id: "3.6",
    page: "borrower",
    ids: "S31 · S30 · S32 · S33 · S34",
    kind: completed && !capitalText ? "count" : "text",
    value: cycleValue,
    verdict: null,
    sub:
      completed === 0
        ? "everything still running"
        : join(
            capitalText
              ? `through ${plural(
                  completed ?? 0,
                  "completed facility",
                  "completed facilities",
                )}`
              : `${plural(
                  completed ?? 0,
                  "completed facility",
                  "completed facilities",
                )}`,
            mixedCapital ? "capital not summed (mixed assets)" : undefined,
            verified === undefined ? undefined : `${count(verified)} verified`,
            clean === undefined ? undefined : `${count(clean)} clean`,
          ),
    compare: protocol
      ? `protocol: ${plural(
          protocol.completedFacilities,
          "completed facility",
          "completed facilities",
        )}`
      : "",
    formula: [
      completed === 0
        ? `Completed facilities (S30) = 0 → blank word "${BLANK.noneCompleted}"`
        : `Completed facilities (S30) = ${show(completed, count)}`,
      `Capital through completed facilities (S31) = ${
        capitalText ??
        (mixedCapital ? "not summed (different assets)" : show(capital, units))
      } · Share of record from completed facilities (S32) = ${
        marketDays === undefined || settled === undefined
          ? NA
          : `${count(closedDays)} / ${count(marketDays)} = ${percent(settled)}`
      }`,
    ].join("\n"),
    numbers: sentence(
      "money leads, count is fine print",
      `Completions verified (S33) ${show(
        verified,
        count,
      )} and Clean closures (S34) ${show(
        clean,
        count,
      )} are stored at the MarketClosed block, never recomputed`,
    ),
    chart: {
      expanded:
        settled !== undefined ? (
          <CompletedBars
            rows={[
              {
                label: "this borrower",
                settledPct: settled,
                text: settledText,
              },
            ]}
          />
        ) : undefined,
    },
    chips: {
      median: "TBD: no borrower median of completed facilities is computed yet",
      markets: protocol
        ? `${plural(
            protocol.completedFacilities,
            "completed facility",
            "completed facilities",
          )} across the protocol`
        : "TBD: no protocol counts at this snapshot",
      borrower: borrower.partial
        ? "TBD: some of their markets are unavailable"
        : `their book: ${count(closedRows.length)} of ${plural(
            rows.length,
            "market",
          )} closed`,
    },
  }

  // ---------- 3.8 Discipline ----------
  const incidents = n("S12")
  const stillOpen = rows.reduce(
    (total, row) => total + openEpisodes(row.values),
    0,
  )
  const longestDays = n("D15")
  const longest = longestDays === undefined ? undefined : longestDays * 24
  const longestRow =
    longest === undefined
      ? undefined
      : rows.find(
          (row) =>
            isNumber(row.values.M23) &&
            Math.abs(Number(row.values.M23) - longest) < 0.01,
        )
  const longestGrace =
    longestRow && isNumber(longestRow.values.M15)
      ? Number(longestRow.values.M15)
      : undefined
  // Typical cure needs a finished episode: none at all is a word, not 0 h.
  const noFinished =
    !borrower.partial &&
    rows.length > 0 &&
    rows.every((market) => market.values.M20 === 0)
  const hasFinished = rows.some((row) => (reader(row.values).n("M20") ?? 0) > 0)
  let cure: string = NA
  if (noFinished)
    cure = stillOpen ? "no finished episode yet" : BLANK.noIncidents
  else if (hasFinished) cure = show(n("D16"), hours)
  const longestText =
    longest === undefined
      ? NA
      : `${hours(longest)}${
          longestGrace === undefined ? "" : ` against ${hours(longestGrace)}`
        }`
  const incidentsText =
    incidents === undefined
      ? undefined
      : `${plural(incidents, "incident")}${
          stillOpen ? `, ${count(stillOpen)} still open` : ""
        }`
  const discipline: CardSpec = {
    id: "3.8",
    page: "borrower",
    ids: "S12 · S13 · S01 · D15 · D16",
    kind: "text",
    value: incidents === 0 ? BLANK.noIncidents : "breaches TBD",
    verdict: null,
    sub:
      incidents === 0
        ? ""
        : join(
            incidentsText ? `in ${incidentsText}` : undefined,
            hasFinished && !noFinished ? `typical cure ${cure}` : undefined,
          ),
    compare: longest === undefined ? "" : `longest incident ${longestText}`,
    formula: [
      `per market = Grace breaches, all markets (S13) / Markets on Wildcat (S01) ${show(
        markets,
        count,
      )}: ${BREACH_RECOUNT}`,
      `per 100 episodes = 100 × S13 / Episodes, all markets (S12) ${show(
        incidents,
        count,
      )}: ${BREACH_RECOUNT}`,
      `Longest episode, all markets (D15) = ${
        longest === undefined
          ? NA
          : `${hours(longest)} = ${days(longestDays!)}${
              longestGrace === undefined
                ? ""
                : ` against ${hours(longestGrace)}`
            }`
      } · Typical cure time, all markets (D16) = ${cure}`,
    ].join("\n"),
    numbers: sentence(
      "breach = penalty span, same definition as the market level (C7); recount open under B2",
      incidentsText ? `the raw ${incidentsText} never headlines` : undefined,
      longestRow
        ? `longest episode on ${marketLabel(longestRow)} (D15)`
        : undefined,
    ),
    chart: {
      expanded: (
        <Tbd>
          Breaches per 100 episodes (S13 / S12): {BREACH_RECOUNT}. The marks are
          drawn once the recount is published.
        </Tbd>
      ),
    },
    chips: {
      median: cmp.S12
        ? `median ${plural(cmp.S12.median, "incident")} · ${count(
            cmp.S12.population,
          )} graded borrowers`
        : "TBD: no protocol median yet",
      markets: "TBD: breaches across borrowers wait on the recount (B2)",
      borrower: longestRow
        ? `their markets: longest episode ${longestText} on ${marketLabel(
            longestRow,
          )}`
        : "TBD: their longest episode is not available",
    },
  }

  // ---------- 3.10 Lender breadth ----------
  const lenders = n("S37")
  const breadth: CardSpec = {
    id: "3.10",
    page: "borrower",
    ids: "S37",
    kind: "count",
    value: show(lenders, count),
    verdict: null,
    sub:
      lenders === undefined
        ? ""
        : `different ${
            lenders === 1 ? "lender has" : "lenders have"
          } ever funded them`,
    compare: markets === undefined ? "" : `across ${plural(markets, "market")}`,
    formula: `Distinct lenders, all markets (S37) = unique funding addresses across every market, excluding 0x0, the market contracts and escrows (C6) = ${show(
      lenders,
      count,
    )}`,
    numbers: "count, no arithmetic.",
    chips: {
      median: cmp.S37
        ? `median borrower: ${plural(
            cmp.S37.median,
            "distinct lender",
          )} · ${count(cmp.S37.population)} graded borrowers`
        : "TBD: no protocol median yet",
      markets: rankPhrase(cmp.S37, "borrowers"),
      borrower:
        "TBD: per-market lender counts are not served on the borrower record yet",
    },
    chipCharts: { markets: rank(cmp.S37) },
  }

  return [inOrder, rightNow, cycle, discipline, breadth]
}

/** Card 3.12 view 1: late share of each funded market's own life, within and past. */
export function lateShareRows(borrower: BorrowerAnalytics): LateShareRow[] {
  return borrower.markets
    .flatMap((row) => {
      const { n } = reader(row.values)
      const life = n("H01")
      const late = n("H02")
      if (
        row.state !== "Ok" ||
        !isFunded(row.values) ||
        !life ||
        late === undefined
      )
        return []
      const lateShare = (100 * late) / life
      const pastPct = Math.min(lateShare, n("M26") ?? 0)
      return [
        {
          label: marketLabel(row),
          withinPct: lateShare - pastPct,
          pastPct,
          lateDays: days(n("D17") ?? late / 86_400),
        },
      ]
    })
    .sort(
      (left, right) =>
        right.withinPct + right.pastPct - (left.withinPct + left.pastPct),
    )
}
