import * as React from "react"

import { BorrowerAnalytics, Comparison, MarketAnalytics } from "./api"
import {
  Buckets,
  CountedSquares,
  Headroom,
  Rail,
  rankChart,
  ShareBar,
} from "./charts"
import {
  BLANK,
  count,
  days,
  display,
  hours,
  isNumber,
  lifeShare,
  percent,
  score,
  tokens,
  trend,
} from "./format"
import {
  deadlineEvidence,
  GATES,
  leadingNumber,
  limitedVerdict,
  ordinal,
  rankPhrase,
  reader,
  uniqueFormulas,
} from "./helpers"
import { RowCard } from "./IndexPanel"
import { GD, StateTone } from "./tokens"

const DAY = 86_400
const join = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(" · ") || undefined
const unavailable = "The calculation is not available at this snapshot."
const medianCaption = (comparison?: Comparison, noun = "markets") =>
  comparison
    ? `Median ${percent(comparison.median)} · ${count(
        comparison.population,
      )} ${noun}`
    : undefined
const medianLabel = (comparison?: Comparison, population = "graded markets") =>
  comparison
    ? `; median ${percent(comparison.median)} across ${count(
        comparison.population,
      )} ${population}`
    : ""
/** Headroom stated in words, as a covenant test states it. */
const headroomText = (longest: number, grace: number) => {
  if (longest > grace) return `${hours(longest - grace)} past the allowance`
  if (longest < grace) return `${hours(grace - longest)} inside the allowance`
  return "At the allowance"
}

/** Compare the same publication only; equal values share their position. */
export function borrowerPosition(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) {
  if (
    !borrower ||
    borrower.partial ||
    borrower.state !== "Ok" ||
    market.state !== "Ok" ||
    borrower.publication.id !== market.publication.id ||
    borrower.borrower.chainId !== market.market.chainId ||
    borrower.publication.cut?.hash !== market.publication.cut?.hash
  )
    return undefined
  const grades = borrower.markets
    .filter((row) => row.state === "Ok" && isNumber(row.values.M18))
    .map((row) => ({
      address: row.address.toLowerCase(),
      grade: Number(row.values.M18),
    }))
  const own = grades.find(
    (row) => row.address === market.market.address.toLowerCase(),
  )
  if (!own || grades.length < 2) return undefined
  const min = Math.min(...grades.map((row) => row.grade))
  const max = Math.max(...grades.map((row) => row.grade))
  const tied = grades.filter((row) => row.grade === own.grade).length > 1
  const rank = grades.filter((row) => row.grade > own.grade).length + 1
  let word = `${ordinal(rank)} strongest`
  if (own.grade === max) word = "strongest"
  else if (own.grade === min) word = "weakest"
  if (tied) word = `joint ${word}`
  return { count: grades.length, min, max, word }
}

