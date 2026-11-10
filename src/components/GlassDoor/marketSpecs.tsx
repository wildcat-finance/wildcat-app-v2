import * as React from "react"

import { BorrowerAnalytics, Comparison, MarketAnalytics } from "./api"
import { borrowerNow, marketLabel } from "./borrowerSpecs"
import { CardSpec } from "./card"
import {
  C,
  FillBar,
  HATCH,
  Histogram,
  IncidentRow,
  MARK_LIMIT,
  MarkArray,
  RankStrip,
  StackedBar,
  StateBox,
  StateRow,
  Tbd,
  ThresholdSliver,
  TrendPair,
  TwoLensesBar,
  WorstIncidentBars,
} from "./charts"
import {
  ageDays,
  apr,
  BLANK,
  contractKept,
  count,
  counted,
  days,
  hours,
  isNumber,
  lifeShare,
  percent,
  percentOf,
  range,
  score,
  trend,
  units,
  withAsset,
} from "./format"
import {
  cycleStatus,
  isFunded,
  isoDay,
  join,
  lifecycle,
  openEpisodes,
  ordinal,
  RankNoun,
  rankPhrase,
  reader,
  sentence,
  yesNo,
} from "./helpers"
import {
  GATES,
  LIMITED_NOTE,
  penaltyChip,
  Tone,
  Verdict,
  verdictExits,
  verdictInOrder,
  verdictWorstIncident,
} from "./rules"
import { scoped, text } from "./text"

// Every sentence on the market cards. The words are in glassDoor.json under
// cards.card_2_x; this file decides which sentence applies and fills in the
// formatted numbers.

const DAY = 86_400
const NA = BLANK.unavailable
const shared = scoped("cards.shared")
const c21 = scoped("cards.card_2_1")
const c22 = scoped("cards.card_2_2")
const c23 = scoped("cards.card_2_3")
const c24 = scoped("cards.card_2_4")
const c25 = scoped("cards.card_2_5")
const c26 = scoped("cards.card_2_6")
const c28 = scoped("cards.card_2_8")
const c29 = scoped("cards.card_2_9")
const c210 = scoped("cards.card_2_10")

/** A LIMITED verdict always carries its note. */
const limited = (verdict: Verdict | null, sub: string) =>
  verdict === "LIMITED" ? join(sub, LIMITED_NOTE) : sub

/** The borrower record from the same publication, when it is complete. */
export const sameBook = (
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) =>
  borrower &&
  !borrower.partial &&
  borrower.state === "Ok" &&
  market.state === "Ok" &&
  borrower.publication.id === market.publication.id &&
  borrower.borrower.chainId === market.market.chainId &&
  borrower.publication.cut?.hash === market.publication.cut?.hash
    ? borrower
    : undefined

/** The borrower's funded markets that carry a grade, as the book counts them. */
const fundedGrades = (book: BorrowerAnalytics) =>
  book.markets
    .filter(
      (row) =>
        row.state === "Ok" &&
        isFunded(row.values) &&
        reader(row.values).n("H01") !== 0 &&
        isNumber(row.values.M18),
    )
    .map((row) => ({
      address: row.address.toLowerCase(),
      grade: Number(row.values.M18),
    }))

/** This market among the borrower's funded markets by M18; ties share a place. */
export function borrowerPosition(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) {
  const book = sameBook(market, borrower)
  if (!book) return undefined
  const grades = fundedGrades(book)
  const own = grades.find(
    (row) => row.address === market.market.address.toLowerCase(),
  )
  if (!own || grades.length < 2) return undefined
  const min = Math.min(...grades.map((row) => row.grade))
  const max = Math.max(...grades.map((row) => row.grade))
  const tied = grades.filter((row) => row.grade === own.grade).length > 1
  const place = grades.filter((row) => row.grade > own.grade).length + 1
  const weakest = own.grade !== max && own.grade === min
  let word = c21("place.nth", { rank: ordinal(place) })
  if (own.grade === max) word = c21("place.strongest")
  else if (weakest) word = c21("place.weakest")
  if (tied) word = c21("place.joint", { place: word })
  return { count: grades.length, min, max, weakest, tied, word }
}

const rank = (comparison: Comparison | undefined, noun: RankNoun) =>
  comparison?.betterThan === undefined ? undefined : (
    <RankStrip
      position={comparison.betterThan}
      population={comparison.population}
      label={text("shared.rank.stripLabel", {
        position: count(comparison.betterThan),
        population: count(comparison.population),
        noun: text(`shared.rank.${noun}`),
      })}
    />
  )

