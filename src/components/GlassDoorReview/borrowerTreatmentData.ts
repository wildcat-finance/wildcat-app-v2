import {
  BorrowerAnalytics,
  BorrowerMarketRow,
} from "@/components/GlassDoor/api"
import { bookState, marketLabel } from "@/components/GlassDoor/borrowerSpecs"
import { CardSpec } from "@/components/GlassDoor/card"
import {
  block,
  contractKept,
  count,
  counted,
  days,
  hours,
  isNumber,
  isSeries,
  longDate,
  percent,
  score,
} from "@/components/GlassDoor/format"
import { isFunded, openEpisodes, reader } from "@/components/GlassDoor/helpers"
import { scoped, text } from "@/components/GlassDoor/text"

import {
  BORROWER_CARDS,
  datumFromSpec,
  IndexDatum,
  per100,
  positionOf,
  railEnd,
  rankReason,
  reasonFor,
  sampleSeries,
  seriesReason,
  versus,
  widths,
} from "./treatmentData"

// Every word a borrower tile shows is in glassDoor.json under treatments.

const GREEN = "#28CA7C"
const AMBER = "#D7A820"
const RED = "#F1464B"
const GHOST = "#D4D6DD"
const PURPLE = "#4112B5"
const ROWS = 5

const shared = scoped("treatments.shared")
const t31 = scoped("treatments.card_3_1")
const t34 = scoped("treatments.card_3_4")
const t36 = scoped("treatments.card_3_6")
const t38 = scoped("treatments.card_3_8")
const t310 = scoped("treatments.card_3_10")

const one = (value: number) => Math.round(value * 10) / 10

/** Trend bars scaled to their peak. */
const scaled = (values: number[]) => {
  const peak = Math.max(0, ...values)
  return values.map((value) => (peak > 0 ? (100 * value) / peak : 0))
}

type Bucket = [string, string, number, string]