export function marketCards(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) {
  const { n, s } = reader(market.values)
  const cmp = market.comparisons
  const { protocol } = market
  const asset = s("M02")
  const amount = (value?: number) =>
    value === undefined
      ? BLANK.unavailable
      : `${tokens(value)}${asset ? ` ${asset}` : ""}`
  const age = n("M05")
  const grace = n("M15")
  const life = n("H01")
  const late = n("H02")
  const cash = n("M18")
  const penalty = life === 0 ? undefined : n("M26")
  const kept = penalty === undefined ? undefined : 100 - penalty
  const hasRecord = life !== undefined && life > 0
  const neverLate = hasRecord && late === 0
  let historyWord: string = BLANK.unavailable
  if (neverLate) historyWord = BLANK.neverLate
  else if (life === 0) historyWord = "no recorded history"
  const incidents = n("M20")
  const position = borrowerPosition(market, borrower)
  const cashSegments =
    cash === undefined
      ? []
      : [
          {
            value: cash,
            color: GD.link,
            label: `Cash available ${percent(cash)}`,
          },
          {
            value: Math.max(0, 100 - cash),
            color: GD.withinGrace,
            label: `Cash short ${percent(100 - cash)}`,
          },
        ]
  const inOrder: RowCard = {
    key: "2.1",
    card: {
      name: "In order",
      help: "Cash availability over the recorded life. Contract kept is the separate share of time without penalty interest.",
      value:
        hasRecord && !neverLate && cash !== undefined ? score(cash) : undefined,
      word: historyWord,
      verdict: limitedVerdict(age !== undefined && age < GATES.days, neverLate),
      sub: join(
        kept === undefined ? undefined : `Contract kept ${score(kept)}`,
        age === undefined ? undefined : `${count(age)} days`,
      ),
      comparison: cmp.M18 ? `Median ${score(cmp.M18.median)}` : undefined,
      chart:
        hasRecord && cash !== undefined ? (
          <Rail
            value={cash}
            median={cmp.M18?.median}
            label={`Cash available ${percent(cash)}${medianLabel(cmp.M18)}`}
            caption={medianCaption(cmp.M18)}
            ids={["M18"]}
          />
        ) : undefined,
    },
    panel: {
      ids: ["M18", "M26", "H01", "H02"],
      question: "Was the required cash available?",
      formula: [
        hasRecord && late !== undefined && cash !== undefined
          ? `Cash available = 100 × (1 − ${score(
              late / DAY,
              2,
            )} days short / ${score(life / DAY, 2)} recorded days) = ${score(
              cash,
            )}.`
          : unavailable,
        penalty === undefined
          ? unavailable
          : `Contract kept = 100 − ${lifeShare(
              penalty,
            )} of recorded time under penalty = ${score(kept!)}.`,
      ],
      numbers: [
        [
          "Days on record",
          display(life === undefined ? undefined : life / DAY, days),
        ],
        [
          "Days short of cash",
          display(late === undefined ? undefined : late / DAY, days),
        ],
        ["Time under penalty", display(penalty, lifeShare)],
        ["Finished incidents", display(incidents, count)],
        ["Last 90 days", display(n("M67"))],
        ["Change from lifetime", display(n("M68"), trend)],
      ],
      chart:
        hasRecord && cash !== undefined ? (
          <ShareBar segments={cashSegments} ids={["M18"]} />
        ) : undefined,
      chips: [
        ...(cmp.M18
          ? [
              {
                label: "Median",
                text: `${score(cmp.M18.median)} across ${count(
                  cmp.M18.population,
                )} graded markets.${
                  cmp.M26
                    ? ` Contract kept: ${score(100 - cmp.M26.median)}.`
                    : ""
                }`,
              },
              {
                label: "All markets",
                text: rankPhrase(cmp.M18, "markets", age),
                chart: rankChart(cmp.M18, "markets"),
              },
            ]
          : []),
        ...(position
          ? [
              {
                label: "This borrower",
                text: `${count(position.count)} markets range from ${score(
                  position.min,
                )} to ${score(position.max)}; this market is ${position.word}.`,
              },
            ]
          : []),
      ],
      meaning:
        "Cash shortages and penalty time are separate measurements. The rolling grace tracker can keep penalty interest active after cash has been restored.",
      tells: [
        {
          scope: "market",
          text: "How consistently the market held its required cash, and how often penalty interest applied.",
        },
      ],
      doesNotTell:
        "The amount of a shortfall, or whether shortages were a few long incidents or many brief ones. Penalty time cannot be subtracted from cash-short time to infer time within grace.",
    },
  }

  const longest = n("M23")
  const worst =
    life !== 0 && grace !== undefined && grace > 0 ? n("M24") : undefined
  const noWorst = hasRecord && late === 0 && longest === 0
  const headroom =
    hasRecord &&
    !noWorst &&
    longest !== undefined &&
    grace !== undefined &&
    grace > 0
      ? {
          value: longest,
          limit: grace,
          label: `Longest shortfall ${hours(longest)}; allowance ${hours(
            grace,
          )}`,
          headroom: headroomText(longest, grace),
          ids: ["M23", "M15"],
        }
      : undefined
  let worstValue: string | undefined
  if (!noWorst && worst !== undefined) worstValue = percent(worst)
  else if (!noWorst && longest !== undefined && grace === 0)
    worstValue = hours(longest)
  let graceLabel: string | undefined
  if (grace === 0) graceLabel = "No grace period"
  else if (grace !== undefined) graceLabel = `${hours(grace)} allowance`
  let worstFormula = unavailable
  if (noWorst) worstFormula = "No cash shortfall has been recorded."
  else if (grace === 0)
    worstFormula =
      "There is no grace period, so a percentage of the allowance is undefined."
  else if (worst !== undefined && longest !== undefined && grace !== undefined)
    worstFormula = `Longest incident / allowance = ${hours(
      longest,
      2,
    )} / ${hours(grace, 2)} × 100 = ${percent(worst)}.`
  const worstIncident: RowCard = {
    key: "2.2",
    card: {
      name: "Worst incident",
      value: worstValue,
      word: noWorst ? BLANK.neverLate : BLANK.unavailable,
      verdict: limitedVerdict(
        incidents !== undefined && incidents > 0 && incidents < GATES.incidents,
        worst !== undefined && worst <= 100,
      ),
      sub: join(
        graceLabel,
        incidents === undefined
          ? undefined
          : `${count(incidents)} finished incidents`,
      ),
      comparison:
        cmp.M24 && worst !== undefined
          ? `Median ${percent(cmp.M24.median)}`
          : undefined,
      chart: headroom ? <Headroom compact {...headroom} /> : undefined,
    },
    panel: {
      ids: ["M24", "M23", "M15", "M20"],
      question: "How long was the longest cash shortfall?",
      formula: [worstFormula],
      numbers: [
        ["Longest incident", display(longest, hours)],
        ["Grace period", display(grace, hours)],
        ["Finished incidents", display(incidents, count)],
      ],
      chart: headroom ? (
        <Headroom
          {...headroom}
          valueLabel={`Longest ${hours(headroom.value)}${
            worst === undefined ? "" : ` · ${percent(worst)} of allowance`
          }`}
          limitLabel={`Allowance ${hours(headroom.limit)}`}
        />
      ) : undefined,
      chips:
        cmp.M24 && worst !== undefined
          ? [
              {
                label: "Median",
                text: `${percent(cmp.M24.median)} across ${count(
                  cmp.M24.population,
                )} graded markets.`,
              },
              {
                label: "All markets",
                text: rankPhrase(cmp.M24, "markets"),
                chart: rankChart(cmp.M24, "markets"),
              },
            ]
          : [],
      meaning:
        "This is the longest continuous cash shortfall, including an incident still open at the snapshot.",
      tells: [
        {
          scope: "market",
          text: "The longest recorded shortage relative to the market's allowance.",
        },
      ],
      doesNotTell:
        "The number of contractual breaches. The grace tracker rolls down after a cure rather than resetting, so incident length and penalty time are not interchangeable.",
    },
  }

  const deadlines = n("M30")
  const covered = n("M31")
  const exitRate = n("M32")
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
  const exitGroups =
    covered === undefined || missed === undefined
      ? []
      : [
          {
            count: covered,
            color: GD.link,
            label: `On time ${count(covered)}`,
          },
          ...(splitKnown
            ? [
                {
                  count: paidLate!,
                  color: GD.fundedLate,
                  label: `Paid late ${count(paidLate!)}`,
                },
                {
                  count: unpaid!,
                  color: GD.pastAllowance,
                  label: `Still unpaid ${count(unpaid!)}`,
                },
              ]
            : [
                {
                  count: missed,
                  color: GD.ghost,
                  label: `Missed deadline ${count(missed)}`,
                },
              ]),
        ]
  let exitFormula = unavailable
  if (deadlines === 0)
    exitFormula = "No withdrawal batch has reached its deadline."
  else if (
    deadlines !== undefined &&
    covered !== undefined &&
    exitRate !== undefined
  )
    exitFormula = `On time = ${count(covered)} funded deadlines / ${count(
      deadlines,
    )} deadlines × 100 = ${percent(exitRate)}.`
  const exits: RowCard = {
    key: "2.3",
    card: {
      name: "Exits paid on time",
      value:
        deadlines !== undefined && deadlines > 0 && exitRate !== undefined
          ? percent(exitRate)
          : undefined,
      word: deadlines === 0 ? BLANK.noExits : BLANK.unavailable,
      verdict: limitedVerdict(
        deadlines !== undefined && deadlines > 0 && deadlines < GATES.deadlines,
        exitRate === 100,
      ),
      sub: deadlineEvidence(deadlines, covered),
      comparison:
        cmp.M32 && deadlines !== 0
          ? `Median ${percent(cmp.M32.median)}`
          : undefined,
      chart:
        deadlines && exitRate !== undefined ? (
          <Rail
            value={exitRate}
            median={cmp.M32?.median}
            label={`Exits funded on time ${percent(exitRate)}${medianLabel(
              cmp.M32,
            )}`}
            caption={medianCaption(cmp.M32)}
            ids={["M32"]}
          />
        ) : undefined,
    },
    panel: {
      ids: ["M32", "M31", "M30", "D18", "M37", "M38"],
      question: "Was each withdrawal batch funded at its deadline?",
      formula: [
        exitFormula,
        ...(missed !== undefined && missed > 0
          ? [
              splitKnown
                ? `${count(
                    paidLate!,
                  )} missed deadlines were funded later; ${count(
                    unpaid!,
                  )} remain unpaid at this snapshot.`
                : `${count(
                    missed,
                  )} deadlines were missed. Their later funding status is not available.`,
            ]
          : []),
      ],
      numbers: [
        ["Deadlines", display(deadlines, count)],
        ["Funded on time", display(covered, count)],
        ["Open unpaid batches", display(n("M37"), count)],
        ["Funded, awaiting lender claims", amount(n("M38"))],
        ["Net borrowed less repaid", amount(n("M58"))],
        [
          "Cash outside funded claims",
          amount(
            n("M08") !== undefined && n("M38") !== undefined
              ? n("M08")! - n("M38")!
              : undefined,
          ),
        ],
      ],
      chart:
        deadlines && exitGroups.length ? (
          <CountedSquares groups={exitGroups} ids={["M30", "M31", "D18"]} />
        ) : undefined,
      chips: cmp.M32
        ? [
            {
              label: "Median",
              text: `${percent(cmp.M32.median)} across ${count(
                cmp.M32.population,
              )} graded markets.`,
            },
            {
              label: "All markets",
              text: rankPhrase(cmp.M32, "markets"),
              chart: rankChart(cmp.M32, "markets"),
            },
          ]
        : [],
      meaning:
        "A funded batch has enough allocated for its lenders. Lenders may claim that money later; unclaimed funds are not an unpaid borrower obligation.",
      tells: [
        {
          scope: "market",
          text: "How often withdrawal deadlines were met, with each batch counted once.",
        },
      ],
      doesNotTell:
        "How long individual lenders waited, or whether an unpaid batch will eventually be funded.",
    },
  }

  const closed = s("M77") === "Closed"
  const lateNow = n("M21")
  const penaltyNow = n("M85")
  const knownNow = [0, 1].includes(lateNow!) && [0, 1].includes(penaltyNow!)
  const countdown = n("D05") ?? leadingNumber(s("D05"))
  const cured = n("M84")
  const openBatches = n("M37")
  let state: { word: string; tone: StateTone } = {
    word: "NOT AVAILABLE",
    tone: "neutral",
  }
  let stateDetail: string | undefined
  if (closed) {
    state = { word: "CLOSED", tone: "neutral" }
    stateDetail = "Record at closure"
  } else if (penaltyNow === 1) {
    state = { word: "PENALTY ACTIVE", tone: "bad" }
    stateDetail = join(
      countdown === undefined ? undefined : `${hours(countdown)} above grace`,
      openBatches === undefined
        ? undefined
        : `${count(openBatches)} unpaid batches`,
    )
  } else if (lateNow === 1 && penaltyNow === 0) {
    state = { word: "WITHIN GRACE", tone: "warn" }
    stateDetail =
      countdown === undefined ? undefined : `${hours(countdown)} remaining`
  } else if (knownNow) {
    state = { word: "IN ORDER", tone: "good" }
    if (incidents !== undefined && incidents > 0 && cured !== undefined)
      stateDetail = `Last cured ${days(cured)} ago`
    else if (neverLate) stateDetail = BLANK.neverLate
  }
  let stateFormula = unavailable
  if (closed)
    stateFormula = "This market is closed; its record ends at closure."
  else if (knownNow)
    stateFormula =
      "Cash shortage within grace and an active penalty tracker are read separately at the snapshot block."
  const rightNow: RowCard = {
    key: "2.4",
    card: {
      name: "Right now",
      state,
      sub: stateDetail,
      comparison: protocol
        ? `${count(protocol.lateNow)} of ${count(
            protocol.openMarkets,
          )} open markets flagged`
        : undefined,
    },
    panel: {
      ids: ["M21", "M85", "D05", "M84", "M37"],
      question: "What is the state at this snapshot?",
      formula: [stateFormula],
      numbers: [
        ["State", state.word],
        ["Open unpaid batches", display(openBatches, count)],
        ["Grace period", display(grace, hours)],
        ["Last activity", display(n("M82"), (value) => `${hours(value)} ago`)],
      ],
      chips: protocol
        ? [
            {
              label: "All markets",
              text: `${count(protocol.lateNow)} of ${count(
                protocol.openMarkets,
              )} open markets have a cash shortage or an active penalty tracker.`,
            },
          ]
        : [],
      meaning:
        "The penalty tracker can remain above grace after cash is restored. An active penalty is not, by itself, evidence of a current cash shortfall.",
      tells: [
        {
          scope: "market",
          text: "Whether the snapshot shows a shortage within grace, active penalty interest, or a closed market.",
        },
      ],
      doesNotTell:
        "The historical record. A clear snapshot can follow repeated cash shortfalls, and closing a market does not mean every lender has collected their funds.",
    },
  }

  const base = n("M11")
  const fee = n("M13")
  const cost =
    base !== undefined && fee !== undefined ? base * (1 + fee / 100) : undefined
  const earned = n("M41")
  const realised = n("M39")
  const penaltyInterest = n("M27")
  const penaltyShare = n("M42")
  let yieldEvidence: string | undefined
  if (earned === 0) yieldEvidence = BLANK.noYield
  else if (realised !== undefined)
    yieldEvidence = `Realised ${percent(realised)}`
  let penaltyFormula = unavailable
  if (earned === 0) penaltyFormula = "No lender interest has accrued yet."
  else if (
    earned !== undefined &&
    earned > 0 &&
    penaltyInterest !== undefined &&
    penaltyShare !== undefined
  )
    penaltyFormula = `Penalty share = ${tokens(penaltyInterest)} / ${tokens(
      earned,
    )} lender interest × 100 = ${percent(penaltyShare, 2)}.`
  const pays: RowCard = {
    key: "2.5",
    card: {
      name: "What it pays",
      value: base === undefined ? undefined : percent(base),
      word: BLANK.unavailable,
      sub: yieldEvidence,
      comparison: cmp.M11
        ? `Median posted ${percent(cmp.M11.median)}`
        : undefined,
    },
    panel: {
      ids: ["M11", "M39", "M13", "M12", "M42", "M27", "M41"],
      question: "What is the rate on offer, and what have lenders earned?",
      formula: [
        cost === undefined
          ? unavailable
          : `Borrower base cost = ${percent(base!)} × (1 + ${percent(
              fee!,
            )} protocol fee share) = ${percent(cost)}.`,
        n("M12") === undefined
          ? unavailable
          : `When penalty interest applies, its ${percent(
              n("M12")!,
            )} APR is added to the base rate.`,
        penaltyFormula,
      ],
      numbers: [
        ["Posted lender APR", display(base, percent)],
        [
          "Realised lender APR",
          earned === 0 ? BLANK.noYield : display(realised, percent),
        ],
        ["Borrower base cost", display(cost, percent)],
        ["Lifetime average base APR", display(n("M40"), percent)],
        ["Rate changes", display(n("M44"), count)],
        ["Accrued lender interest", amount(earned)],
        ["Accrued penalty interest", amount(penaltyInterest)],
      ],
      chips: [
        ...(cmp.M11
          ? [
              {
                label: "Posted median",
                text: `${percent(cmp.M11.median)} across ${count(
                  cmp.M11.population,
                )} graded open markets.`,
              },
            ]
          : []),
        ...(cmp.M39
          ? [
              {
                label: "Realised median",
                text: `${percent(cmp.M39.median)} across ${count(
                  cmp.M39.population,
                )} graded markets.`,
              },
            ]
          : []),
      ],
      meaning:
        "Posted APR is the current base rate. Realised APR uses interest accrued over the market's supply-weighted history, including penalty interest.",
      tells: [
        {
          scope: "market",
          text: "The rate offered now and the rate accrued over the recorded history.",
        },
      ],
      doesNotTell:
        "Future rates, whether the return fairly compensates for risk, or whether accrued interest has been withdrawn by lenders.",
    },
  }

  const used = n("M06") === 0 ? undefined : n("M86")
  const line: RowCard = {
    key: "2.6",
    card: {
      name: "Capacity used",
      value: used === undefined ? undefined : percent(used),
      word: n("M06") === 0 ? "no deposit capacity" : BLANK.unavailable,
      sub: n("M06") === undefined ? undefined : `${amount(n("M06"))} capacity`,
      comparison: cmp.M86 ? `Median ${percent(cmp.M86.median)}` : undefined,
      chart:
        used === undefined ? undefined : (
          <Rail
            value={used}
            median={cmp.M86?.median}
            label={`Capacity used ${percent(used)}${medianLabel(
              cmp.M86,
              "graded open markets",
            )}`}
            caption={medianCaption(cmp.M86, "open markets")}
            ids={["M86"]}
          />
        ),
    },
    panel: {
      ids: ["M86", "M06", "M07", "M59", "M60"],
      question: "How much of the deposit capacity is in use?",
      formula: [
        used === undefined
          ? unavailable
          : `Capacity used = market token supply / capacity × 100 = ${percent(
              used,
            )}.`,
      ],
      numbers: [
        ["Capacity", amount(n("M06"))],
        ["Total debt", amount(n("M07"))],
        ["Borrows", display(n("M59"), count)],
        ["Repayments", display(n("M60"), count)],
      ],
      chart:
        used === undefined ? undefined : (
          <Rail
            size="panel"
            value={used}
            median={cmp.M86?.median}
            label={`Capacity used ${percent(used)}${medianLabel(
              cmp.M86,
              "graded open markets",
            )}`}
            caption={medianCaption(cmp.M86, "open markets")}
            ids={["M86"]}
          />
        ),
      chips: cmp.M86
        ? [
            {
              label: "Median",
              text: `${percent(cmp.M86.median)} across ${count(
                cmp.M86.population,
              )} graded open markets.`,
            },
          ]
        : [],
      meaning:
        "Capacity used compares current market token supply with the deposit cap. It measures use, without grading it.",
      tells: [
        {
          scope: "market",
          text: "How close lender supply is to the configured capacity.",
        },
      ],
      doesNotTell:
        "How much the borrower has drawn, how much cash is immediately available, or whether a new deposit will be accepted.",
    },
  }

  const bucketIds = ["M69", "M70", "M71", "M72"]
  const bucketsKnown = bucketIds.every((id) => n(id) !== undefined)
  const buckets = ["Under 6 h", "6–24 h", "24–48 h", "Over 48 h"].map(
    (label, index) => ({ label, count: n(bucketIds[index]) ?? 0 }),
  )
  const history: RowCard = {
    key: "2.8",
    card: {
      name: "Incident history",
      value:
        incidents !== undefined && incidents > 0 ? count(incidents) : undefined,
      word: incidents === 0 ? "no finished incidents" : BLANK.unavailable,
      sub:
        incidents && n("M22") !== undefined
          ? `Typical ${hours(n("M22")!)}`
          : undefined,
      chart:
        incidents && bucketsKnown ? (
          <Buckets compact buckets={buckets} />
        ) : undefined,
    },
    panel: {
      ids: ["M20", "M22", ...bucketIds],
      question: "How long did completed cash shortfalls last?",
      formula: [
        incidents === undefined
          ? unavailable
          : `${count(incidents)} finished incidents are grouped by duration.`,
      ],
      numbers: [
        ["Finished incidents", display(incidents, count)],
        [
          "Mean duration",
          incidents === 0 ? BLANK.noIncidents : display(n("M22"), hours),
        ],
      ],
      chart:
        incidents && bucketsKnown ? (
          <Buckets buckets={buckets} ids={bucketIds} />
        ) : undefined,
      chips: cmp.M22
        ? [
            {
              label: "Median",
              text: `A mean incident duration of ${hours(
                cmp.M22.median,
              )} across ${count(cmp.M22.population)} graded markets.`,
            },
          ]
        : [],
      meaning:
        "The duration distribution distinguishes frequent brief shortages from long interruptions.",
      tells: [
        {
          scope: "market",
          text: "The length and frequency of finished cash shortfalls.",
        },
      ],
      doesNotTell:
        "The cash missing in each incident, contractual breach counts, or the duration of a shortfall still open at this snapshot.",
    },
  }

  const active = n("M48")
  const ever = n("M49")
  const largest = n("D10")
  let retentionFormula = unavailable
  if (ever === 0) retentionFormula = "No lender has held this market's token."
  else if (
    active !== undefined &&
    ever !== undefined &&
    ever > 0 &&
    n("M51") !== undefined
  )
    retentionFormula = `Retention = ${count(active)} active / ${count(
      ever,
    )} historical holders × 100 = ${percent(n("M51")!)}.`
  const funds: RowCard = {
    key: "2.9",
    card: {
      name: "Active lenders",
      value: active === undefined ? undefined : count(active),
      word: BLANK.unavailable,
      sub: join(
        ever === undefined ? undefined : `${count(ever)} ever`,
        largest === undefined ? undefined : `Largest ${percent(largest)}`,
      ),
      comparison: cmp.M49 ? `Median ${count(cmp.M49.median)} ever` : undefined,
    },
    panel: {
      ids: ["M48", "M49", "M51", "D10"],
      question: "How broad and concentrated is the lender base?",
      formula: [retentionFormula],
      numbers: [
        ["Active holders", display(active, count)],
        ["Historical holders", display(ever, count)],
        ["Largest holder's share", display(largest, percent)],
      ],
      chips: cmp.D10
        ? [
            {
              label: "Median",
              text: `Largest-holder share ${percent(
                cmp.D10.median,
              )} across ${count(cmp.D10.population)} graded open markets.`,
            },
          ]
        : [],
      meaning:
        "Holder counts include wallets that deposited and wallets that received market tokens by transfer.",
      tells: [
        {
          scope: "market",
          text: "The number of holders and the largest current holding.",
        },
      ],
      doesNotTell:
        "Who controls the wallets, whether several belong to one lender, or why a holder left.",
    },
  }

  const terms: RowCard = {
    key: "2.10",
    card: {
      name: "Grace period",
      value: grace === undefined ? undefined : hours(grace),
      word: BLANK.unavailable,
      sub: join(
        n("M16") === undefined
          ? undefined
          : `${hours(n("M16")!)} withdrawal cycle`,
        n("M12") === undefined ? undefined : `+${percent(n("M12")!)} penalty`,
      ),
    },
    panel: {
      ids: ["M15", "M16", "M12", "M14", "D03", "D06", "M77"],
      question: "What are the current contract terms?",
      formula: [
        "The grace tracker rises while cash is short and falls after cash is restored. Penalty interest applies while it exceeds the grace period.",
      ],
      numbers: [
        ["Grace period", display(grace, hours)],
        ["Withdrawal cycle", display(n("M16"), hours)],
        ["Current cycle", s("D06") ?? BLANK.unavailable],
        ["Penalty APR", display(n("M12"), percent)],
        ["Reserve ratio", display(n("M14"), percent)],
        ["Minimum deposit", amount(n("D03"))],
        ["Lifecycle", s("M77") ?? BLANK.unavailable],
      ],
      chips: [],
      meaning:
        "These parameters define the market's rules at the snapshot. The rolling tracker is not a fresh allowance for every incident.",
      tells: [
        {
          scope: "market",
          text: "The reserve, withdrawal and penalty terms used to interpret this record.",
        },
      ],
      doesNotTell:
        "Whether the rules will be kept, or the legal terms in the lender's agreement.",
    },
  }
  return {
    rowA: uniqueFormulas([inOrder, worstIncident, exits, rightNow, pays]),
    supporting: uniqueFormulas([line, history, funds, terms]),
    position,
  }
}
