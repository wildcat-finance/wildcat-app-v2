import * as React from "react"

import { BorrowerAnalytics, MarketAnalytics } from "./api"
import { Buckets, CountedSquares, LimitBar, ShareBar } from "./charts"
import {
  BLANK,
  count,
  days,
  hours,
  lifeShare,
  of,
  percent,
  score,
  tokens,
  trend,
} from "./format"
import {
  GATES,
  leadingNumber,
  limitedVerdict,
  ordinal,
  rankPhrase,
  reader,
  withNote,
} from "./helpers"
import { RowCard } from "./IndexPanel"
import { GD, StateTone } from "./tokens"

// Market Analytics cards (cheat sheet v4 §7–8; education package §3). Copy
// follows the package's seven fields: the question, the calculation with this
// market's numbers, what it means, what it tells you and what it does not.

const DAY = 86_400
const twoDecimals = (value: number) => value.toFixed(2)

/** Where this market sits among its borrower's graded markets by In order. */
export function borrowerPosition(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) {
  if (!borrower) return undefined
  const grades = borrower.markets
    .map((row) => ({ address: row.address, grade: row.values.M18 }))
    .filter(
      (row): row is { address: string; grade: number } =>
        typeof row.grade === "number",
    )
  const own = grades.find((row) => row.address === market.market.address)
  if (!own || grades.length < 2) return undefined
  const sorted = [...grades].sort((left, right) => right.grade - left.grade)
  const rank = sorted.findIndex((row) => row.address === own.address) + 1
  let word = `${ordinal(rank)} strongest`
  if (rank === 1) word = "strongest"
  if (rank === sorted.length) word = "weakest"
  return {
    count: sorted.length,
    min: sorted[sorted.length - 1].grade,
    max: sorted[0].grade,
    word,
  }
}

