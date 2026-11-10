import * as React from "react"

import { BorrowerAnalytics, BorrowerMarketRow, Comparison } from "./api"
import { CardSpec } from "./card"
import {
  AgeWeightedBars,
  BucketBar,
  C,
  CompletedBars,
  LateShareRow,
  MarkArray,
  RankStrip,
  Tbd,
  WeightedMarket,
} from "./charts"
import {
  BLANK,
  contractKept,
  count,
  counted,
  days,
  hours,
  isNumber,
  percent,
  score,
  trend,
  units,
  withAsset,
} from "./format"
import {
  isFunded,
  join,
  openEpisodes,
  rankPhrase,
  reader,
  sentence,
} from "./helpers"
import {
  GATES,
  LIMITED_NOTE,
  Tone,
  verdictExits,
  verdictInOrder,
  verdictWord,
} from "./rules"
import { scoped, text } from "./text"

// Every sentence on the borrower cards. The words are in glassDoor.json under
// cards.card_3_x; this file decides which sentence applies and fills in the
// formatted numbers.

const NA = BLANK.unavailable
const shared = scoped("cards.shared")
const c31 = scoped("cards.card_3_1")
const c34 = scoped("cards.card_3_4")
const c36 = scoped("cards.card_3_6")
const c38 = scoped("cards.card_3_8")
const c310 = scoped("cards.card_3_10")

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
  return withAsset(units(total), typeof asset === "string" ? asset : undefined)
}
/** The whole-market debt of late markets, phrased for mixed assets. */
const debt = (
  rows: BorrowerMarketRow[],
  total: number | undefined,
  where: string,
) => {
  const sum = sameAssetSum(rows, total)
  return sum === undefined
    ? c34("sub.debtMixed", { markets: counted("market", rows.length), where })
    : c34("sub.debt", { sum, where })
}

