import * as React from "react"

import { BorrowerAnalytics, Comparison } from "./api"
import {
  CountedSquares,
  DirectionLine,
  LateShareRow,
  LateShareRows,
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
} from "./format"
import {
  deadlineEvidence,
  GATES,
  limitedVerdict,
  rankPhrase,
  reader,
  uniqueFormulas,
} from "./helpers"
import { RowCard } from "./IndexPanel"
import { GD, StateTone } from "./tokens"

const join = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(" · ") || undefined
const unavailable = "The calculation is not available at this snapshot."
const bookRail = (
  name: string,
  value: number,
  comparison: Comparison | undefined,
  ids: string[],
) => (
  <Rail
    value={value}
    median={comparison?.median}
    label={`${name} ${percent(value)}${
      comparison
        ? `; median ${percent(comparison.median)} across ${count(
            comparison.population,
          )} graded borrowers`
        : ""
    }`}
    caption={
      comparison
        ? `Median ${percent(comparison.median)} · ${count(
            comparison.population,
          )} borrowers`
        : undefined
    }
    ids={ids}
  />
)

/** Absence of a flag is not evidence of a healthy market. */
export function borrowerNow(borrower: BorrowerAnalytics) {
  const open = borrower.markets.filter(
    (market) => market.state !== "Ok" || market.values.M77 !== "Closed",
  )
  const known = open.filter(
    (market) =>
      market.state === "Ok" &&
      market.values.M77 === "Open" &&
      [0, 1].includes(Number(market.values.M21)) &&
      isNumber(market.values.M21) &&
      [0, 1].includes(Number(market.values.M85)) &&
      isNumber(market.values.M85),
  )
  const late = known.filter(
    (market) => market.values.M21 === 1 || market.values.M85 === 1,
  )
  const past = known.filter((market) => market.values.M85 === 1)
  const unknown = open.length - known.length
  const incomplete = unknown > 0 || borrower.partial || borrower.state !== "Ok"
  let state: { word: string; tone: StateTone } = {
    word: "IN ORDER",
    tone: "good",
  }
  let sub = `${count(known.length)} open markets`
  if (past.length) state = { word: "PENALTY ACTIVE", tone: "bad" }
  else if (late.length) state = { word: "WITHIN GRACE", tone: "warn" }
  else if (incomplete) state = { word: "INCOMPLETE", tone: "neutral" }
  else if (open.length === 0)
    state = {
      word: borrower.markets.length ? "NO OPEN MARKETS" : "NO MARKETS",
      tone: "neutral",
    }
  if (late.length)
    sub = `${count(late.length)} of ${count(open.length)} markets flagged`
  if (incomplete)
    sub = join(
      sub,
      unknown ? `${count(unknown)} unavailable` : "Partial coverage",
    )!
  return {
    state,
    sub,
    open: open.length,
    late: late.length,
    past: past.length,
    unknown,
    incomplete,
  }
}