export function marketCards(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) {
  const { n, s } = reader(market.values)
  const cmp = market.comparisons
  const { protocol } = market
  const asset = s("M02") ?? ""
  const age = n("M05") ?? 0
  const grace = n("M15") ?? 0
  const position = borrowerPosition(market, borrower)
  const borrowerChip = position
    ? {
        label: "vs this borrower",
        text: `Their ${count(position.count)} markets run ${score(
          position.min,
        )} to ${score(position.max)} on In order; this one is their ${
          position.word
        }.`,
      }
    : undefined

  // 2.1 In order
  const lateSeconds = n("H02") ?? 0
  const lifeSeconds = n("H01") ?? 0
  const neverLate = lateSeconds === 0
  const cashThere = n("M18") ?? 100
  const pastShare = n("M26") ?? 0
  const withinShare = Math.max(0, 100 - cashThere - pastShare)
  const inOrderVerdict = limitedVerdict(age < GATES.days, neverLate)
  const quietHours = n("M80") ?? 0
  const trailing = n("M67")
  const inOrder: RowCard = {
    key: "2.1",
    card: {
      name: "In order",
      shortName: "In order",
      help: "Share of the market's life it held the cash its rules require. Short time shows as Pending in the app (protocol term: delinquency). Contract kept counts only time past the grace period.",
      value: neverLate ? undefined : score(cashThere),
      word: neverLate ? BLANK.neverLate : undefined,
      verdict: inOrderVerdict,
      sub: withNote(
        neverLate
          ? `over ${count(age)} days`
          : `contract kept: ${score(100 - pastShare)}`,
        inOrderVerdict,
      ),
      comparison:
        cmp.M18 && cmp.M26
          ? `protocol medians: cash there ${score(
              cmp.M18.median,
            )} · contract kept ${score(100 - cmp.M26.median)}`
          : undefined,
    },
    panel: {
      ids: ["M18", "M26", "H01", "H02", "M05", "M20", "M67", "M68"],
      question: "Was the money there when lenders asked for it?",
      formula: [
        `The market was short of the cash its rules require for ${twoDecimals(
          lateSeconds / DAY,
        )} of the ${twoDecimals(
          lifeSeconds / DAY,
        )} days on record (H02 of H01).`,
        `Cash there = 100 × (1 − ${twoDecimals(
          lateSeconds / DAY,
        )} / ${twoDecimals(lifeSeconds / DAY)}) = ${score(cashThere, 2)}.`,
        `${lifeShare(
          pastShare,
        )} of the market's life was short for longer than its ${hours(
          grace,
        )} grace period (M26).`,
        `Contract kept = 100 − ${twoDecimals(pastShare)} = ${score(
          100 - pastShare,
          2,
        )}.`,
      ],
      numbers: [
        ["Days on record", days(lifeSeconds / DAY)],
        ["Days short of required cash", days(lateSeconds / DAY)],
        ["Incidents", count(n("M20") ?? 0)],
        ["Past the grace period", lifeShare(pastShare)],
        [
          "Last 90 days",
          trailing === undefined ? "under 7 days on record" : score(trailing),
        ],
        [
          "Trend (last 90 days − lifetime)",
          n("M68") === undefined ? "–" : trend(n("M68")!),
        ],
        ...(quietHours > 24
          ? ([
              [
                "Quiet while owing",
                `${hours(quietHours)} since the last interaction`,
              ],
            ] as [string, string][])
          : []),
      ],
      chart: (
        <ShareBar
          ids={["M18", "M26"]}
          segments={[
            {
              value: cashThere,
              color: GD.inOrder,
              label: `in order ${percent(cashThere)}`,
            },
            {
              value: withinShare,
              color: GD.withinGrace,
              label: `within grace ${percent(withinShare)}`,
            },
            {
              value: pastShare,
              color: GD.pastAllowance,
              label: `past the grace period ${lifeShare(pastShare)}`,
            },
          ]}
        />
      ),
      chips: [
        {
          label: "median",
          text: cmp.M18
            ? `Across ${count(
                cmp.M18.population,
              )} graded markets the median is ${score(
                cmp.M18.median,
              )} cash there and ${score(
                100 - (cmp.M26?.median ?? 0),
              )} contract kept.`
            : "Not enough graded markets to compare yet.",
        },
        { label: "vs all markets", text: rankPhrase(cmp.M18, "markets", age) },
        ...(borrowerChip ? [borrowerChip] : []),
      ],
      meaning: neverLate
        ? `In ${count(
            age,
          )} days on record this market has never been short of the cash its rules require.`
        : `For ${percent(cashThere)} of its ${count(
            age,
          )} days the market held the cash its rules require; for the rest it was short. Only ${lifeShare(
            pastShare,
          )} of its life was short for longer than the ${hours(
            grace,
          )} grace period, which is why contract kept reads ${score(
            100 - pastShare,
          )}. Short time inside the grace period is working room the contract allows; time past it is the rule being broken.`,
      tells: [
        {
          scope: "market",
          text: "How consistently this market held its required cash over its whole life.",
        },
        {
          scope: "market",
          text: "Whether lateness was grace-period usage or rule-breaking, from the gap between the two lines.",
        },
        {
          scope: "borrower",
          text: "How tightly this borrower runs the reserve in this market.",
        },
      ],
      doesNotTell:
        "How much cash was missing (a small and a large shortfall count the same), or whether it was one long stretch or many brief ones. Incident history answers the second.",
    },
  }

  // 2.2 Worst incident
  const incidents = n("M20") ?? 0
  const worst = n("M24") ?? 0
  const longest = n("M23") ?? 0
  const neverLateWorst = incidents === 0 && longest === 0
  const worstVerdict = limitedVerdict(
    incidents > 0 && incidents < GATES.incidents,
    worst <= 100,
  )
  let worstMeaning = `Even the worst late spell, ${hours(
    longest,
  )}, stayed inside the ${hours(grace)} grace period.`
  if (worst > 100) {
    worstMeaning = `The worst late spell ran ${hours(longest)} against ${hours(
      grace,
    )} allowed (${percent(
      worst,
    )} of the grace period), so it broke the deadline. A single incident is enough to pass 100%, so read it with the incident count: ${count(
      incidents,
    )}.`
  }
  if (neverLateWorst) {
    worstMeaning =
      "This market has never been short of required cash, so there is no worst incident."
  }
  const worstIncident: RowCard = {
    key: "2.2",
    card: {
      name: "Worst incident",
      shortName: "Worst",
      help: "The longest time the market was short of required cash, as a share of its grace period (allowed lateness). Over 100% means the deadline was broken.",
      value: neverLateWorst ? undefined : percent(worst),
      word: neverLateWorst ? BLANK.neverLate : undefined,
      verdict: worstVerdict,
      sub: neverLateWorst
        ? undefined
        : withNote(`of the ${hours(grace)} allowed lateness`, worstVerdict),
      comparison: cmp.M24
        ? `protocol median: ${percent(cmp.M24.median)}`
        : undefined,
    },
    panel: {
      ids: ["M24", "M23", "M15", "M20", "M25", "M83"],
      question:
        "How bad did the worst late spell get, against the time allowed?",
      formula: [
        `The longest incident lasted ${hours(
          longest,
          2,
        )}; the grace period allows ${hours(grace, 2)}.`,
        `Worst incident = 100 × ${twoDecimals(longest)} / ${twoDecimals(
          grace,
        )} = ${percent(worst, 2)}.`,
        worst > 100
          ? "Over 100% means the grace period was exceeded."
          : "At or under 100% means even the worst incident stayed inside the grace period.",
      ],
      numbers: [
        ["Incidents", count(incidents)],
        ["Longest incident", hours(longest)],
        ["Grace period", hours(grace)],
        ["Incidents past the grace period", BLANK.countSoon],
        ["Cured within the grace period", BLANK.countSoon],
      ],
      chart: neverLateWorst ? undefined : (
        <LimitBar
          value={worst}
          limit={100}
          valueLabel={`worst ${percent(worst)}`}
          limitLabel="allowed lateness · 100%"
          ids={["M24", "M23", "M15"]}
        />
      ),
      chips: [
        {
          label: "median",
          text: cmp.M24
            ? `Across ${count(
                cmp.M24.population,
              )} graded markets the median worst incident is ${percent(
                cmp.M24.median,
              )} of the allowance.`
            : "Not enough graded markets to compare yet.",
        },
        { label: "vs all markets", text: rankPhrase(cmp.M24, "markets") },
      ],
      meaning: worstMeaning,
      tells: [
        {
          scope: "market",
          text: "Whether this market ever ran past the time lenders agreed to tolerate.",
        },
        {
          scope: "borrower",
          text: "How far this borrower lets a shortfall run when one happens.",
        },
      ],
      doesNotTell:
        "How often the grace period was exceeded (the breach count is coming soon), or how much cash was missing. It is a lifetime maximum, so it never improves.",
    },
  }

  // 2.3 Exits paid on time
  const deadlines = n("M30") ?? 0
  const covered = n("M31") ?? 0
  const exitsShare = n("M32") ?? 0
  const uncovered = deadlines - covered
  const paidLate = n("D18_LATE")
  const neverPaid = n("D18_NEVER")
  const held = n("M08") ?? 0
  const unclaimed = n("M38") ?? 0
  const exitsVerdict = limitedVerdict(
    deadlines > 0 && deadlines < GATES.deadlines,
    exitsShare === 100,
  )
  let uncoveredStep = "Every deadline was covered on the day."
  if (uncovered > 0) {
    uncoveredStep =
      paidLate === undefined || neverPaid === undefined
        ? `The split of the ${count(
            uncovered,
          )} not covered on the day is coming soon.`
        : `Of the ${count(uncovered)} not covered on the day, ${count(
            paidLate,
          )} were paid late and ${count(neverPaid)} are still unpaid (D18).`
  }
  const exits: RowCard = {
    key: "2.3",
    card: {
      name: "Exits paid on time",
      shortName: "Exits",
      help: "Share of withdrawal batches fully funded when their withdrawal cycle ended (payout deadlines met on the day).",
      value: deadlines ? percent(exitsShare) : undefined,
      word: deadlines ? undefined : BLANK.noExits,
      verdict: exitsVerdict,
      sub: deadlines
        ? withNote(of(deadlines, "payout deadline"), exitsVerdict)
        : undefined,
      comparison: cmp.M32
        ? `protocol median: ${percent(cmp.M32.median)}`
        : undefined,
    },
    panel: {
      ids: ["M32", "M31", "M30", "M33", "D18", "M37", "M38", "M58", "M08"],
      question: "Did lenders who asked to leave get paid on the day?",
      formula: [
        `${count(covered)} of ${count(
          deadlines,
        )} withdrawal batches were fully funded when their cycle ended.`,
        `Exits paid on time = 100 × ${count(covered)} / ${count(
          deadlines,
        )} = ${percent(exitsShare, 2)}.`,
        `By money, ${percent(
          n("M33") ?? 0,
          2,
        )} of what was requested was paid at the deadline (M33).`,
        uncoveredStep,
      ],
      numbers: [
        ["Payout deadlines", count(deadlines)],
        ["Covered on the day", count(covered)],
        [
          "Paid late",
          paidLate === undefined ? BLANK.splitSoon : count(paidLate),
        ],
        [
          "Never paid so far",
          neverPaid === undefined ? BLANK.splitSoon : count(neverPaid),
        ],
        ["Open unpaid batches now", count(n("M37") ?? 0)],
        ["Unclaimed, waiting for lenders", `${tokens(unclaimed)} ${asset}`],
        ["Out with the borrower", `${tokens(n("M58") ?? 0)} ${asset}`],
        ["On hand, not reserved", `${tokens(held - unclaimed)} ${asset}`],
      ],
      chart: deadlines ? (
        <CountedSquares
          ids={["M31", "M30", "D18"]}
          groups={[
            {
              count: covered,
              color: GD.text,
              label: `covered on the day · ${count(covered)}`,
            },
            {
              count: paidLate ?? 0,
              color: GD.withinGrace,
              label: `paid late · ${count(paidLate ?? 0)}`,
            },
            {
              count: neverPaid ?? 0,
              color: GD.pastAllowance,
              label: `never paid · ${count(neverPaid ?? 0)}`,
            },
          ]}
        />
      ) : undefined,
      chips: [
        {
          label: "median",
          text: cmp.M32
            ? `Across ${count(
                cmp.M32.population,
              )} graded markets the median is ${percent(
                cmp.M32.median,
              )} of deadlines covered on the day.`
            : "Not enough graded markets to compare yet.",
        },
        { label: "vs all markets", text: rankPhrase(cmp.M32, "markets") },
      ],
      meaning: deadlines
        ? `${percent(
            exitsShare,
          )} of payout deadlines were met on the day: when a withdrawal cycle ended, the market held enough cash to pay everyone who had asked to leave.${
            uncovered > 0 && paidLate !== undefined && neverPaid !== undefined
              ? ` Of the ${count(uncovered)} that were not, ${count(
                  paidLate,
                )} were paid later and ${count(neverPaid)} are still unpaid.`
              : ""
          }`
        : "No withdrawal cycle has ended in this market yet, so there is no exit record.",
      tells: [
        {
          scope: "market",
          text: "How reliably this market pays leavers on the date its cycle promises.",
        },
        {
          scope: "market",
          text: "Whether missed deadlines were caught up later or left unpaid.",
        },
      ],
      doesNotTell:
        "How long late payers waited: the split says whether they were paid, not when.",
    },
  }

  // 2.4 Right now
  const closed = s("M77") === "Closed"
  const pastNow = n("M85") === 1
  const lateNow = n("M21") === 1
  const countdown = n("D05") ?? leadingNumber(s("D05"))
  const cured = n("M84") ?? 0
  const openBatches = n("M37") ?? 0
  let now: "closed" | "past" | "late" | "ok" = "ok"
  if (lateNow) now = "late"
  if (pastNow) now = "past"
  if (closed) now = "closed"
  const pastLabel =
    countdown === undefined
      ? ""
      : `${hours(countdown)} past the grace period · `
  const graceLeft = countdown === undefined ? "part" : hours(countdown)
  const NOW: Record<
    typeof now,
    {
      state: { word: string; tone: StateTone }
      sub: string
      step: string
      meaning: string
    }
  > = {
    closed: {
      state: { word: "CLOSED", tone: "neutral" },
      sub: "figures frozen at closure",
      step: "This market is closed; its figures are frozen at closure.",
      meaning:
        "The market is closed. Nothing more can go wrong in it; its record is final.",
    },
    past: {
      state: { word: "PAST GRACE", tone: "bad" },
      sub: `${pastLabel}${count(openBatches)} open batches`,
      step: `It has been short for longer than its ${hours(
        grace,
      )} grace period, so the penalty rate applies until it is back under the grace period.`,
      meaning:
        "The market is past its grace period now: lenders who asked to leave may be waiting, and the penalty rate is charging.",
    },
    late: {
      state: { word: "LATE WITHIN GRACE", tone: "warn" },
      sub: `${graceLeft} of grace left`,
      step: `It is short now, with ${graceLeft} of its ${hours(
        grace,
      )} grace period left before the penalty rate applies.`,
      meaning:
        "The market is short now but inside the working room the contract allows. It becomes a broken rule only if the grace period runs out.",
    },
    ok: {
      state: { word: "ALL IN ORDER", tone: "good" },
      sub:
        cured > 0 ? `last incident cured ${days(cured)} ago` : BLANK.neverLate,
      step: "It holds at least the cash its rules require.",
      meaning: "Nothing is wrong at this block.",
    },
  }
  const { state, sub: rightNowSub } = NOW[now]
  const rightNow: RowCard = {
    key: "2.4",
    card: {
      name: "Right now",
      help: "The market's state at the snapshot block: in order, late within its grace period, or past it (Pending and Penaltied in the app).",
      state,
      sub: rightNowSub,
      comparison: protocol
        ? `protocol right now: ${count(protocol.lateNow)} of ${count(
            protocol.openMarkets,
          )} markets are late`
        : undefined,
    },
    panel: {
      ids: ["M21", "M85", "D05", "M84", "M37", "M82"],
      question: "Is anything wrong at this block?",
      formula: [
        "A market is late when the cash it holds is below what its rules require (coverage liquidity above total assets), read at the snapshot block, never from a stored flag.",
        NOW[now].step,
      ],
      numbers: [
        ["Open unpaid batches", count(openBatches)],
        ["Last activity", `${hours(n("M82") ?? 0)} ago`],
        [
          "Last incident cured",
          cured > 0 ? `${days(cured)} ago` : BLANK.neverLate,
        ],
        ["Grace period", hours(grace)],
      ],
      chips: protocol
        ? [
            {
              label: "protocol right now",
              text: `${count(protocol.lateNow)} of ${count(
                protocol.openMarkets,
              )} open markets are late at this block.`,
            },
          ]
        : [],
      meaning: NOW[now].meaning,
      tells: [
        {
          scope: "market",
          text: "Whether you could be waiting on cash today.",
        },
      ],
      doesNotTell:
        "Anything about the past. A market can be in order today after a long late spell: this card is a photograph, and In order is the record.",
    },
  }

  // 2.5 What it pays
  const baseApr = n("M11") ?? 0
  const feeShare = n("M13") ?? 0
  const allIn = baseApr * (1 + feeShare / 100)
  const realised = n("M39")
  const lenderInterest = n("M41") ?? 0
  const penaltyInterest = n("M27") ?? 0
  const penaltyShare = n("M42") ?? 0
  // Posted rates compare open markets; realised rates, every graded market.
  const payMedians = [
    cmp.M11 ? `${percent(cmp.M11.median)} posted` : undefined,
    cmp.M39 ? `${percent(cmp.M39.median)} realised` : undefined,
  ].filter(Boolean)
  const payChip = [
    cmp.M11
      ? `Across ${count(
          cmp.M11.population,
        )} open graded markets the median base APR is ${percent(
          cmp.M11.median,
        )}.`
      : undefined,
    cmp.M39
      ? `Across ${count(
          cmp.M39.population,
        )} graded markets the median realised lender APR is ${percent(
          cmp.M39.median,
        )}.`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ")
  const pays: RowCard = {
    key: "2.5",
    card: {
      name: "What it pays",
      shortName: "APR",
      help: "Base APR paid to lenders now, what lenders have actually earned over the market's life, and what the borrower pays including the protocol fee.",
      value: percent(baseApr),
      sub:
        lenderInterest > 0 && realised !== undefined
          ? `realised ${percent(realised)} · borrower pays ${percent(allIn)}${
              penaltyShare > 5
                ? ` · penalty share ${percent(penaltyShare)}`
                : ""
            }`
          : `${BLANK.noYield} · borrower pays ${percent(allIn)}`,
      comparison: payMedians.length
        ? `protocol median${
            payMedians.length > 1 ? "s" : ""
          }: ${payMedians.join(" · ")}`
        : undefined,
    },
    panel: {
      ids: ["M11", "M39", "M13", "M12", "M42", "M27", "M41", "M44", "M40"],
      question: "What does this market pay, and what has it actually paid?",
      formula: [
        `Lenders are paid the base APR: ${percent(baseApr, 2)} now.`,
        `The borrower pays it plus the protocol fee: ${twoDecimals(
          baseApr,
        )} × (1 + ${twoDecimals(feeShare)} / 100) = ${percent(
          allIn,
          2,
        )}. While penalised, the penalty APR of ${percent(
          n("M12") ?? 0,
          2,
        )} is added on top.`,
        realised === undefined || lenderInterest === 0
          ? "No interest has been paid to lenders yet."
          : `Realised lender APR over the market's life: ${percent(
              realised,
              2,
            )}.`,
        `Penalty share of lender interest = 100 × ${tokens(
          penaltyInterest,
        )} / ${tokens(lenderInterest)} = ${percent(penaltyShare, 2)}.`,
      ],
      numbers: [
        ["Base APR now", percent(baseApr, 2)],
        [
          "Realised lender APR",
          realised === undefined ? BLANK.noYield : percent(realised, 2),
        ],
        ["Lifetime average base APR", percent(n("M40") ?? 0, 2)],
        ["Rate changes", count(n("M44") ?? 0)],
        ["Lifetime lender interest", `${tokens(lenderInterest)} ${asset}`],
        ["Penalty interest", `${tokens(penaltyInterest)} ${asset}`],
      ],
      chips: [
        {
          label: "median",
          text: payChip || "Not enough graded markets to compare yet.",
        },
      ],
      meaning: `Lenders are offered ${percent(baseApr)} today${
        realised !== undefined && lenderInterest > 0
          ? ` and have earned ${percent(
              realised,
            )} on average over the market's life`
          : ""
      }. The borrower's cost is ${percent(allIn)} including the protocol fee${
        penaltyShare > 0
          ? `; ${percent(
              penaltyShare,
            )} of everything lenders earned came from the penalty rate`
          : ""
      }.`,
      tells: [
        {
          scope: "market",
          text: "The yield on offer today and the yield lenders have actually earned.",
        },
        {
          scope: "borrower",
          text: "How often this borrower changes the rate.",
        },
      ],
      doesNotTell: `What the rate will be tomorrow. The borrower can change the base APR, and has done so ${count(
        n("M44") ?? 0,
      )} times.`,
    },
  }

  // 2.6 How the line is used
  const used = n("M86") ?? 0
  const line: RowCard = {
    key: "2.6",
    card: {
      name: "How the line is used",
      value: percent(used),
      sub: `${tokens(n("M07") ?? 0)} owed of a ${tokens(
        n("M06") ?? 0,
      )} ${asset} line`,
      comparison: cmp.M86 ? `median ${percent(cmp.M86.median)}` : undefined,
    },
    panel: {
      ids: ["M86", "M06", "M07", "M59", "M60"],
      question: "How much of the line is in use?",
      formula: [
        `Capacity used = 100 × market token supply / capacity = ${percent(
          used,
          2,
        )}.`,
      ],
      numbers: [
        ["Owed to lenders", `${tokens(n("M07") ?? 0)} ${asset}`],
        ["Line (capacity)", `${tokens(n("M06") ?? 0)} ${asset}`],
        ["Draws", count(n("M59") ?? 0)],
        ["Repayments", count(n("M60") ?? 0)],
      ],
      chips: cmp.M86
        ? [
            {
              label: "median",
              text: `Across ${count(
                cmp.M86.population,
              )} open graded markets the median capacity used is ${percent(
                cmp.M86.median,
              )}.`,
            },
          ]
        : [],
      meaning: `Lender deposits fill ${percent(
        used,
      )} of this market's line, so ${
        used >= 100
          ? "it is full and cannot take more deposits"
          : "there is room for further deposits"
      }.`,
      tells: [
        {
          scope: "market",
          text: "How close the market is to its capacity, and whether a new deposit fits.",
        },
      ],
      doesNotTell:
        "How much the borrower has drawn: capacity used counts lender deposits against the line, not borrowing.",
    },
  }

  // 2.8 Incident history
  const buckets = [
    { label: "under 6 h", count: n("M69") ?? 0 },
    { label: "6–24 h", count: n("M70") ?? 0 },
    { label: "24–48 h", count: n("M71") ?? 0 },
    { label: "over 48 h", count: n("M72") ?? 0 },
  ]
  const history: RowCard = {
    key: "2.8",
    card: {
      name: "Incident history",
      value: incidents ? `${count(incidents)} incidents` : undefined,
      word: incidents ? undefined : BLANK.noIncidents,
      sub: incidents ? `typical ${hours(n("M22") ?? 0)}` : undefined,
      comparison: cmp.M22 ? `median ${hours(cmp.M22.median)}` : undefined,
      chart: incidents ? <Buckets compact buckets={buckets} /> : undefined,
    },
    panel: {
      ids: ["M69", "M70", "M71", "M72", "M20", "M22"],
      question: "How long do late spells usually last?",
      formula: [
        `${count(incidents)} finished incidents sorted by length: ${buckets
          .map((bucket) => `${count(bucket.count)} ${bucket.label}`)
          .join(", ")}.`,
        `Typical (mean) length: ${hours(n("M22") ?? 0, 2)}.`,
      ],
      chart: incidents ? (
        <Buckets buckets={buckets} ids={["M69", "M70", "M71", "M72"]} />
      ) : undefined,
      chips: cmp.M22
        ? [
            {
              label: "median",
              text: `Across ${count(
                cmp.M22.population,
              )} graded markets the median typical incident lasts ${hours(
                cmp.M22.median,
              )}.`,
            },
          ]
        : [],
      meaning: incidents
        ? `Most of this market's ${count(incidents)} incidents ${
            buckets[0].count + buckets[1].count >= incidents / 2
              ? "were cured within a day"
              : "lasted more than a day"
          }.`
        : "This market has never been short of required cash.",
      tells: [
        {
          scope: "market",
          text: "Whether lateness here is brief dips that refill overnight or long droughts.",
        },
        {
          scope: "borrower",
          text: "How quickly this borrower restores the reserve.",
        },
      ],
      doesNotTell:
        "How much cash was short in each incident. An incident still open shows on Right now, not here.",
    },
  }

  // 2.9 Who funds it
  const active = n("M48") ?? 0
  const ever = n("M49") ?? 0
  const funds: RowCard = {
    key: "2.9",
    card: {
      name: "Who funds it",
      value: `${count(active)} lenders`,
      sub: `of ${count(ever)} ever · largest ${percent(n("D10") ?? 0)}`,
      comparison: cmp.M49 ? `median ${count(cmp.M49.median)} ever` : undefined,
    },
    panel: {
      ids: ["M48", "M49", "M51", "D10"],
      question: "Who funds this market, and how concentrated is it?",
      formula: [
        `${count(active)} of ${count(
          ever,
        )} lenders who ever held this market's token hold it now: retention ${percent(
          n("M51") ?? 0,
          2,
        )}.`,
        `The largest lender holds ${percent(n("D10") ?? 0, 2)} of the supply.`,
      ],
      numbers: [
        ["Lenders now", count(active)],
        ["Lenders ever", count(ever)],
        ["Retention", percent(n("M51") ?? 0)],
        ["Largest lender's share", percent(n("D10") ?? 0)],
      ],
      chips: cmp.D10
        ? [
            {
              label: "median",
              text: `Across ${count(
                cmp.D10.population,
              )} open graded markets the median largest-lender share is ${percent(
                cmp.D10.median,
              )}.`,
            },
          ]
        : [],
      meaning: `The market is funded by ${count(
        active,
      )} lenders today; the largest holds ${percent(n("D10") ?? 0)} of it.`,
      tells: [
        {
          scope: "market",
          text: "How broad the lender base is, and how much one lender's exit would move.",
        },
      ],
      doesNotTell:
        "Who the lenders are, or whether the largest is related to the borrower.",
    },
  }

  // 2.10 Terms
  const cycle = s("D06")
  const cycleHours = leadingNumber(cycle)
  const minimumDeposit = n("D03")
  const terms: RowCard = {
    key: "2.10",
    card: {
      name: "Terms",
      value: hours(grace),
      sub: `grace · ${hours(n("M16") ?? 0)} cycle · +${percent(
        n("M12") ?? 0,
      )} penalty`,
    },
    panel: {
      ids: ["M15", "M16", "D06", "M12", "M14", "D03", "M77"],
      question: "What did lenders sign up to?",
      formula: [
        `A shortfall is tolerated for ${hours(
          grace,
        )} (the grace period) before the penalty APR of ${percent(
          n("M12") ?? 0,
        )} is added.`,
        `Withdrawal requests are batched and paid when each ${hours(
          n("M16") ?? 0,
        )} cycle ends.`,
      ],
      numbers: [
        ["Grace period (allowed lateness)", hours(grace)],
        ["Withdrawal cycle (payout window)", hours(n("M16") ?? 0)],
        [
          "Cycle now",
          cycleHours !== undefined && cycle?.startsWith("current")
            ? `current cycle ends in ${hours(cycleHours)}`
            : cycle ?? "–",
        ],
        ["Penalty APR", percent(n("M12") ?? 0)],
        ["Reserve ratio (buffer)", percent(n("M14") ?? 0)],
        [
          "Minimum deposit",
          minimumDeposit === undefined
            ? "not read at this block"
            : `${tokens(minimumDeposit)} ${asset}`,
        ],
        ["Lifecycle", s("M77") ?? "–"],
        ["Market type badges", "coming soon"],
      ],
      chips: [],
      meaning:
        "These are the contract terms every figure on this page is measured against.",
      tells: [
        {
          scope: "market",
          text: "The rules lenders accepted: how long a shortfall may run and how often exits are paid.",
        },
      ],
      doesNotTell:
        "What the MLA says, or whether the borrower will change these terms; some can be changed after launch.",
    },
  }

  return {
    rowA: [inOrder, worstIncident, exits, rightNow, pays],
    supporting: [line, history, funds, terms],
    position,
  }
}