const rank = (comparison: Comparison | undefined) =>
  comparison?.betterThan === undefined ? undefined : (
    <RankStrip
      position={comparison.betterThan}
      population={comparison.population}
      label={text("shared.rank.stripLabel", {
        position: count(comparison.betterThan),
        population: count(comparison.population),
        noun: text("shared.rank.borrowers"),
      })}
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
  const within = now.lateRows.filter((row) => row.values.M85 !== 1)
  let state: { tone: Tone; label: string; sub: string }
  if (now.past)
    state = {
      tone: "red",
      label: c34("state.past", { count: now.past, n: count(now.past) }),
      sub: debt(now.pastRows, n("S36"), c34("sub.pastAllowance")),
    }
  else if (now.late)
    state = {
      tone: "amber",
      label: c34("state.late", { count: now.late, n: count(now.late) }),
      sub: c34("sub.nonePast", {
        debt: debt(within, n("S35"), c34("sub.withinAllowance")),
      }),
    }
  else if (now.incomplete)
    state = {
      tone: "neutral",
      label: c34("state.incomplete"),
      sub: c34("sub.unavailable", {
        states: counted("marketState", now.unknown),
      }),
    }
  else if (now.open === 0)
    state = {
      tone: "neutral",
      label: borrower.markets.length
        ? c34("state.noOpen")
        : c34("state.noMarkets"),
      sub: "",
    }
  else
    state = {
      tone: "green",
      label: c34("state.inOrder"),
      sub: "",
    }
  if (now.incomplete && now.late)
    state.sub = c34("sub.andUnavailable", {
      sub: state.sub,
      n: count(now.unknown),
    })
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
  const facilities = (value: number) => counted("completedFacility", value)
  // The book counts funded markets only; a market that never took deposits
  // has no record to grade.
  const rows = borrower.markets.filter(
    (row) => row.state === "Ok" && isFunded(row.values),
  )
  // Why a book value is blank: no funded market, or none with recorded life.
  const bookBlank = rows.length
    ? c31("formula.noHistory")
    : BLANK.noFundedMarket
  // The trailing window (S27, S28) needs 7 recorded days in the last 90.
  const trendBlank = rows.length
    ? c31("formula.shortWindow")
    : BLANK.noFundedMarket
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
    .map((row) =>
      c31("formula.term", { grade: score(row.grade), days: count(row.days) }),
    )
  let value: string = NA
  if (marketDays === 0 || markets === 0) value = BLANK.noHistory
  else if (neverLate) value = BLANK.neverLate
  else if (book !== undefined) value = score(book)
  let exitLine = c31("formula.exitsBlank", { reason: NA })
  if (deadlines === 0) exitLine = c31("formula.exitsNone")
  else if (
    deadlines !== undefined &&
    covered !== undefined &&
    exitRate !== undefined
  ) {
    const exitValues = {
      covered: count(covered),
      deadlines: count(deadlines),
      rate: score(exitRate),
    }
    exitLine =
      weakest !== undefined && weakestRow
        ? c31("formula.exitsWeakest", {
            ...exitValues,
            weakest: score(weakest),
            of: count(Number(weakestRow.values.M30)),
          })
        : c31("formula.exits", exitValues)
  }
  const inOrderVerdict =
    book === undefined
      ? null
      : verdictInOrder({ score: book, trend: change, days: marketDays })
  let floorText: string | undefined
  if (floor !== undefined && !singleMarket)
    floorText = c31("sub.floor", { floor: score(floor) })
  let bookLine = c31("formula.bookBlank", { reason: bookBlank })
  if (book !== undefined && marketDays !== undefined && terms.length) {
    const sumValues = {
      terms: terms.join(" + "),
      days: count(marketDays),
      book: score(book),
    }
    bookLine =
      weighted.length > terms.length
        ? c31("formula.sumMore", sumValues)
        : c31("formula.sum", sumValues)
  }
  const weakestVerdict =
    weakestRow && weakest !== undefined
      ? verdictExits({
          pct: weakest,
          deadlines: Number(weakestRow.values.M30),
        })
      : null
  const inOrder: CardSpec = {
    id: "3.1",
    page: "borrower",
    ids: c31("ids"),
    kind: book !== undefined && !neverLate ? "score" : "text",
    value,
    verdict: inOrderVerdict,
    sub: join(
      kept === undefined
        ? undefined
        : c31("sub.contractKept", { kept: contractKept(kept) }),
      floorText,
      change === undefined
        ? undefined
        : c31("sub.trend", { change: trend(change) }),
      inOrderVerdict === "LIMITED" ? LIMITED_NOTE : undefined,
    ),
    compare: join(
      cmp.S05
        ? c31("compare.median", { median: score(cmp.S05.median) })
        : undefined,
      deadlines && exitRate !== undefined
        ? c31("compare.exits", {
            share: percent(exitRate),
            deadlines: count(deadlines),
          })
        : undefined,
    ),
    formula: [
      c31("formula.definition"),
      bookLine,
      kept === undefined
        ? c31("formula.keptBlank", { reason: bookBlank })
        : c31("formula.kept", { kept: contractKept(kept) }),
      join(
        trailing !== undefined && book !== undefined && change !== undefined
          ? c31("formula.trend", {
              trailing: score(trailing),
              book: score(book),
              change: trend(change),
            })
          : c31("formula.trendBlank", { reason: trendBlank }),
        floor === undefined
          ? undefined
          : c31("formula.floor", { floor: score(floor) }),
        top === undefined ? undefined : c31("formula.top", { top: score(top) }),
      ),
      exitLine,
    ].join("\n"),
    numbers: sentence(
      c31("numbers.evidence", {
        days: show(marketDays, (v) => counted("marketDay", v)),
        gate: GATES.gradeDays,
      }),
      c31("numbers.markets", {
        markets: show(markets, (v) => counted("market", v)),
      }),
      c31("numbers.strong", { gate: GATES.gradeDays }),
      weakestRow && weakest !== undefined
        ? c31("numbers.weakest", {
            market: marketLabel(weakestRow),
            share: percent(weakest),
            verdict: weakestVerdict
              ? verdictWord(weakestVerdict)
              : c31("numbers.noVerdict"),
          })
        : undefined,
      split
        ? c31("numbers.split", {
            late: count(Number(split[1])),
            never: count(Number(split[2])),
          })
        : c31("numbers.splitBlank", { blank: BLANK.splitSoon }),
    ),
    chart: {
      expanded:
        book !== undefined && weighted.length ? (
          <AgeWeightedBars markets={weighted} book={book} />
        ) : undefined,
    },
    chips: {
      median: cmp.S05
        ? c31("chips.median", {
            median: score(cmp.S05.median),
            population: count(cmp.S05.population),
          })
        : BLANK.noMedianBorrower,
      markets: rankPhrase(cmp.S05, "borrowers"),
      borrower:
        singleMarket || floor === undefined || top === undefined
          ? shared("singleMarket")
          : c31("chips.range", { low: score(floor), high: score(top) }),
    },
    chipCharts: { markets: rank(cmp.S05) },
  }

  // ---------- 3.4 Right now, all markets ----------
  const { now, within, ...state } = bookState(borrower)
  const { protocol } = borrower
  const withinSum = sameAssetSum(within, n("S35"))
  const pastSum = sameAssetSum(now.pastRows, n("S36"))
  const lateWord = (row: BorrowerMarketRow) =>
    row.values.M85 === 1 ? c34("numbers.pastGrace") : c34("numbers.withinGrace")
  const rightNow: CardSpec = {
    id: "3.4",
    page: "borrower",
    ids: c34("ids"),
    kind: "state",
    value: state.label,
    state: state.tone,
    verdict: null,
    sub: state.sub,
    compare: protocol
      ? c34("compare", {
          late: count(protocol.lateNow),
          markets: counted("market", protocol.openMarkets),
        })
      : "",
    formula: [
      c34("formula.count", { late: show(n("S18"), count) }),
      c34("formula.within", { sum: withinSum ?? shared("notSummed") }),
      c34("formula.past", {
        sum: pastSum ?? shared("notSummed"),
        state: text(`shared.toneWord.${state.tone}`),
      }),
      ...(now.incomplete ? [c34("formula.incomplete")] : []),
    ].join("\n"),
    numbers: sentence(
      c34("numbers.rule"),
      c34("numbers.debt"),
      ...now.lateRows.map((row) => {
        const { n: metric, s: word } = reader(row.values)
        return c34("numbers.row", {
          market: marketLabel(row),
          state: lateWord(row),
          amount: withAsset(show(metric("M07"), units), word("M02")),
        })
      }),
    ),
    chart: {
      expanded:
        now.open > 0 ? (
          <BucketBar
            inOrder={now.open - now.unknown - now.late}
            within={now.late - now.past}
            withinDebt={withinSum ?? shared("mixedAssets")}
            past={now.past}
            pastDebt={pastSum ?? shared("mixedAssets")}
          />
        ) : undefined,
    },
    chips: {
      median: cmp.S18
        ? c34("chips.median", {
            markets: counted("market", cmp.S18.median),
            population: count(cmp.S18.population),
          })
        : BLANK.noMedianBorrower,
      markets: protocol
        ? c34("chips.protocol", {
            late: count(protocol.lateNow),
            markets: counted("openMarket", protocol.openMarkets),
          })
        : BLANK.noProtocolCounts,
      borrower: (() => {
        if (now.incomplete) return c34("chips.incomplete")
        if (!now.lateRows.length) return c34("chips.allInOrder")
        return c34("chips.markets", {
          list: now.lateRows
            .map((row) =>
              c34("chips.marketState", {
                market: marketLabel(row),
                state: lateWord(row),
              }),
            )
            .join("; "),
        })
      })(),
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
      ? withAsset(units(capital), String([...closedAssets][0]))
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
  let settledText = c36("chart.none", {
    days: show(marketDays, (v) => counted("marketDay", v)),
  })
  if (completed && settled !== undefined)
    settledText = c36("chart.settled", {
      share: percent(settled),
      capital:
        capitalText ??
        (mixedCapital ? shared("mixedAssets") : show(capital, units)),
    })
  const cycle: CardSpec = {
    id: "3.6",
    page: "borrower",
    ids: c36("ids"),
    kind: completed && !capitalText ? "count" : "text",
    value: cycleValue,
    verdict: null,
    sub:
      completed === 0
        ? c36("sub.running")
        : join(
            capitalText
              ? c36("sub.through", { facilities: facilities(completed ?? 0) })
              : facilities(completed ?? 0),
            mixedCapital ? c36("sub.mixed") : undefined,
            verified === undefined
              ? undefined
              : c36("sub.verified", { n: count(verified) }),
            clean === undefined
              ? undefined
              : c36("sub.clean", { n: count(clean) }),
          ),
    compare: protocol
      ? c36("compare", {
          facilities: facilities(protocol.completedFacilities),
        })
      : "",
    formula: [
      completed === 0
        ? c36("formula.none", { blank: BLANK.noneCompleted })
        : c36("formula.completed", { completed: show(completed, count) }),
      c36("formula.capital", {
        capital:
          capitalText ??
          (mixedCapital ? shared("notSummed") : show(capital, units)),
        share:
          marketDays === undefined || settled === undefined
            ? bookBlank
            : c36("formula.share", {
                closed: count(closedDays),
                days: count(marketDays),
                share: percent(settled),
              }),
      }),
    ].join("\n"),
    numbers: sentence(
      c36("numbers.money"),
      c36("numbers.stored", {
        verified: show(verified, count),
        clean: show(clean, count),
      }),
    ),
    chart: {
      expanded:
        settled !== undefined ? (
          <CompletedBars
            rows={[
              {
                label: c36("chart.thisBorrower"),
                settledPct: settled,
                text: settledText,
              },
            ]}
          />
        ) : undefined,
    },
    chips: {
      median: cmp.S30
        ? c36("chips.median", {
            facilities: facilities(cmp.S30.median),
            population: count(cmp.S30.population),
          })
        : BLANK.noMedianBorrower,
      markets: protocol
        ? c36("chips.protocol", {
            facilities: facilities(protocol.completedFacilities),
          })
        : BLANK.noProtocolCounts,
      borrower: borrower.partial
        ? c36("chips.partial")
        : c36("chips.book", {
            closed: count(closedRows.length),
            markets: counted("market", rows.length),
          }),
    },
  }

  // ---------- 3.8 Discipline ----------
  const incidents = n("S12")
  const stillOpen = rows.reduce(
    (total, row) => total + openEpisodes(row.values),
    0,
  )
  // Longest episode, all markets (D15) is published in hours (v4.2).
  const longest = n("D15")
  const longestDays = longest === undefined ? undefined : longest / 24
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
  if (noFinished) cure = stillOpen ? BLANK.noFinishedEpisode : BLANK.noIncidents
  else if (hasFinished) cure = show(n("D16"), hours)
  /** The longest incident, against its own market's allowance when known. */
  const against = (shown: string) =>
    longestGrace === undefined
      ? shown
      : c38("against", { longest: shown, grace: hours(longestGrace) })
  const longestText = longest === undefined ? NA : against(hours(longest))
  let incidentsText: string | undefined
  if (incidents !== undefined)
    incidentsText = stillOpen
      ? shared("stillOpen", {
          episodes: counted("incident", incidents),
          open: count(stillOpen),
        })
      : counted("incident", incidents)
  // Grace breaches: episodes that ran past their grace period (S13 = M25
  // summed), per market and per 100 episodes as the design prints them.
  const breaches = n("S13")
  const perMarket =
    breaches !== undefined && markets ? breaches / markets : undefined
  const per100 = n("BREACHES_PER_100")
  const medianPer100 = cmp.BREACHES_PER_100?.median
  const breachRows = rows
    .map((row) => ({ row, breaches: reader(row.values).n("M25") ?? 0 }))
    .filter((entry) => entry.breaches > 0)
    .sort((left, right) => right.breaches - left.breaches)
  let disciplineValue: string = NA
  if (incidents === 0) disciplineValue = BLANK.noIncidents
  else if (breaches !== undefined) disciplineValue = counted("breach", breaches)
  const per100Marks = (who: string, rate: number) => {
    const marks = Math.min(100, Math.round(rate))
    return (
      <MarkArray
        key={who}
        groups={[
          {
            count: marks,
            color: C.red,
            label: c38("chart.breaches", { who }),
          },
          {
            count: 100 - marks,
            color: C.greenBg,
            label: c38("chart.cured"),
          },
        ]}
        caption={c38("chart.caption", { who, rate: score(rate) })}
      />
    )
  }
  const discipline: CardSpec = {
    id: "3.8",
    page: "borrower",
    ids: c38("ids"),
    kind: breaches === undefined || incidents === 0 ? "text" : "count",
    value: disciplineValue,
    verdict: null,
    sub:
      incidents === 0
        ? ""
        : join(
            incidentsText
              ? c38("sub.incidents", { incidents: incidentsText })
              : undefined,
            per100 === undefined
              ? undefined
              : c38("sub.per100", { rate: score(per100) }),
            hasFinished && !noFinished ? c38("sub.cure", { cure }) : undefined,
          ),
    compare:
      longest === undefined ? "" : c38("compare", { longest: longestText }),
    formula: [
      c38("formula.perMarket", {
        breaches: show(breaches, count),
        markets: show(markets, count),
        rate:
          perMarket === undefined && !markets
            ? BLANK.noFundedMarket
            : show(perMarket, score),
      }),
      c38("formula.per100", {
        breaches: show(breaches, count),
        incidents: show(incidents, count),
        rate:
          per100 === undefined && incidents === 0
            ? c38("formula.noEpisode")
            : show(per100, score),
      }),
      c38("formula.longest", {
        longest:
          longest === undefined
            ? NA
            : against(
                c38("formula.longestDays", {
                  hours: hours(longest),
                  days: days(longestDays!),
                }),
              ),
        cure,
      }),
    ].join("\n"),
    numbers: sentence(
      c38("numbers.definition"),
      incidentsText
        ? c38("numbers.raw", { incidents: incidentsText })
        : undefined,
      longestRow
        ? c38("numbers.longest", { market: marketLabel(longestRow) })
        : undefined,
    ),
    chart: {
      expanded:
        per100 === undefined ? (
          <Tbd>{c38("chart.none")}</Tbd>
        ) : (
          <>
            {per100Marks(c38("chart.thisBorrower"), per100)}
            {medianPer100 === undefined
              ? null
              : per100Marks(c38("chart.medianBorrower"), medianPer100)}
          </>
        ),
    },
    chips: {
      median:
        medianPer100 === undefined
          ? BLANK.noMedianBorrower
          : c38("chips.median", {
              median: score(medianPer100),
              population: count(cmp.BREACHES_PER_100!.population),
            }),
      markets: rankPhrase(cmp.BREACHES_PER_100, "borrowers"),
      borrower: breachRows.length
        ? c38("chips.markets", {
            list: breachRows
              .map(({ row, breaches: marketBreaches }) =>
                c38("chips.marketBreaches", {
                  n: count(marketBreaches),
                  market: marketLabel(row),
                }),
              )
              .join(", "),
          })
        : c38("chips.none"),
    },
    chipCharts: { markets: rank(cmp.BREACHES_PER_100) },
  }

  // ---------- 3.10 Lender breadth ----------
  const lenders = n("S37")
  // Distinct lenders per market (M49), most first.
  const lenderRows = rows
    .map((row) => ({ row, lenders: reader(row.values).n("M49") ?? 0 }))
    .filter((entry) => entry.lenders > 0)
    .sort((left, right) => right.lenders - left.lenders)
  const breadth: CardSpec = {
    id: "3.10",
    page: "borrower",
    ids: c310("ids"),
    kind: "count",
    value: show(lenders, count),
    verdict: null,
    sub: lenders === undefined ? "" : c310("sub", { count: lenders }),
    compare:
      markets === undefined
        ? ""
        : c310("compare", { markets: counted("market", markets) }),
    formula: c310("formula", { lenders: show(lenders, count) }),
    numbers: c310("numbers"),
    chips: {
      median: cmp.S37
        ? c310("chips.median", {
            lenders: counted("distinctLender", cmp.S37.median),
            population: count(cmp.S37.population),
          })
        : BLANK.noMedianBorrower,
      markets: rankPhrase(cmp.S37, "borrowers"),
      borrower: lenderRows.length
        ? c310("chips.markets", {
            list: lenderRows
              .map(({ row, lenders: marketLenders }) =>
                c310("chips.marketLenders", {
                  n: count(marketLenders),
                  market: marketLabel(row),
                }),
              )
              .join(", "),
          })
        : c310("chips.none"),
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