export function borrowerCards(borrower: BorrowerAnalytics) {
  const { n, s } = reader(borrower.values)
  const cmp = borrower.comparisons
  const marketDays = n("MARKET_DAYS")
  const markets = n("S01")
  const book = marketDays === 0 ? undefined : n("S05")
  const kept = marketDays === 0 ? undefined : n("D21")
  const neverLate =
    !borrower.partial &&
    borrower.state === "Ok" &&
    borrower.markets.length > 0 &&
    marketDays !== undefined &&
    marketDays > 0 &&
    borrower.markets.every(
      (market) => market.state === "Ok" && market.values.H02 === 0,
    )
  const cashSegments =
    book === undefined
      ? []
      : [
          {
            value: book,
            color: GD.link,
            label: `Cash available ${percent(book)}`,
          },
          {
            value: Math.max(0, 100 - book),
            color: GD.withinGrace,
            label: `Cash short ${percent(100 - book)}`,
          },
        ]
  let historyWord: string = BLANK.unavailable
  if (neverLate) historyWord = BLANK.neverLate
  else if (markets === 0) historyWord = "no funded history"
  const inOrder: RowCard = {
    key: "3.1",
    card: {
      name: "In order, all markets",
      value: book === undefined || neverLate ? undefined : score(book),
      word: historyWord,
      verdict: limitedVerdict(
        marketDays !== undefined && marketDays < GATES.days,
        neverLate,
      ),
      sub: join(
        kept === undefined ? undefined : `Contract kept ${score(kept)}`,
        marketDays === undefined
          ? undefined
          : `${count(marketDays)} market-days`,
      ),
      comparison: cmp.S05 ? `Median ${score(cmp.S05.median)}` : undefined,
      chart:
        book === undefined
          ? undefined
          : bookRail("Book cash available", book, cmp.S05, ["S05"]),
    },
    panel: {
      ids: ["S05", "D21", "MARKET_DAYS", "S06", "S07", "S27"],
      question: "Across the book, was the required cash available?",
      formula: [
        book === undefined || marketDays === undefined || marketDays === 0
          ? unavailable
          : `Book availability = Σ (market availability × market age) / ${count(
              marketDays,
            )} market-days = ${score(book)}.`,
        kept === undefined
          ? unavailable
          : `Contract kept = 100 − weighted share of time under penalty = ${score(
              kept,
            )}.`,
      ],
      numbers: [
        ["Funded markets", display(markets, count)],
        ["Market-days", display(marketDays, count)],
        ["Lowest availability", display(n("S06"))],
        ["Highest availability", display(n("S07"))],
        ["Last 90 days", display(n("S27"))],
      ],
      chart:
        book === undefined ? undefined : (
          <ShareBar segments={cashSegments} ids={["S05"]} />
        ),
      chips: cmp.S05
        ? [
            {
              label: "Median",
              text: `${score(cmp.S05.median)} across ${count(
                cmp.S05.population,
              )} graded borrowers.`,
            },
            {
              label: "All borrowers",
              text: rankPhrase(cmp.S05, "borrowers"),
              chart: rankChart(cmp.S05, "borrowers"),
            },
          ]
        : [],
      meaning:
        "Each market contributes according to its age. Cash-short time and penalty time are measured separately; the rolling grace tracker may stay above grace after cash is restored.",
      tells: [
        {
          scope: "borrower",
          text: "Cash availability across the funded markets included in this snapshot.",
        },
      ],
      doesNotTell:
        "The record of the particular market you would enter. A book average can hide a weak market, and a partial snapshot excludes unavailable markets.",
    },
  }

  const deadlines = n("S14")
  const covered = n("S15")
  const rate = n("S16")
  const missed =
    deadlines !== undefined && covered !== undefined
      ? deadlines - covered
      : undefined
  const split = s("D18")?.match(/^(\d+)\s*\/\s*(\d+)$/)
  const paidLate = split ? Number(split[1]) : undefined
  const unpaid = split ? Number(split[2]) : undefined
  const splitKnown =
    paidLate !== undefined &&
    unpaid !== undefined &&
    paidLate + unpaid === missed
  const groups =
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
    rate !== undefined
  )
    exitFormula = `On time = ${count(covered)} funded deadlines / ${count(
      deadlines,
    )} deadlines × 100 = ${percent(rate)}.`
  const exits: RowCard = {
    key: "3.3",
    card: {
      name: "Exits paid on time",
      value:
        deadlines !== undefined && deadlines > 0 && rate !== undefined
          ? percent(rate)
          : undefined,
      word: deadlines === 0 ? BLANK.noExits : BLANK.unavailable,
      verdict: limitedVerdict(
        deadlines !== undefined && deadlines > 0 && deadlines < GATES.deadlines,
        rate === 100,
      ),
      sub: deadlineEvidence(deadlines, covered),
      comparison: cmp.S16 ? `Median ${percent(cmp.S16.median)}` : undefined,
      chart:
        deadlines && rate !== undefined
          ? bookRail("Exits funded on time", rate, cmp.S16, ["S16"])
          : undefined,
    },
    panel: {
      ids: ["S14", "S15", "S16", "S17", "D18"],
      question: "Were withdrawal deadlines met across the book?",
      formula: [
        exitFormula,
        ...(missed !== undefined && missed > 0
          ? [
              splitKnown
                ? `${count(
                    paidLate!,
                  )} missed deadlines were funded later; ${count(
                    unpaid!,
                  )} remain unpaid.`
                : `${count(
                    missed,
                  )} deadlines were missed. Their later funding status is not available.`,
            ]
          : []),
      ],
      numbers: [
        ["Payout deadlines", display(deadlines, count)],
        ["Funded on time", display(covered, count)],
        [
          "Lowest market rate",
          deadlines === 0 ? BLANK.noExits : display(n("S17"), percent),
        ],
      ],
      chart:
        deadlines && groups.length ? (
          <CountedSquares groups={groups} ids={["S14", "S15", "D18"]} />
        ) : undefined,
      chips: cmp.S16
        ? [
            {
              label: "Median",
              text: `${percent(cmp.S16.median)} across ${count(
                cmp.S16.population,
              )} graded borrowers.`,
            },
            {
              label: "All borrowers",
              text: rankPhrase(cmp.S16, "borrowers"),
              chart: rankChart(cmp.S16, "borrowers"),
            },
          ]
        : [],
      meaning:
        "Each withdrawal deadline counts once. This is the ratio of funded deadlines to all deadlines, not an average of the market percentages.",
      tells: [
        {
          scope: "borrower",
          text: "How often the included markets funded leavers by their deadlines.",
        },
      ],
      doesNotTell:
        "How long a lender waited, or whether missed deadlines are concentrated in one market. Compare the individual markets below.",
    },
  }

  const now = borrowerNow(borrower)
  const flagged = borrower.markets.filter(
    (market) =>
      market.state === "Ok" &&
      market.values.M77 === "Open" &&
      (market.values.M21 === 1 || market.values.M85 === 1),
  )
  const debtRows: [string, string][] = flagged.map((market) => {
    const { n: metric, s: text } = reader(market.values)
    const debt = metric("M07")
    const asset = text("M02")
    return [
      `${market.symbol ?? market.address.slice(0, 10)} total debt`,
      debt === undefined || !asset
        ? BLANK.unavailable
        : `${tokens(debt)} ${asset}`,
    ]
  })
  // One square per open market. In order stays neutral; colour marks the
  // exceptions, and a market whose state is unavailable is only an outline.
  const stateGroups = [
    {
      count: now.open - now.unknown - now.late,
      color: GD.ghost,
      label: "In order",
    },
    {
      count: now.late - now.past,
      color: GD.withinGrace,
      label: "Within grace",
    },
    { count: now.past, color: GD.pastAllowance, label: "Penalty active" },
    {
      count: now.unknown,
      color: GD.muted,
      label: "State unavailable",
      outline: true,
    },
  ]
    .filter((group) => group.count > 0)
    .map((group) => ({
      ...group,
      label: `${group.label} ${count(group.count)}`,
    }))
  const rightNow: RowCard = {
    key: "3.4",
    card: {
      name: "Right now, all markets",
      state: now.state,
      sub: now.sub,
      chart: stateGroups.length ? (
        <CountedSquares
          legend={false}
          groups={stateGroups}
          ids={["M21", "M85"]}
        />
      ) : undefined,
    },
    panel: {
      ids: ["S18", "M21", "M85", "M07"],
      question: "Which markets need attention at this snapshot?",
      formula: [
        "Each open market is checked for a cash shortage within grace or an active penalty tracker.",
        now.incomplete
          ? "Some market states are unavailable; the known states cannot establish an all-clear result."
          : `${count(now.late)} of ${count(
              now.open,
            )} open markets are flagged, including ${count(
              now.past,
            )} with an active penalty tracker.`,
      ],
      numbers: [
        ["Open markets", count(now.open)],
        ["Known flagged markets", count(now.late)],
        ["Penalty active", count(now.past)],
        ...debtRows,
      ],
      chips: borrower.protocol
        ? [
            {
              label: "All markets",
              text: `${count(borrower.protocol.lateNow)} of ${count(
                borrower.protocol.openMarkets,
              )} open protocol markets have a cash shortage or active penalty tracker.`,
            },
          ]
        : [],
      meaning:
        "A penalty tracker can remain active after cash is restored. Each market's debt remains in its own asset; these amounts are not summed across assets.",
      tells: [
        {
          scope: "borrower",
          text: "The current flags and the debt of affected markets.",
        },
      ],
      doesNotTell:
        "The historical record, or the size of a current cash shortfall. Total debt is not the amount past due.",
    },
  }

  const completed = n("S30")
  const verified = n("S33")
  const closedMarkets = borrower.markets.filter(
    (market) => market.state === "Ok" && market.values.M77 === "Closed",
  )
  const closedAssets = new Set(closedMarkets.map((market) => market.values.M02))
  const singleAsset =
    closedAssets.size === 1 && typeof [...closedAssets][0] === "string"
      ? String([...closedAssets][0])
      : undefined
  const capital = n("S31")
  const cycle: RowCard = {
    key: "3.6",
    card: {
      name: "Completed facilities",
      value:
        completed !== undefined && completed > 0 ? count(completed) : undefined,
      word: completed === 0 ? BLANK.noneCompleted : BLANK.unavailable,
      sub:
        completed !== undefined && completed > 0 && verified !== undefined
          ? `${count(verified)} of ${count(completed)} verified`
          : undefined,
      comparison: borrower.protocol
        ? `${count(borrower.protocol.completedFacilities)} protocol-wide`
        : undefined,
    },
    panel: {
      ids: ["S30", "S31", "S32", "S33", "S34"],
      question: "How much lending history reached closure?",
      formula: [
        completed === undefined
          ? unavailable
          : `${count(completed)} funded markets have closed.`,
        verified === undefined
          ? unavailable
          : `${count(verified)} closures have a stored verification check.`,
      ],
      numbers: [
        ["Completed markets", display(completed, count)],
        ["Verified closures", display(verified, count)],
        ["Share of market-days completed", display(n("S32"), percent)],
        ...(singleAsset &&
        capital !== undefined &&
        !borrower.partial &&
        closedMarkets.length === completed
          ? [
              [
                "Lifetime deposits in closed markets",
                `${tokens(capital)} ${singleAsset}`,
              ] as [string, string],
            ]
          : []),
      ],
      chips: [],
      meaning:
        "Completion measures facilities that took deposits and later closed. Verification records a separate chain check; lenders can still have funded balances waiting to be claimed.",
      tells: [
        {
          scope: "borrower",
          text: "How many facilities have completed a full lifecycle.",
        },
      ],
      doesNotTell:
        "That every lender has claimed their funds, or that the borrower's remaining markets will follow the same path.",
    },
  }

  const incidents = n("S12")
  const noFinished =
    borrower.markets.length > 0 &&
    borrower.markets.every(
      (market) => market.state === "Ok" && market.values.M20 === 0,
    )
  let cureEvidence: string | undefined
  if (noFinished) cureEvidence = "No finished incidents"
  else if (n("D16") !== undefined)
    cureEvidence = `Typical cure ${hours(n("D16")!)}`
  const discipline: RowCard = {
    key: "3.8",
    card: {
      name: "Incident history",
      value:
        incidents !== undefined && incidents > 0 ? count(incidents) : undefined,
      word: incidents === 0 ? BLANK.noIncidents : BLANK.unavailable,
      sub: cureEvidence,
      comparison: cmp.S12
        ? `Median ${count(cmp.S12.median)} incidents`
        : undefined,
    },
    panel: {
      ids: ["S12", "D16", "D15"],
      question: "How long do cash shortfalls last?",
      formula: [
        incidents === undefined
          ? unavailable
          : `${count(
              incidents,
            )} cash-shortfall incidents across the book, including incidents still open.`,
      ],
      numbers: [
        ["Incidents", display(incidents, count)],
        [
          "Mean finished-incident duration",
          noFinished ? "no finished incidents" : display(n("D16"), hours),
        ],
        ["Longest incident", display(n("D15"), days)],
      ],
      chips: cmp.S12
        ? [
            {
              label: "Median",
              text: `${count(cmp.S12.median)} incidents across ${count(
                cmp.S12.population,
              )} graded borrowers.`,
            },
          ]
        : [],
      meaning:
        "Mean cure time uses finished incidents. The longest duration also includes any cash shortfall still open at the snapshot.",
      tells: [
        {
          scope: "borrower",
          text: "The frequency of shortages and the duration of their recovery.",
        },
      ],
      doesNotTell:
        "The money short in each incident, or how many incidents broke contractual rules. Incident counts and rolling penalty time measure different things.",
    },
  }

  const lenders = n("S37")
  const breadth: RowCard = {
    key: "3.10",
    card: {
      name: "Lenders over time",
      value: lenders === undefined ? undefined : count(lenders),
      word: BLANK.unavailable,
      comparison: cmp.S37 ? `Median ${count(cmp.S37.median)}` : undefined,
    },
    panel: {
      ids: ["S37"],
      question: "How many wallets have held the borrower's market tokens?",
      formula: [
        lenders === undefined
          ? unavailable
          : `${count(
              lenders,
            )} distinct historical holders, counting each wallet once across the included markets.`,
      ],
      chips: cmp.S37
        ? [
            {
              label: "Median",
              text: `${count(cmp.S37.median)} holders across ${count(
                cmp.S37.population,
              )} graded borrowers.`,
            },
          ]
        : [],
      meaning:
        "Historical holders include depositors and wallets that received tokens by transfer.",
      tells: [
        {
          scope: "borrower",
          text: "The breadth of token ownership over the recorded history.",
        },
      ],
      doesNotTell:
        "How many remain, how much they hold, or whether several wallets belong to one lender.",
    },
  }
  return {
    rowA: uniqueFormulas([
      inOrder,
      exits,
      rightNow,
      cycle,
      discipline,
      breadth,
    ]),
  }
}