export function marketSpecs(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
  /** Market type labels (G4), from the market's hooks and app data. */
  typeLabels?: string[],
) {
  const { n, s } = reader(market.values)
  const cmp = market.comparisons
  const { protocol } = market
  const book = sameBook(market, borrower)
  const bookValues = book ? reader(book.values) : undefined
  const singleMarket = book !== undefined && fundedGrades(book).length < 2
  const position = borrowerPosition(market, borrower)
  const asset = s("M02")
  const amount = (value?: number) =>
    value === undefined ? NA : withAsset(units(value), asset)
  const show = <T,>(value: T | undefined, format: (value: T) => string) =>
    value === undefined ? NA : format(value)

  const life = n("H01")
  const late = n("H02")
  const cash = n("M18")
  const age = n("M05")
  const grace = n("M15")
  const hasRecord = life !== undefined && life > 0
  const penalty = hasRecord ? n("M26") : undefined
  const kept = penalty === undefined ? undefined : 100 - penalty
  const neverLate = hasRecord && late === 0
  const finished = n("M20")
  const open = openEpisodes(market.values)
  const episodes = finished === undefined ? undefined : finished + open
  const quiet = n("M80")
  const owed = n("M07")
  const stale =
    quiet !== undefined && quiet > 24 && owed !== undefined && owed > 0
  const closed = s("M77") === "Closed"
  const trailing = n("M67")
  const change = n("M68")
  const lateNow = n("M21")
  const pastNow = n("M85")
  // Why a value with no record is blank.
  const noRecordOr = life === 0 ? BLANK.noRecord : NA
  // A finished market's grades are frozen at closure, not live verdicts.
  let frozen: string | undefined
  if (closed)
    frozen =
      age === undefined
        ? shared("frozen")
        : shared("frozenRecorded", { days: counted("day", age) })
  const finishedFlag = closed
    ? { flag: text("shared.flag.finished"), flagTone: "neutral" as const }
    : {}
  const openBookRows = (book?.markets ?? []).filter(
    (row) =>
      row.state === "Ok" && row.values.M77 === "Open" && isFunded(row.values),
  )
  /** "24 h" when every market agrees, else "24 h to 72 h". */
  const spread = (values: number[], format: (value: number) => string) =>
    range(format(Math.min(...values)), format(Math.max(...values)))
  const borrowerChip = (chip: string | undefined) => {
    if (singleMarket) return shared("singleMarket")
    return chip ?? BLANK.noBook
  }
  /** The open-market chip when the borrower has fewer than two open markets. */
  const fewOpen = (
    describe: (row: (typeof openBookRows)[number]) => string,
  ) => {
    if (!book) return BLANK.noBook
    const own = market.market.address.toLowerCase()
    if (openBookRows.length === 0) return shared("noOpenMarket")
    const [only] = openBookRows
    return only.address.toLowerCase() === own
      ? shared("onlyOpenMarket")
      : shared("oneOpenMarket", {
          market: marketLabel(only),
          detail: describe(only),
        })
  }
  /** "12 episodes", with any still open named beside the count. */
  const episodesText = show(episodes, (value) =>
    open
      ? shared("stillOpen", {
          episodes: counted("episode", value),
          open: count(open),
        })
      : counted("episode", value),
  )

  // The book's graded markets when this one has no grade of its own yet.
  const bookGrades = book ? fundedGrades(book) : []
  const gradedRange =
    bookGrades.length > 1
      ? c21("chips.gradedRange", {
          n: count(bookGrades.length),
          low: score(Math.min(...bookGrades.map((row) => row.grade))),
          high: score(Math.max(...bookGrades.map((row) => row.grade))),
        })
      : undefined

  // ---------- 2.1 In order ----------
  const graded = hasRecord && !neverLate && cash !== undefined
  let inOrderValue: string = NA
  if (life === 0) inOrderValue = BLANK.noHistory
  else if (neverLate) inOrderValue = BLANK.neverLate
  else if (graded) inOrderValue = score(cash)
  const inOrderVerdict =
    hasRecord && cash !== undefined && !closed
      ? verdictInOrder({ score: cash, trend: change, days: age, stale })
      : null
  // Why the trailing window (M67, M68) has no reading.
  let trendBlank = c21("formula.trendShortWindow")
  if (life === 0) trendBlank = BLANK.noRecord
  else if (closed) trendBlank = c21("formula.trendClosed")
  let cashLine = c21("formula.cashBlank", { reason: noRecordOr })
  if (neverLate) cashLine = c21("formula.cashNeverLate")
  else if (hasRecord && late !== undefined && cash !== undefined)
    cashLine = c21("formula.cash", {
      late: score(late / DAY),
      life: score(life / DAY),
      cash: score(cash),
    })
  let inOrderCompare = ""
  if (cmp.M18)
    inOrderCompare = cmp.M26
      ? c21("compare.cashAndKept", {
          cash: score(cmp.M18.median),
          kept: contractKept(100 - cmp.M26.median),
        })
      : c21("compare.cash", { cash: score(cmp.M18.median) })
  const inOrder: CardSpec = {
    id: "2.1",
    page: "market",
    ids: c21("ids"),
    kind: graded ? "score" : "text",
    value: inOrderValue,
    verdict: inOrderVerdict,
    ...(hasRecord ? finishedFlag : {}),
    sub: limited(
      inOrderVerdict,
      join(
        frozen,
        kept === undefined
          ? undefined
          : c21("sub.contractKept", { kept: contractKept(kept) }),
        stale && !closed
          ? c21("sub.silent", { quiet: hours(quiet!) })
          : undefined,
      ),
    ),
    compare: inOrderCompare,
    formula: [
      cashLine,
      penalty === undefined
        ? c21("formula.keptBlank", { reason: noRecordOr })
        : c21("formula.kept", {
            penalty: score(penalty, 2),
            kept: score(kept!, 2),
          }),
      trailing !== undefined && cash !== undefined && change !== undefined
        ? c21("formula.trend", {
            trailing: score(trailing),
            cash: score(cash),
            change: trend(change),
          })
        : c21("formula.trendBlank", { reason: trendBlank }),
    ].join("\n"),
    numbers: sentence(
      c21("numbers.life", { life: show(life, (v) => days(v / DAY)) }),
      c21("numbers.late", { late: show(late, (v) => days(v / DAY)) }),
      c21("numbers.past", {
        past: life === 0 ? BLANK.noRecord : show(penalty, lifeShare),
      }),
      c21("numbers.episodes", { episodes: episodesText }),
      c21("numbers.age", { age: show(age, (v) => counted("day", v)) }),
      c21("numbers.quiet", { quiet: show(quiet, hours) }),
    ),
    chart: {
      expanded:
        hasRecord && cash !== undefined ? (
          <>
            <TwoLensesBar
              inOrder={cash}
              pastAllowance={penalty ?? 0}
              caption={c21("chart.lenses", { days: score(life / DAY) })}
            />
            {trailing !== undefined && change !== undefined ? (
              <TrendPair
                lifetime={cash}
                trailing={trailing}
                caption={c21("chart.trend", { change: trend(change) })}
              />
            ) : null}
          </>
        ) : undefined,
    },
    chips: {
      median: cmp.M18
        ? c21("chips.median", {
            median: score(cmp.M18.median),
            population: count(cmp.M18.population),
          })
        : BLANK.noMedianMarket,
      markets: rankPhrase(cmp.M18, "markets", age),
      borrower: borrowerChip(
        position
          ? c21("chips.position", {
              n: count(position.count),
              low: score(position.min),
              high: score(position.max),
              place: position.word,
            })
          : gradedRange,
      ),
    },
    chipCharts: { markets: rank(cmp.M18, "markets") },
  }

  // ---------- 2.2 Worst incident ----------
  const longest = n("M23")
  // Grace breaches: episodes that ran past grace (M25); the rest of the
  // finished ones were cured within grace (M83).
  const breaches = n("M25")
  const curedInTime = n("M83")
  const curedText = (() => {
    if (curedInTime !== undefined) return percent(curedInTime)
    return finished === 0 ? BLANK.noFinishedEpisode : NA
  })()
  const worst =
    life !== 0 && grace !== undefined && grace > 0 ? n("M24") : undefined
  // The longest episode and the live state decide this, not the finished count.
  const noIncident =
    hasRecord &&
    open === 0 &&
    lateNow !== 1 &&
    pastNow !== 1 &&
    (longest === 0 || (longest === undefined && neverLate))
  let worstValue: string = noRecordOr
  if (noIncident) worstValue = BLANK.neverLate
  else if (grace === 0 && longest !== undefined) worstValue = hours(longest)
  else if (worst !== undefined) worstValue = percent(worst)
  let worstFormula = c22("formula.blank", { reason: noRecordOr })
  if (noIncident) worstFormula = c22("formula.noIncident")
  else if (grace === 0) worstFormula = c22("formula.noGrace")
  else if (worst !== undefined && longest !== undefined && grace !== undefined)
    worstFormula = c22("formula.worst", {
      longest: hours(longest),
      grace: hours(grace),
      worst: percent(worst),
    })
  const incidentRows: IncidentRow[] = []
  if (longest && grace && !noIncident)
    incidentRows.push({
      label: s("M01") ?? c22("chart.thisMarket"),
      hours: longest,
      graceHours: grace,
    })
  book?.markets.forEach((row) => {
    const { n: value } = reader(row.values)
    if (
      row.address.toLowerCase() === market.market.address.toLowerCase() ||
      row.state !== "Ok" ||
      !isFunded(row.values) ||
      !value("M23") ||
      !value("M15")
    )
      return
    incidentRows.push({
      label: row.symbol ?? row.address.slice(0, 10),
      hours: value("M23")!,
      graceHours: value("M15")!,
    })
  })
  // Longest episode, all markets (D15), in hours.
  const bookLongest = bookValues?.n("D15")
  const worstVerdict =
    closed || grace === 0 ? null : verdictWorstIncident(noIncident ? 0 : worst)
  let worstSub = ""
  if (noIncident) worstSub = c22("sub.noIncident")
  else if (grace === 0) worstSub = c22("sub.noGrace")
  else if (worst !== undefined && worst > 100 && penalty === 0)
    worstSub = c22("sub.noPenalty")
  else if (worst !== undefined) worstSub = c22("sub.ofAllowance")
  let bookLongestChip: string | undefined
  if (bookLongest !== undefined)
    bookLongestChip =
      longest !== undefined && Math.abs(bookLongest - longest) < 0.05
        ? c22("chips.bookThis", { longest: hours(bookLongest) })
        : c22("chips.book", { longest: hours(bookLongest) })
  const worstIncident: CardSpec = {
    id: "2.2",
    page: "market",
    ids: c22("ids"),
    kind: worst !== undefined && !noIncident ? "pct" : "text",
    value: worstValue,
    verdict: worstVerdict,
    ...(hasRecord ? finishedFlag : {}),
    sub: join(frozen, worstSub),
    compare: cmp.M24
      ? c22("compare", { median: percent(cmp.M24.median, 0) })
      : "",
    formula: [
      worstFormula,
      c22("formula.breaches", {
        breaches: show(breaches, count),
        episodes: show(episodes, (v) => counted("episode", v)),
      }),
      c22("formula.cured", { cured: curedText }),
    ].join("\n"),
    numbers: sentence(
      c22("numbers.longest", { longest: show(longest, hours) }),
      c22("numbers.allowance", { grace: show(grace, hours) }),
      c22("numbers.breaches", {
        breaches: show(breaches, (v) => counted("breach", v)),
        episodes: show(episodes, (v) => counted("episode", v)),
      }),
      c22("numbers.cured", { cured: curedText }),
    ),
    chart: {
      expanded: incidentRows.length ? (
        <WorstIncidentBars rows={incidentRows} />
      ) : undefined,
    },
    chips: {
      median: cmp.M24
        ? c22("chips.median", {
            median: percent(cmp.M24.median, 0),
            population: count(cmp.M24.population),
          })
        : BLANK.noMedianMarket,
      markets: rankPhrase(cmp.M24, "markets"),
      borrower: borrowerChip(bookLongestChip),
    },
    chipCharts: { markets: rank(cmp.M24, "markets") },
  }

  // ---------- 2.3 Exits paid on time ----------
  const deadlines = n("M30")
  const covered = n("M31")
  const rate = n("M32")
  const byMoney = n("M33")
  const paidLate = n("D18_LATE")
  const unpaid = n("D18_NEVER")
  const missed =
    deadlines !== undefined && covered !== undefined
      ? deadlines - covered
      : undefined
  const splitKnown =
    paidLate !== undefined &&
    unpaid !== undefined &&
    paidLate + unpaid === missed
  const held = n("M08")
  const unclaimed = n("M38")
  const out = n("M58")
  const borrowed = n("M56")
  const repaid = n("M57")
  const onHand =
    held !== undefined && unclaimed !== undefined ? held - unclaimed : undefined
  let exitFormula = c23("formula.blank", { reason: NA })
  if (deadlines === 0) exitFormula = c23("formula.none")
  else if (
    deadlines !== undefined &&
    covered !== undefined &&
    rate !== undefined
  )
    exitFormula = c23("formula.rate", {
      covered: count(covered),
      deadlines: count(deadlines),
      rate: score(rate),
    })
  const deadlineGroups =
    covered !== undefined && missed !== undefined && missed >= 0
      ? [
          { count: covered, color: C.fg2, label: c23("chart.funded") },
          ...(splitKnown
            ? [
                {
                  count: paidLate!,
                  color: HATCH,
                  label: c23("chart.paidLate"),
                },
                {
                  count: unpaid!,
                  color: C.red,
                  label: c23("chart.neverPaid"),
                },
              ]
            : [
                {
                  count: missed,
                  color: HATCH,
                  label: c23("chart.notCovered"),
                },
              ]),
        ]
      : []
  // One mark per deadline below the counting limit, else one stacked bar.
  let deadlineChart: React.ReactNode = null
  if (deadlines && deadlineGroups.length)
    deadlineChart =
      deadlines <= MARK_LIMIT ? (
        <MarkArray
          groups={deadlineGroups}
          caption={
            splitKnown
              ? c23("chart.marksSplit", {
                  covered: count(covered!),
                  late: count(paidLate!),
                  never: count(unpaid!),
                })
              : c23("chart.marks", {
                  covered: count(covered!),
                  missed: count(missed!),
                })
          }
        />
      ) : (
        <StackedBar
          segments={deadlineGroups.map((group) => ({
            label: group.label,
            value: group.count,
            color: group.color === HATCH ? C.amber : group.color,
          }))}
          caption={c23("chart.byOutcome")}
        />
      )
  const exitVerdict = closed ? null : verdictExits({ pct: rate, deadlines })
  let notCoveredLine: string[] = []
  if (missed && missed > 0)
    notCoveredLine = [
      splitKnown
        ? c23("formula.notCoveredSplit", {
            missed: count(missed),
            late: count(paidLate!),
            never: count(unpaid!),
          })
        : c23("formula.notCovered", {
            missed: count(missed),
            blank: BLANK.splitSoon,
          }),
    ]
  const exits: CardSpec = {
    id: "2.3",
    page: "market",
    ids: c23("ids"),
    kind: deadlines ? "pct" : "text",
    value:
      deadlines === 0
        ? BLANK.noExits
        : show(deadlines && rate !== undefined ? rate : undefined, percent),
    verdict: exitVerdict,
    ...(deadlines ? finishedFlag : {}),
    sub: limited(
      exitVerdict,
      join(
        frozen && deadlines ? frozen : undefined,
        deadlines
          ? c23("sub.ofDeadlines", {
              deadlines: counted("payoutDeadline", deadlines),
            })
          : undefined,
      ),
    ),
    compare:
      cmp.M32 && deadlines !== 0
        ? c23("compare", { median: percent(cmp.M32.median) })
        : "",
    formula: [
      exitFormula,
      ...(deadlines && byMoney !== undefined
        ? [c23("formula.byMoney", { share: score(byMoney) })]
        : []),
      ...notCoveredLine,
      borrowed !== undefined && repaid !== undefined && out !== undefined
        ? c23("formula.out", {
            borrowed: units(borrowed),
            repaid: units(repaid),
            out: units(out),
          })
        : c23("formula.outBlank", { reason: NA }),
    ].join("\n"),
    numbers: sentence(
      c23("numbers.open", { n: show(n("M37"), count) }),
      c23("numbers.unclaimed", { amount: amount(unclaimed) }),
      c23("numbers.held", { amount: amount(held) }),
      c23("numbers.onHand", { amount: amount(onHand) }),
      deadlines
        ? c23("numbers.byMoney", { share: show(byMoney, percent) })
        : undefined,
    ),
    chart: {
      expanded: (
        <>
          {deadlineChart}
          {out !== undefined &&
          onHand !== undefined &&
          unclaimed !== undefined &&
          out >= 0 ? (
            <StackedBar
              segments={[
                { label: c23("chart.out"), value: out, color: C.fg2 },
                {
                  label: c23("chart.onHand"),
                  value: Math.max(0, onHand),
                  color: C.green,
                },
                {
                  label: c23("chart.reserved"),
                  value: unclaimed,
                  color: C.blue,
                },
              ]}
              format={units}
              caption={c23("chart.money")}
            />
          ) : null}
        </>
      ),
    },
    chips: {
      median: cmp.M32
        ? c23("chips.median", {
            median: percent(cmp.M32.median),
            population: count(cmp.M32.population),
          })
        : BLANK.noMedianMarket,
      markets: rankPhrase(cmp.M32, "markets"),
      borrower: borrowerChip(
        bookValues &&
          bookValues.n("S14") !== undefined &&
          bookValues.n("S15") !== undefined &&
          bookValues.n("S16") !== undefined
          ? c23("chips.book", {
              covered: count(bookValues.n("S15")!),
              deadlines: counted("deadline", bookValues.n("S14")!),
              share: percent(bookValues.n("S16")!),
            })
          : undefined,
      ),
    },
    chipCharts: { markets: rank(cmp.M32, "markets") },
  }

  // ---------- 2.4 Right now ----------
  const known = [0, 1].includes(lateNow!) && [0, 1].includes(pastNow!)
  // Grace countdown (D05): hours left in the allowance, negative once past it.
  const clock = n("D05")
  const countdown = clock === undefined ? undefined : Math.abs(clock)
  const cured = n("M84")
  const waiting = n("M37")
  const exitsWaiting = waiting
    ? c24("sub.exitsWaiting", { count: waiting, n: count(waiting) })
    : undefined
  const greenSub =
    finished && cured !== undefined
      ? c24("sub.cured", { days: ageDays(cured) })
      : BLANK.neverLate
  // A silent record can be short on paper while the chain's grace clock has
  // not started: it moves only when the market is next touched.
  const clockIdle =
    stale && lateNow === 1 && countdown !== undefined && countdown === grace
  let amberSub = ""
  if (clockIdle) amberSub = c24("sub.clockIdle", { quiet: hours(quiet!) })
  else if (countdown !== undefined && grace !== undefined)
    amberSub = c24("sub.left", { left: hours(countdown), grace: hours(grace) })
  let live: { state: Tone; label: string; sub: string } = {
    state: "neutral",
    label: c24("state.unavailable"),
    sub: "",
  }
  if (closed)
    live = {
      state: "neutral",
      label: c24("state.finished"),
      sub: c24("sub.finished"),
    }
  else if (known && pastNow === 1)
    live = {
      state: "red",
      label: c24("state.past"),
      sub: join(
        countdown === undefined
          ? undefined
          : c24("sub.past", { hours: hours(countdown) }),
        exitsWaiting,
      ),
    }
  else if (known && lateNow === 1)
    live = { state: "amber", label: c24("state.late"), sub: amberSub }
  else if (known)
    live = { state: "green", label: c24("state.inOrder"), sub: greenSub }
  let countdownText: string = NA
  if (closed) countdownText = c24("countdown.finished")
  else if (known) {
    if (live.state === "amber" && countdown !== undefined)
      countdownText = c24("countdown.left", { hours: hours(countdown) })
    else if (live.state === "red" && countdown !== undefined)
      countdownText = c24("countdown.past", { hours: hours(countdown) })
    else if (live.state === "green") countdownText = c24("countdown.notLate")
  }
  const graceText = grace === undefined ? c24("graceFallback") : hours(grace)
  const stateBoxes: StateBox[] = [
    {
      state: "green" as Tone,
      label: c24("state.inOrder"),
      sub:
        live.state === "green"
          ? c24("boxes.green", { sub: live.sub })
          : c24("boxes.greenExample"),
    },
    {
      state: "amber" as Tone,
      label: c24("state.late"),
      sub:
        live.state === "amber"
          ? c24("boxes.amber", { sub: live.sub })
          : c24("boxes.amberExample", { grace: graceText }),
    },
    {
      state: "red" as Tone,
      label: c24("state.past"),
      sub:
        live.state === "red"
          ? c24("boxes.red", { sub: live.sub || c24("boxes.redFallback") })
          : c24("boxes.redExample"),
    },
  ].map((box) => ({
    ...box,
    live: box.state === live.state,
    note: box.state === live.state ? c24("boxes.live") : undefined,
  }))
  const bookNow = book ? borrowerNow(book) : undefined
  let bookNowText: string | undefined
  if (bookNow && !bookNow.incomplete) {
    const lateOfOpen = {
      late: count(bookNow.late),
      markets: counted("market", bookNow.open),
    }
    if (!bookNow.open) bookNowText = c24("chips.bookNone")
    else if (bookNow.past)
      bookNowText = c24("chips.bookPast", {
        ...lateOfOpen,
        past: count(bookNow.past),
      })
    else if (bookNow.late) bookNowText = c24("chips.bookWithin", lateOfOpen)
    else bookNowText = c24("chips.book", lateOfOpen)
  }
  let medianNow = BLANK.noProtocolCounts
  if (protocol)
    medianNow =
      protocol.lateNow * 2 < protocol.openMarkets
        ? c24("chips.medianInOrder")
        : c24("chips.medianLate")
  const rightNow: CardSpec = {
    id: "2.4",
    page: "market",
    ids: c24("ids"),
    kind: "state",
    value: live.label,
    state: live.state,
    verdict: null,
    sub: live.sub,
    compare: protocol
      ? c24("compare", {
          late: count(protocol.lateNow),
          markets: counted("market", protocol.openMarkets),
        })
      : "",
    formula: closed
      ? c24("formula.closed")
      : [
          c24("formula.rule"),
          c24("formula.green"),
          c24("formula.amber", { grace: graceText }),
          c24("formula.red"),
          known
            ? c24("formula.now", {
                late: lateNow!,
                past: pastNow!,
                state: text(`shared.toneWord.${live.state}`),
              })
            : c24("formula.nowBlank", { reason: NA }),
        ].join("\n"),
    numbers: sentence(
      c24("numbers.late", { value: yesNo(lateNow) }),
      c24("numbers.past", { value: yesNo(pastNow) }),
      c24("numbers.countdown", { value: countdownText }),
      c24("numbers.activity", {
        value: show(n("M82"), (v) =>
          c24("numbers.activityAgo", { hours: hours(v) }),
        ),
      }),
      c24("numbers.batches", { n: show(waiting, count) }),
    ),
    chart: { expanded: <StateRow states={stateBoxes} /> },
    chips: {
      median: medianNow,
      markets: protocol
        ? c24("chips.markets", {
            inOrder: count(protocol.openMarkets - protocol.lateNow),
            markets: counted("market", protocol.openMarkets),
          })
        : BLANK.noProtocolCounts,
      borrower: bookNowText ?? BLANK.noBook,
    },
  }

  // ---------- 2.5 What it pays ----------
  const base = n("M11")
  const fee = n("M13")
  const cost =
    base !== undefined && fee !== undefined ? base * (1 + fee / 100) : undefined
  const earned = n("M41")
  const realised = n("M39")
  const penaltyInterest = n("M27")
  const penaltyShare = n("M42")
  const penaltyRate = n("M12")
  const amberLine = percentOf(String(GATES.penaltyShareAmber))
  let penaltyFormula = c25("formula.penaltyBlank", { reason: NA })
  if (earned === 0)
    penaltyFormula = c25("formula.penaltyBlank", { reason: BLANK.noYield })
  else if (
    earned !== undefined &&
    penaltyInterest !== undefined &&
    penaltyShare !== undefined
  )
    penaltyFormula = c25("formula.penalty", {
      penalty: units(penaltyInterest),
      earned: units(earned),
      share: apr(penaltyShare),
    })
  // Posted rates of the borrower's open, funded markets: closure zeroes a rate.
  const bookRates = openBookRows.map((row) => row.values.M11).filter(isNumber)
  let penaltyChart: React.ReactNode
  if (earned === 0)
    penaltyChart = <Tbd>{c25("chart.noYield", { blank: BLANK.noYield })}</Tbd>
  else if (penaltyShare !== undefined)
    penaltyChart = (
      <ThresholdSliver
        sharePct={penaltyShare}
        thresholdPct={GATES.penaltyShareAmber}
        caption={c25("chart.sliver", {
          penalty: show(penaltyInterest, units),
          earned: show(earned, units),
          share: apr(penaltyShare),
          threshold: amberLine,
        })}
      />
    )
  // A finished market's base rate is zeroed at closure; it shows what it earned.
  let paysValue: string = show(base, apr)
  let paysSub = base === undefined ? "" : c25("sub.paid")
  if (closed) {
    paysValue = earned === 0 ? BLANK.noYield : show(realised, apr)
    paysSub =
      earned === 0 ? c25("sub.closedNoYield") : c25("sub.closedRealised")
  }
  let lendersLine = c25("formula.lendersBlank", { reason: NA })
  if (base !== undefined)
    lendersLine = closed
      ? c25("formula.lendersClosed", { base: apr(base) })
      : c25("formula.lenders", { base: apr(base) })
  let costLine = c25("formula.costBlank", { reason: NA })
  if (cost !== undefined) {
    const costValues = {
      base: score(base!, 2),
      fee: percent(fee!),
      cost: apr(cost),
    }
    costLine =
      penaltyRate === undefined
        ? c25("formula.cost", costValues)
        : c25("formula.costPenalty", {
            ...costValues,
            penalty: score(penaltyRate, 2),
          })
  }
  let postedChip = closed ? c25("chips.postedClosed") : c25("chips.postedNone")
  if (cmp.M11 && base !== undefined && !closed)
    postedChip = c25("chips.posted", {
      median: apr(cmp.M11.median),
      population: count(cmp.M11.population),
      base: apr(base),
    })
  const pays: CardSpec = {
    id: "2.5",
    page: "market",
    ids: c25("ids"),
    kind: closed && earned === 0 ? "text" : "pct",
    value: paysValue,
    verdict: null,
    flag:
      earned === 0 || closed
        ? undefined
        : penaltyChip(penaltyShare) ?? undefined,
    ...(closed ? finishedFlag : {}),
    sub: paysSub,
    compare: cmp.M39 ? c25("compare", { median: percent(cmp.M39.median) }) : "",
    formula: [
      lendersLine,
      costLine,
      earned === 0
        ? c25("formula.realisedBlank", { reason: BLANK.noYield })
        : c25("formula.realised", { realised: show(realised, apr) }),
      penaltyFormula,
    ].join("\n"),
    numbers: sentence(
      c25("numbers.average", { rate: show(n("M40"), apr) }),
      c25("numbers.changes", {
        changes: show(n("M44"), (v) => counted("rateChange", v)),
      }),
      c25("numbers.earned", { amount: amount(earned) }),
      c25("numbers.penalty", { amount: amount(penaltyInterest) }),
      c25("numbers.amber", { threshold: amberLine }),
    ),
    chart: { expanded: penaltyChart },
    chips: {
      median: cmp.M39
        ? c25("chips.median", {
            median: percent(cmp.M39.median),
            population: count(cmp.M39.population),
          })
        : BLANK.noMedianMarket,
      markets: postedChip,
      borrower: borrowerChip(
        bookRates.length > 1
          ? c25("chips.book", {
              n: count(bookRates.length),
              range: text("shared.range", {
                low: apr(Math.min(...bookRates)),
                high: apr(Math.max(...bookRates)),
              }),
            })
          : fewOpen((row) =>
              isNumber(row.values.M11)
                ? c25("chips.posts", { rate: apr(row.values.M11) })
                : NA,
            ),
      ),
    },
  }

  // ---------- 2.6 How the line is used ----------
  const bookCapacity = openBookRows
    .map((row) => row.values.M86)
    .filter(isNumber)
  const capacity = n("M06")
  const used = capacity === 0 ? undefined : n("M86")
  const owedShare =
    capacity && owed !== undefined ? (100 * owed) / capacity : undefined
  let placeChip = c26("chips.pending", { days: GATES.gradeDays })
  if (cmp.M86?.below !== undefined)
    placeChip = c26("chips.place", {
      below: count(cmp.M86.below),
      population: count(cmp.M86.population),
    })
  else if (age !== undefined)
    placeChip = c26("chips.pendingHas", {
      days: GATES.gradeDays,
      has: count(age),
    })
  const line: CardSpec = {
    id: "2.6",
    page: "market",
    ids: c26("ids"),
    kind: used === undefined ? "text" : "pct",
    value: capacity === 0 ? c26("value.noCapacity") : show(used, percent),
    verdict: null,
    sub: capacity ? c26("sub", { capacity: units(capacity) }) : "",
    compare: cmp.M86 ? c26("compare", { median: percent(cmp.M86.median) }) : "",
    formula: [
      used === undefined || capacity === undefined
        ? c26("formula.blank", {
            reason: capacity === 0 ? c26("value.noCapacity") : NA,
          })
        : c26("formula.used", {
            drawn: units((used * capacity) / 100),
            capacity: units(capacity),
            used: percent(used),
          }),
      c26("formula.owed", { owed: show(owed, units) }),
    ].join("\n"),
    numbers: sentence(
      c26("numbers.flows", {
        draws: show(n("M59"), (v) => counted("draw", v)),
        repays: show(n("M60"), (v) => counted("repay", v)),
      }),
      owedShare === undefined
        ? c26("numbers.basis")
        : c26("numbers.basisDebts", { share: percent(owedShare) }),
    ),
    chart: {
      expanded:
        used !== undefined && capacity !== undefined ? (
          <FillBar
            pct={used}
            label={c26("chart.label", {
              used: percent(used),
              capacity: units(capacity),
            })}
            ghostPct={owedShare}
            caption={
              owedShare === undefined
                ? undefined
                : c26("chart.ghost", { share: percent(owedShare) })
            }
          />
        ) : undefined,
    },
    chips: {
      median: cmp.M86
        ? c26("chips.median", {
            median: percent(cmp.M86.median),
            population: count(cmp.M86.population),
          })
        : BLANK.noMedianMarket,
      markets: placeChip,
      borrower: borrowerChip(
        bookCapacity.length > 1
          ? c26("chips.book", {
              n: count(bookCapacity.length),
              range: spread(bookCapacity, (value) => percent(value)),
            })
          : fewOpen((row) =>
              isNumber(row.values.M86)
                ? c26("chips.drawn", { share: percent(row.values.M86) })
                : NA,
            ),
      ),
    },
  }

  // ---------- 2.8 Incident history ----------
  const bucketIds = ["M69", "M70", "M71", "M72"]
  const bucketsKnown = bucketIds.every((id) => n(id) !== undefined)
  const buckets = bucketIds.map((id) => n(id) ?? 0)
  const finishedTotal = buckets.reduce((total, value) => total + value, 0)
  const withinDay =
    finishedTotal > 0
      ? (100 * (buckets[0] + buckets[1])) / finishedTotal
      : undefined
  const mean = n("M22")
  let historySub = ""
  if (episodes)
    historySub = join(
      open
        ? c28("sub.incidentsOpen", { count: episodes, open: count(open) })
        : c28("sub.incidents", { count: episodes }),
      finished && mean !== undefined
        ? c28("sub.typical", { mean: hours(mean) })
        : undefined,
      withinDay === undefined
        ? undefined
        : c28("sub.withinDay", { share: percent(withinDay, 0) }),
    )
  let bucketLine = c28("formula.blank", { reason: NA })
  if (bucketsKnown && episodes !== undefined) {
    const bucketValues = {
      under6: count(buckets[0]),
      to24: count(buckets[1]),
      to48: count(buckets[2]),
      over48: count(buckets[3]),
      finished: count(finishedTotal),
      episodes: count(episodes),
    }
    bucketLine = open
      ? c28("formula.bucketsOpen", { ...bucketValues, open: count(open) })
      : c28("formula.buckets", bucketValues)
  }
  const history: CardSpec = {
    id: "2.8",
    page: "market",
    ids: c28("ids"),
    kind: episodes ? "count" : "text",
    value: episodes === 0 ? BLANK.noIncidents : show(episodes, count),
    verdict: null,
    sub: historySub,
    compare: cmp.M22 ? c28("compare", { median: hours(cmp.M22.median) }) : "",
    formula: [
      bucketLine,
      ...(withinDay === undefined
        ? []
        : [
            c28("formula.withinDay", {
              under6: count(buckets[0]),
              to24: count(buckets[1]),
              finished: count(finishedTotal),
              share: percent(withinDay, 0),
            }),
          ]),
      finished
        ? c28("formula.typical", { mean: show(mean, hours) })
        : c28("formula.typicalBlank", {
            reason: open ? BLANK.noFinishedEpisode : BLANK.noIncidents,
          }),
    ].join("\n"),
    numbers: sentence(
      bucketsKnown && finishedTotal
        ? c28("numbers.histogram", {
            buckets: buckets.map(count).join(" / "),
            grace: show(grace, hours),
          })
        : undefined,
      open ? c28("numbers.open", { open: count(open) }) : undefined,
      c28("numbers.cured", { cured: curedText }),
    ),
    chart:
      finishedTotal && bucketsKnown
        ? {
            collapsed: <Histogram buckets={buckets} compact />,
            expanded: (
              <Histogram
                buckets={buckets}
                caption={c28("chart.baseline", { grace: show(grace, hours) })}
              />
            ),
          }
        : undefined,
    chips: {
      median: cmp.M22
        ? c28("chips.median", {
            median: hours(cmp.M22.median),
            population: count(cmp.M22.population),
          })
        : BLANK.noMedianMarket,
      markets: finished
        ? rankPhrase(cmp.M22, "markets")
        : c28("chips.notRanked"),
      borrower: borrowerChip(
        bookValues?.n("S12") !== undefined
          ? c28("chips.book", {
              incidents: counted("incident", bookValues.n("S12")!),
              markets: show(bookValues.n("S01"), (v) => counted("market", v)),
            })
          : undefined,
      ),
    },
    chipCharts: finished ? { markets: rank(cmp.M22, "markets") } : undefined,
  }

  // ---------- 2.9 Who funds it ----------
  const active = n("M48")
  const ever = n("M49")
  const largest = n("D10")
  const retention = n("M51")
  const noLenders = ever === 0
  let retentionLine = c29("formula.blank", { reason: NA })
  if (noLenders) retentionLine = c29("formula.noLenders")
  else if (
    active !== undefined &&
    ever !== undefined &&
    retention !== undefined
  )
    retentionLine = c29("formula.retention", {
      active: count(active),
      ever: count(ever),
      retention: percent(retention),
    })
  const lenderGroups =
    active !== undefined && ever !== undefined && ever > 0
      ? [
          { count: active, color: C.fg2, label: c29("chart.stillIn") },
          {
            count: Math.max(0, ever - active),
            color: C.line,
            label: c29("chart.left"),
          },
        ]
      : []
  let lenderChart: React.ReactNode
  if (lenderGroups.length && ever! <= MARK_LIMIT) {
    const marks = { ever: count(ever!), active: count(active!) }
    lenderChart = (
      <MarkArray
        shape="dot"
        groups={lenderGroups}
        caption={
          retention === undefined
            ? c29("chart.marks", marks)
            : c29("chart.marksRetention", {
                ...marks,
                retention: percent(retention),
              })
        }
      />
    )
  } else if (lenderGroups.length)
    lenderChart = (
      <StackedBar
        segments={lenderGroups.map((group) => ({
          label: group.label,
          value: group.count,
          color: group.color,
        }))}
      />
    )
  let fundsValue: string = NA
  if (noLenders) fundsValue = c29("value.noLenders")
  else if (active !== undefined && ever !== undefined)
    fundsValue = c29("value.activeOfEver", {
      active: count(active),
      ever: count(ever),
    })
  const funds: CardSpec = {
    id: "2.9",
    page: "market",
    ids: c29("ids"),
    kind: "text",
    value: fundsValue,
    verdict: null,
    sub:
      noLenders || retention === undefined
        ? ""
        : c29("sub", { retention: percent(retention) }),
    compare: cmp.D10
      ? c29("compare", { median: percent(cmp.D10.median, 0) })
      : "",
    formula: [
      retentionLine,
      noLenders
        ? c29("formula.concentrationNone")
        : c29("formula.concentration", { largest: show(largest, percent) }),
    ].join("\n"),
    numbers: noLenders
      ? c29("numbers.noLenders")
      : sentence(
          c29("numbers.largest", { largest: show(largest, percent) }),
          c29("numbers.active", {
            active: show(active, count),
            ever: show(ever, (v) => counted("distinctLender", v)),
          }),
        ),
    chart: { expanded: lenderChart },
    chips: {
      median: cmp.D10
        ? c29("chips.median", {
            median: percent(cmp.D10.median, 0),
            population: count(cmp.D10.population),
          })
        : (closed && c29("chips.closed")) || BLANK.noMedianMarket,
      markets: cmp.M49
        ? c29("chips.lenders", {
            median: count(cmp.M49.median),
            population: count(cmp.M49.population),
          })
        : BLANK.noMedianMarket,
      borrower: borrowerChip(
        bookValues?.n("S37") !== undefined
          ? c29("chips.book", {
              lenders: counted("distinctLender", bookValues.n("S37")!),
            })
          : undefined,
      ),
    },
  }

  // ---------- 2.10 Terms ----------
  const penaltyText = (value: number) =>
    c210("penaltyRate", { rate: score(value, 2) })
  const TERMS: {
    id: "M15" | "M16" | "M12" | "M14"
    format: (value: number) => string
  }[] = [
    { id: "M15", format: (value) => hours(value) },
    { id: "M16", format: (value) => hours(value) },
    { id: "M12", format: penaltyText },
    { id: "M14", format: (value) => percent(value) },
  ]
  const termText = (term: (typeof TERMS)[number], value: string) =>
    c210("term", { label: c210(`terms.${term.id}`), value })
  const termMedians = TERMS.filter((term) => cmp[term.id]).map((term) => ({
    ...term,
    median: cmp[term.id].median,
    value: n(term.id),
  }))
  const bookTerms =
    openBookRows.length > 1
      ? TERMS.map((term) => {
          const values = openBookRows
            .map((row) => row.values[term.id])
            .filter(isNumber)
          return values.length === openBookRows.length
            ? termText(term, spread(values, term.format))
            : undefined
        }).filter((entry): entry is string => Boolean(entry))
      : []
  const types = typeLabels?.length ? typeLabels.join(", ") : NA
  const cycle = closed
    ? text("shared.cycle.finished")
    : cycleStatus(market.values.D06)
  const terms: CardSpec = {
    id: "2.10",
    page: "market",
    ids: c210("ids"),
    kind: "text",
    value: show(grace, hours),
    verdict: null,
    sub: join(
      c210("sub.lateness"),
      n("M16") === undefined
        ? undefined
        : c210("sub.window", { window: hours(n("M16")!) }),
      penaltyRate === undefined
        ? undefined
        : c210("sub.penalty", { penalty: penaltyText(penaltyRate) }),
      n("M14") === undefined
        ? undefined
        : c210("sub.buffer", { reserve: percent(n("M14")!) }),
    ),
    compare: cycle,
    formula: [
      c210("formula.lookups"),
      c210("formula.terms", {
        grace: show(grace, hours),
        window: show(n("M16"), hours),
        penalty: show(penaltyRate, penaltyText),
        reserve: show(n("M14"), percent),
      }),
      c210("formula.facts", { minimum: amount(n("D03")) }),
    ].join("\n"),
    numbers: sentence(
      c210("numbers.cycle", { status: cycleStatus(market.values.D06) }),
      c210("numbers.types", { types }),
      c210("numbers.lifecycle", { status: lifecycle(s("M77")) }),
      c210("numbers.deployed", { date: isoDay(s("M03")) }),
      c210("numbers.note"),
    ),
    chips: {
      median: termMedians.length
        ? c210("chips.median", {
            terms: join(
              ...termMedians.map((term) =>
                termText(term, term.format(term.median)),
              ),
            ),
            population: count(cmp.M15?.population ?? 0),
          })
        : BLANK.noMedianMarket,
      markets: termMedians.length
        ? c210("chips.markets", {
            terms: join(
              ...termMedians.map((term) =>
                term.value === undefined
                  ? termText(term, NA)
                  : c210("termVersus", {
                      label: c210(`terms.${term.id}`),
                      value: term.format(term.value),
                      median: term.format(term.median),
                    }),
              ),
            ),
          })
        : BLANK.noMedianMarket,
      borrower: borrowerChip(
        bookTerms.length
          ? c210("chips.book", {
              n: count(openBookRows.length),
              terms: join(...bookTerms),
            })
          : fewOpen((row) =>
              join(
                ...TERMS.map((term) => {
                  const value = row.values[term.id]
                  return termText(
                    term,
                    isNumber(value) ? term.format(value) : NA,
                  )
                }),
              ),
            ),
      ),
    },
  }

  const banner =
    position?.weakest && !position.tied
      ? text("pages.market.banner", {
          n: count(position.count),
          low: score(position.min),
          high: score(position.max),
        })
      : undefined

  return {
    rowA: [inOrder, worstIncident, exits, rightNow, pays],
    supporting: closed
      ? [history, funds, terms]
      : [line, history, funds, terms],
    banner,
  }
}