/** Borrower treatments use published book values, never a synthetic market. */
export const borrowerTreatmentData = (
  borrower: BorrowerAnalytics,
  specs: Record<string, CardSpec>,
): Record<string, IndexDatum> => {
  if (borrower.state !== "Ok" || !Object.keys(borrower.values).length) return {}
  const { n } = reader(borrower.values)
  const cmp = borrower.comparisons
  let evidence: string | undefined
  if (borrower.publication.cut) {
    const at = { block: block(borrower.publication.cut.block) }
    evidence = borrower.partial
      ? shared("evidenceBorrowerPartial", at)
      : shared("evidenceBorrower", at)
  }
  const marketDays = n("MARKET_DAYS")
  const notRanked = (comparison?: (typeof cmp)[string]) =>
    rankReason(comparison, marketDays, "borrowers")
  const seriesOf = (id: string) => {
    const value = borrower.values[id]
    return isSeries(value) && value.length >= 2 ? value : undefined
  }
  const funded = borrower.markets.filter(
    (row) => row.state === "Ok" && isFunded(row.values),
  )
  const coverage: [string, string] = [
    shared("parts.coverage"),
    shared("parts.partial"),
  ]
  const data: Record<string, IndexDatum> = {}
  BORROWER_CARDS.forEach((card) => {
    const spec = specs[card]
    if (!spec) return
    const datum = datumFromSpec(spec, evidence)
    datum.median = spec.compare
    datum.sentence = spec.sub
      ? shared("valueSub", { value: spec.value, sub: spec.sub })
      : spec.value
    datum.parts = [[shared("parts.headline"), spec.value]]
    if (spec.sub) datum.parts.push([shared("parts.record"), spec.sub])
    if (spec.compare)
      datum.parts.push([shared("parts.comparison"), spec.compare])
    if (borrower.partial) datum.parts.push(coverage)
    if (!funded.length) datum.unavailable = shared("noFundedMarket")
    data[card] = datum
  })

  // ---------- 3.1 In order, all markets ----------
  const inOrder = data["3.1"]
  const cash = n("S05")
  const kept = n("D21")
  if (
    inOrder &&
    marketDays !== undefined &&
    marketDays > 0 &&
    cash !== undefined
  ) {
    const comparison = cmp.S05
    const short = 100 - cash
    const history = {
      days: counted("marketDay", marketDays),
      cash: percent(cash),
    }
    inOrder.rail = cash
    inOrder.railMed = comparison?.median ?? -1
    inOrder.medText = comparison ? score(comparison.median) : undefined
    inOrder.better = "higher"
    inOrder.sentence = borrower.partial
      ? t31("sentencePartial", history)
      : t31("sentence", history)
    if (comparison?.betterThan !== undefined)
      inOrder.rank = [comparison.betterThan, comparison.population]
    inOrder.parts = [
      [t31("parts.cash"), score(cash)],
      [t31("parts.days"), count(marketDays)],
    ]
    if (kept !== undefined) inOrder.parts.push([t31("parts.kept"), score(kept)])
    const floor = n("S06")
    const top = n("S07")
    if (floor !== undefined && top !== undefined)
      inOrder.parts.push([
        t31("parts.range"),
        text("shared.range", { low: score(floor), high: score(top) }),
      ])
    if (borrower.partial) inOrder.parts.push(coverage)
    // Short market-days out of every 100, weighted by market age (S05).
    inOrder.grace = short
    inOrder.past = 0
    inOrder.countClaim =
      short <= 0 ? t31("claimNever") : t31("claim", { n: per100(short) })
    const shortOf = {
      short: percent(short),
      days: counted("marketDay", marketDays),
    }
    inOrder.countNote =
      kept === undefined
        ? t31("countNote", shortOf)
        : t31("countNoteKept", { ...shortOf, kept: contractKept(kept) })
    const shortDays = (short / 100) * marketDays
    const pastDays =
      kept === undefined ? undefined : ((100 - kept) / 100) * marketDays
    const w = widths([marketDays - shortDays, shortDays, pastDays ?? 0])
    const pastBucket: Bucket[] =
      pastDays === undefined
        ? []
        : [[t31("buckets.past"), days(pastDays), w[2], RED]]
    inOrder.buckets = [
      [t31("buckets.cashThere"), days(marketDays - shortDays), w[0], GREEN],
      [t31("buckets.short"), days(shortDays), w[1], AMBER],
      ...pastBucket,
    ]
    inOrder.bucketNote = t31("buckets.note")
    inOrder.sideBySide = [
      ...versus(t31("sideBySide.cash"), cash, comparison, score),
      ...versus(t31("sideBySide.kept"), kept, cmp.D21, contractKept),
    ]
    const lateShare = seriesOf("LATE_SHARE_90D")
    if (lateShare) {
      const inOrderSeries = lateShare.map(([time, share]): [number, number] => [
        time,
        100 - share,
      ])
      const first = inOrderSeries[0]
      const last = inOrderSeries[inOrderSeries.length - 1]
      inOrder.trend = [
        sampleSeries(inOrderSeries).map((value) => Math.max(0, value)),
        shared("trendOn", {
          value: score(first[1]),
          date: longDate(first[0]),
        }),
        shared("trendNow", { value: score(last[1]) }),
        t31("trend"),
      ]
    }
  }
  if (inOrder && funded.length && cash === undefined)
    inOrder.unavailable = t31("noHistory")
  if (inOrder)
    inOrder.reasons = {
      ...(inOrder.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.S05))),
      M: t31("reasons.M"),
      ...(inOrder.trend
        ? {}
        : { O: seriesReason(borrower.values.LATE_SHARE_90D) }),
    }

  // ---------- 3.4 Right now, all markets ----------
  const now = data["3.4"]
  if (now) {
    const state = bookState(borrower)
    const onTime = state.now.open - state.now.late - state.now.unknown
    now.verdict = {
      green: "STRONG" as const,
      amber: "WATCH" as const,
      red: "PROBLEM" as const,
      neutral: "CONTEXT" as const,
    }[state.tone]
    now.parts = [
      [t34("parts.open"), count(state.now.open)],
      [t34("parts.within"), count(state.now.late - state.now.past)],
      [t34("parts.past"), count(state.now.past)],
      [t34("parts.unavailable"), count(state.now.unknown)],
    ]
    if (state.now.incomplete) now.parts.push(coverage)
    // The receivables-aging convention across the open markets.
    if (state.now.open > 0) {
      const counts = [
        onTime,
        state.now.late - state.now.past,
        state.now.past,
        state.now.unknown,
      ]
      const w = widths(counts)
      const unknownBucket: Bucket[] = counts[3]
        ? [
            [
              t34("buckets.unavailable"),
              counted("market", counts[3]),
              w[3],
              GHOST,
            ],
          ]
        : []
      now.buckets = [
        [t34("buckets.onTime"), counted("market", counts[0]), w[0], GREEN],
        [t34("buckets.within"), counted("market", counts[1]), w[1], AMBER],
        [t34("buckets.past"), counted("market", counts[2]), w[2], RED],
        ...unknownBucket,
      ]
      now.bucketNote = t34("buckets.note")
    }
    // The tightest open market: the late one nearest (or furthest past) its
    // limit, or else the one whose contract asks most of its cash. Grace
    // countdown (D05) is the hours left in the allowance, negative once past.
    const clock = (row: BorrowerMarketRow) => {
      const { n: value } = reader(row.values)
      const grace = value("M15")
      const left = value("D05")
      return grace === undefined || left === undefined
        ? undefined
        : grace - left
    }
    const late = state.now.lateRows
      .map((row) => ({ row, used: clock(row) }))
      .filter(
        (entry): entry is { row: BorrowerMarketRow; used: number } =>
          entry.used !== undefined,
      )
      .sort((left, right) => right.used - left.used)[0]
    const openRows = funded.filter((row) => row.values.M77 === "Open")
    const tightest = openRows
      .filter(
        (row) =>
          isNumber(row.values.M08) &&
          row.values.M08 > 0 &&
          isNumber(row.values.REQUIRED_CASH),
      )
      .map((row) => ({
        row,
        share:
          (100 * Number(row.values.REQUIRED_CASH)) / Number(row.values.M08),
      }))
      .sort((left, right) => right.share - left.share)[0]
    if (late) {
      const grace = Number(late.row.values.M15)
      const over = late.used > grace
      now.cov = [
        late.used,
        grace,
        shared("allowanceIn", {
          grace: hours(grace),
          market: marketLabel(late.row),
        }),
        over
          ? shared("pastLimit", { hours: hours(late.used - grace) })
          : t34("cov.left", { hours: hours(grace - late.used) }),
        t34("cov.clockNote"),
      ]
    } else if (tightest && !state.now.late)
      now.cov = [
        tightest.share,
        100,
        t34("cov.cashLimit", { market: marketLabel(tightest.row) }),
        t34("cov.spare", {
          share: percent(Math.max(0, 100 - tightest.share)),
        }),
        t34("cov.cashNote"),
      ]
    let noLimit = t34("reasons.pending")
    if (state.now.open === 0) noLimit = t34("reasons.noOpen")
    else if (openRows.some((row) => isNumber(row.values.REQUIRED_CASH)))
      noLimit = t34("reasons.noCash")
    const lateShare = seriesOf("LATE_SHARE_90D")
    if (lateShare && state.now.open > 0) {
      const recent = lateShare.slice(-24)
      const peak = Math.max(0, ...recent.map(([, value]) => value))
      const weeks = counted("week", recent.length)
      now.trend = [
        scaled(recent.map(([, value]) => value)),
        shared("weeksAgo", { weeks }),
        shared("thisWeek"),
        peak > 0
          ? t34("trend", { weeks, peak: percent(peak) })
          : t34("trendNone", { weeks }),
      ]
    }
    now.reasons = {
      ...reasonFor(["E", "I"], shared("liveNotRanked")),
      ...(now.buckets ? {} : { L: t34("reasons.L") }),
      ...(now.cov ? {} : { M: noLimit }),
      ...(now.trend
        ? {}
        : {
            O:
              state.now.open === 0
                ? t34("reasons.trendNoOpen")
                : seriesReason(borrower.values.LATE_SHARE_90D),
          }),
    }
  }

  // ---------- 3.6 Completed credit cycle ----------
  const cycle = data["3.6"]
  if (cycle) {
    // Capital is already guarded for mixed assets and partial books by the spec.
    const markets = n("S01")
    const completed = n("S30")
    const verified = n("S33")
    const clean = n("S34")
    const share = n("S32")
    if (completed !== undefined)
      cycle.parts.push([t36("parts.completed"), count(completed)])
    if (verified !== undefined)
      cycle.parts.push([t36("parts.verified"), count(verified)])
    if (clean !== undefined)
      cycle.parts.push([t36("parts.clean"), count(clean)])
    if (share !== undefined) {
      cycle.parts.push([t36("parts.share"), percent(share)])
      cycle.grace = share
      cycle.past = 0
      cycle.countClaim = t36("claim", { n: per100(share) })
      cycle.countNote = t36("countNote", {
        facilities: counted("completedFacility", completed ?? 0),
        markets: counted("fundedMarket", markets ?? 0),
      })
      cycle.rail = one(share)
      cycle.railMed = cmp.S32 ? one(cmp.S32.median) : -1
      cycle.railValue = t36("railValue", { share: percent(share) })
      cycle.medText = cmp.S32 ? percent(cmp.S32.median) : undefined
    }
    cycle.rank = positionOf(cmp.S32)
    cycle.rankHigher = t36("rankHigher")
    if (
      markets !== undefined &&
      completed !== undefined &&
      clean !== undefined
    ) {
      const counts = [clean, completed - clean, markets - completed]
      const w = widths(counts)
      cycle.buckets = [
        [t36("buckets.clean"), counted("market", counts[0]), w[0], GREEN],
        [t36("buckets.incident"), counted("market", counts[1]), w[1], AMBER],
        [t36("buckets.running"), counted("market", counts[2]), w[2], GHOST],
      ]
      cycle.bucketNote = t36("buckets.note")
    }
    const completions = seriesOf("COMPLETED_TO_DATE")
    if (completions && completed) {
      const samples = sampleSeries(completions, true)
      cycle.trend = [
        scaled(samples),
        shared("trendBy", {
          value: count(completions[0][1]),
          date: longDate(completions[0][0]),
        }),
        shared("trendNow", {
          value: count(completions[completions.length - 1][1]),
        }),
        t36("trend"),
      ]
    }
    cycle.sideBySide = [
      ...versus(t36("sideBySide.share"), share, cmp.S32, percent),
      ...versus(t36("sideBySide.facilities"), completed, cmp.S30, count),
    ]
    cycle.reasons = {
      ...(cycle.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.S32))),
      ...(cycle.rail >= 0 && cycle.railMed < 0
        ? reasonFor(["K", "N"], t36("reasons.noMedian"))
        : {}),
      M: t36("reasons.M"),
      ...(cycle.trend
        ? {}
        : {
            O: completed
              ? seriesReason(borrower.values.COMPLETED_TO_DATE)
              : t36("reasons.none"),
          }),
    }
  }

  // ---------- 3.8 Discipline ----------
  // Grace breaches: episodes that ran past their grace period, per 100.
  const discipline = data["3.8"]
  const breaches = n("S13")
  const incidents = n("S12")
  if (discipline) {
    const rate = n("BREACHES_PER_100")
    const comparison = cmp.BREACHES_PER_100
    if (incidents === 0) discipline.unavailable = shared("noIncidents")
    if (breaches !== undefined && incidents !== undefined) {
      const record = {
        breaches: counted("graceBreach", breaches),
        incidents: counted("incident", incidents),
      }
      discipline.sentence =
        rate === undefined
          ? t38("sentence", record)
          : t38("sentenceRate", { ...record, rate: score(rate) })
    }
    if (rate !== undefined && breaches !== undefined && incidents) {
      discipline.grace = 0
      discipline.past = rate
      discipline.countClaim =
        breaches === 0 ? t38("claimNone") : t38("claim", { n: per100(rate) })
      discipline.countNote = t38("countNote", {
        breaches: count(breaches),
        incidents: counted("incident", incidents),
        markets: counted("market", funded.length),
      })
      discipline.rail = one(rate)
      discipline.railMed = comparison ? one(comparison.median) : -1
      discipline.railMax = railEnd(rate, comparison?.median ?? 0, 4)
      discipline.railValue = t38("railValue", { rate: score(rate) })
      discipline.medText = comparison ? score(comparison.median) : undefined
      discipline.better = "lower"
    }
    if (comparison?.betterThan !== undefined)
      discipline.rank = [comparison.betterThan, comparison.population]
    // Where the breaches happened: the markets with the most, of their incidents.
    const perMarket = funded
      .map((row) => {
        const { n: value } = reader(row.values)
        return {
          row,
          breaches: value("M25"),
          incidents: (value("M20") ?? 0) + openEpisodes(row.values),
        }
      })
      .filter(
        (
          entry,
        ): entry is {
          row: BorrowerMarketRow
          breaches: number
          incidents: number
        } => entry.breaches !== undefined && entry.incidents > 0,
      )
      .sort(
        (left, right) =>
          right.breaches - left.breaches || right.incidents - left.incidents,
      )
    if (perMarket.length) {
      const shown = perMarket.slice(0, ROWS)
      const w = widths(shown.map((entry) => entry.incidents))
      discipline.buckets = shown.map((entry, index) => [
        marketLabel(entry.row),
        t38("buckets.marketBreaches", {
          breaches: count(entry.breaches),
          incidents: count(entry.incidents),
        }),
        w[index],
        entry.breaches ? RED : GREEN,
      ])
      discipline.bucketNote =
        perMarket.length > ROWS
          ? t38("buckets.noteMore", {
              shown: count(ROWS),
              total: count(perMarket.length),
            })
          : t38("buckets.note")
    }
    // The book's longest incident against its own market's allowance.
    const longestRow = funded
      .filter((row) => isNumber(row.values.M23) && isNumber(row.values.M15))
      .sort(
        (left, right) => Number(right.values.M23) - Number(left.values.M23),
      )[0]
    const longest = n("D15")
    if (
      longestRow &&
      longest !== undefined &&
      Number(longestRow.values.M15) > 0
    ) {
      const grace = Number(longestRow.values.M15)
      const over = longest > grace
      discipline.cov = [
        longest,
        grace,
        shared("allowanceIn", {
          grace: hours(grace),
          market: marketLabel(longestRow),
        }),
        over
          ? shared("pastLimit", { hours: hours(longest - grace) })
          : shared("room", { hours: hours(grace - longest) }),
        t38("cov.note"),
      ]
    }
    const toDate = seriesOf("BREACHES_TO_DATE")
    if (toDate) {
      const samples = sampleSeries(toDate)
      const first = toDate[0]
      const last = toDate[toDate.length - 1]
      const peak = Math.max(0, ...samples)
      discipline.trend = [
        scaled(samples),
        shared("trendBy", {
          value: score(first[1]),
          date: longDate(first[0]),
        }),
        shared("trendNow", { value: score(last[1]) }),
        peak > 0 ? t38("trend", { peak: score(peak) }) : t38("trendNone"),
      ]
    }
    discipline.sideBySide = [
      ...versus(t38("sideBySide.rate"), rate, comparison, score),
      ...versus(t38("sideBySide.incidents"), incidents, cmp.S12, count),
      ...versus(t38("sideBySide.average"), n("D16"), cmp.D16, hours),
    ]
    discipline.reasons = {
      ...(discipline.rank ? {} : reasonFor(["E", "I"], notRanked(comparison))),
      ...(discipline.rail >= 0 && discipline.railMed < 0
        ? reasonFor(["K", "N"], t38("reasons.noMedian"))
        : {}),
      ...(discipline.trend
        ? {}
        : { O: seriesReason(borrower.values.BREACHES_TO_DATE) }),
    }
  }

  // ---------- 3.10 Lender breadth ----------
  const breadth = data["3.10"]
  const lenders = n("S37")
  if (breadth) {
    const comparison = cmp.S37
    if (lenders !== undefined) {
      const funders = {
        count: lenders,
        lenders: counted("distinctLender", lenders),
      }
      breadth.sentence = borrower.partial
        ? t310("sentencePartial", funders)
        : t310("sentence", funders)
      breadth.rail = lenders
      breadth.railMed = comparison?.median ?? -1
      breadth.railMax = railEnd(lenders, comparison?.median ?? 0)
      breadth.medText = comparison ? count(comparison.median) : undefined
    }
    // A lender count is a measure, not a grade: its place, not "better than".
    breadth.rank = positionOf(comparison)
    breadth.rankHigher = t310("rankHigher")
    const perMarket = funded
      .map((row) => ({ row, lenders: reader(row.values).n("M49") ?? 0 }))
      .filter((entry) => entry.lenders > 0)
      .sort((left, right) => right.lenders - left.lenders)
    if (perMarket.length) {
      const shown = perMarket.slice(0, ROWS)
      const w = widths(shown.map((entry) => entry.lenders))
      breadth.buckets = shown.map((entry, index) => [
        marketLabel(entry.row),
        count(entry.lenders),
        w[index],
        PURPLE,
      ])
      breadth.bucketNote =
        perMarket.length > ROWS
          ? t310("buckets.noteMore", {
              shown: count(ROWS),
              total: count(perMarket.length),
            })
          : t310("buckets.note")
    }
    const toDate = seriesOf("LENDERS_TO_DATE")
    if (toDate && lenders) {
      breadth.trend = [
        scaled(sampleSeries(toDate, true)),
        shared("trendBy", {
          value: counted("lender", toDate[0][1]),
          date: longDate(toDate[0][0]),
        }),
        shared("trendNow", { value: count(toDate[toDate.length - 1][1]) }),
        t310("trend"),
      ]
    }
    breadth.sideBySide = [
      ...versus(t310("sideBySide.lenders"), lenders, comparison, count),
      ...versus(t310("sideBySide.markets"), n("S01"), cmp.S01, count),
    ]
    breadth.reasons = {
      ...reasonFor(["B", "G"], t310("reasons.count")),
      ...(breadth.rank ? {} : reasonFor(["E", "I"], notRanked(comparison))),
      ...(breadth.rail >= 0 && breadth.railMed < 0
        ? reasonFor(["K", "N"], t310("reasons.noMedian"))
        : {}),
      ...(breadth.buckets ? {} : { L: t310("reasons.none") }),
      M: t310("reasons.M"),
      ...(breadth.trend
        ? {}
        : {
            O: lenders
              ? seriesReason(borrower.values.LENDERS_TO_DATE)
              : t310("reasons.none"),
          }),
    }
  }
  return data
}