/** Cash shortage and penalty time overlap; show independent measurements. */
export function troubleOverTime(borrower: BorrowerAnalytics, compact = false) {
  const rows: LateShareRow[] = borrower.markets
    .flatMap((market) => {
      const { n } = reader(market.values)
      const life = n("H01")
      const late = n("H02")
      if (
        market.state !== "Ok" ||
        life === undefined ||
        life <= 0 ||
        late === undefined
      )
        return []
      const lateShare = (100 * late) / life
      const penaltyShare = n("M26")
      return [
        {
          label: market.symbol ?? market.address.slice(0, 10),
          lateShare,
          penaltyShare,
          valueLabel: `${percent(lateShare)} cash short`,
          tooltip: `${days(late / 86_400)} cash short over ${days(
            life / 86_400,
          )} recorded${
            penaltyShare === undefined
              ? ""
              : `; penalty active ${lifeShare(penaltyShare)} of recorded time`
          }`,
        },
      ]
    })
    .sort((left, right) => right.lateShare - left.lateShare)
  const { n } = reader(borrower.values)
  const lifetime = (n("MARKET_DAYS") ?? 0) > 0 ? n("S05") : undefined
  const trailing = n("S27")
  return {
    concentration: rows.length ? (
      <LateShareRows
        rows={rows}
        ids={["H02", "H01", "M26"]}
        compact={compact}
      />
    ) : null,
    direction:
      lifetime !== undefined && trailing !== undefined ? (
        <DirectionLine
          from={lifetime}
          to={trailing}
          fromLabel={`Lifetime ${percent(lifetime)}`}
          toLabel={`Last 90 days ${percent(trailing)}`}
          ids={["S05", "S27"]}
          compact={compact}
        />
      ) : null,
  }
}
