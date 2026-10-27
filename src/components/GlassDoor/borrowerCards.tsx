import { BorrowerAnalytics } from "./api"
import { DirectionLine, LateShareRow, LateShareRows } from "./charts"
import {
  BLANK,
  count,
  days,
  hours,
  lifeShare,
  percent,
  score,
  tokens,
  trend,
} from "./format"
import { GATES, limitedVerdict, rankPhrase, reader, withNote } from "./helpers"
import { RowCard } from "./IndexPanel"
import { StateTone } from "./tokens"

// Borrower Analytics cards (cheat sheet v4 §7–8; education package §4). The
// book is every market one borrower runs; a book figure weights each market
// by its days on record.

/** Right now across the book, from each market's state at the block. */
export function borrowerNow(borrower: BorrowerAnalytics) {
  const open = borrower.markets.filter(
    (market) => market.values.M77 !== "Closed",
  )
  const late = open.filter(
    (market) => market.values.M21 === 1 || market.values.M85 === 1,
  )
  const past = open.filter((market) => market.values.M85 === 1)
  let state: { word: string; tone: StateTone } = {
    word: "ALL IN ORDER",
    tone: "good",
  }
  let sub = `${count(open.length)} open markets, none late`
  if (open.length === 0) {
    state = { word: "NO OPEN MARKETS", tone: "neutral" }
    sub = "every market is closed"
  } else if (late.length) {
    state = past.length
      ? { word: "PAST GRACE", tone: "bad" }
      : { word: "LATE WITHIN GRACE", tone: "warn" }
    sub = `${count(late.length)} of ${count(open.length)} markets late`
  }
  return { state, sub, open: open.length, late: late.length, past: past.length }
}

export function borrowerCards(borrower: BorrowerAnalytics) {
  const { n, s } = reader(borrower.values)
  const cmp = borrower.comparisons
  const { protocol } = borrower
  const marketDays = n("MARKET_DAYS") ?? 0
  const markets = n("S01") ?? 0

  // 3.1 In order, all markets (with book exits folded in)
  const book = n("S05")
  const neverLate = book === 100
  const kept = n("D21")
  const deadlines = n("S14") ?? 0
  const covered = n("S15") ?? 0
  const split = s("D18")?.split(" / ").map(Number)
  const bookVerdict = limitedVerdict(marketDays < GATES.days, neverLate)
  const inOrder: RowCard = {
    key: "3.1",
    card: {
      name: "In order, all markets",
      help: "Every market's cash-there grade, weighted by its days on record, with contract kept (time past the grace period only) underneath.",
      value: book === undefined || neverLate ? undefined : score(book),
      word: book === undefined || neverLate ? BLANK.neverLate : undefined,
      verdict: bookVerdict,
      sub: withNote(
        kept === undefined
          ? `over ${count(marketDays)} market-days`
          : `contract kept: ${score(kept)}`,
        bookVerdict,
      ),
      comparison:
        cmp.S05 && cmp.D21
          ? `protocol medians: book ${score(
              cmp.S05.median,
            )} · contract kept ${score(cmp.D21.median)}`
          : undefined,
    },
    panel: {
      ids: [
        "S05",
        "D21",
        "S06",
        "S07",
        "S27",
        "S28",
        "S14",
        "S15",
        "S16",
        "S17",
        "D18",
      ],
      question: "Across all their markets, was the money there?",
      formula: [
        `Book in order = Σ (In order × days) / Σ days over ${count(
          markets,
        )} markets and ${count(marketDays)} market-days = ${
          book === undefined ? "–" : score(book, 2)
        }.`,
        `Contract kept, all markets = 100 − weighted time past the grace period = ${
          kept === undefined ? "–" : score(kept, 2)
        }.`,
        `Their markets run from ${
          n("S06") === undefined ? "–" : score(n("S06")!)
        } to ${n("S07") === undefined ? "–" : score(n("S07")!)}; last 90 days ${
          n("S27") === undefined ? "under 7 days on record" : score(n("S27")!)
        }${n("S28") === undefined ? "" : ` (trend ${trend(n("S28")!)})`}.`,
        deadlines
          ? `Book exits paid on time = 100 × ${count(covered)} / ${count(
              deadlines,
            )} = ${percent(
              n("S16") ?? 0,
              2,
            )}; the weakest market on exits covered ${percent(n("S17") ?? 0)}.`
          : "No withdrawal cycle has ended in any of their markets yet.",
        ...(deadlines > covered
          ? [
              split && split.length === 2
                ? `Of the ${count(
                    deadlines - covered,
                  )} deadlines not covered on the day, ${count(
                    split[0],
                  )} were paid late and ${count(split[1])} are still unpaid.`
                : `The split of the ${count(
                    deadlines - covered,
                  )} deadlines not covered is coming soon.`,
            ]
          : []),
      ],
      numbers: [
        ["Markets", count(markets)],
        ["Market-days on record", count(marketDays)],
        ["Weakest market", n("S06") === undefined ? "–" : score(n("S06")!)],
        ["Strongest market", n("S07") === undefined ? "–" : score(n("S07")!)],
        ["Payout deadlines", count(deadlines)],
        ["Covered on the day", count(covered)],
      ],
      chips: [
        {
          label: "median",
          text: cmp.S05
            ? `Across ${count(
                cmp.S05.population,
              )} graded borrowers the median book is ${score(cmp.S05.median)}.`
            : "Not enough graded borrowers to compare yet.",
        },
        {
          label: "vs all borrowers",
          text: rankPhrase(cmp.S05, "borrowers", marketDays),
        },
      ],
      meaning:
        book === undefined
          ? "None of this borrower's markets has taken deposits yet."
          : `Across ${count(
              markets,
            )} markets the borrower held the cash its rules require ${percent(
              book,
            )} of the time, weighted by how long each market has run. A book grade blends strong and weak markets; you deposit into one market, so judge that one in the table below.`,
      tells: [
        {
          scope: "borrower",
          text: "How consistently this borrower keeps the cash their markets require.",
        },
        {
          scope: "borrower",
          text: "Whether breaking the rules is rare across their book (contract kept).",
        },
        {
          scope: "both",
          text: "Whether a weak market is the exception or the pattern, from the range.",
        },
      ],
      doesNotTell:
        "Which market you would deposit into: an average can hide the weakest market. Read the per-market table.",
    },
  }

  // 3.4 Right now, all markets
  const now = borrowerNow(borrower)
  const rightNow: RowCard = {
    key: "3.4",
    card: {
      name: "Right now, all markets",
      help: "The state of every open market at the snapshot block.",
      state: now.state,
      sub: now.sub,
      comparison: protocol
        ? `protocol right now: ${count(protocol.lateNow)} of ${count(
            protocol.openMarkets,
          )} markets are late`
        : undefined,
    },
    panel: {
      ids: ["S18", "S35", "S36"],
      question: "Is anything wrong across their markets at this block?",
      formula: [
        "Each open market is late when the cash it holds is below what its rules require, read at the snapshot block.",
        now.late
          ? `${count(now.late)} of ${count(now.open)} open markets are late${
              now.past
                ? `, ${count(now.past)} of them past the grace period`
                : ", all within the grace period"
            }.`
          : "No open market is late.",
      ],
      numbers: [
        ["Open markets", count(now.open)],
        ["Late now", count(now.late)],
        [
          "Owed by markets late within grace",
          `${tokens(n("S35") ?? 0)} (face value across assets)`,
        ],
        [
          "Owed by markets past grace",
          `${tokens(n("S36") ?? 0)} (face value across assets)`,
        ],
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
      meaning: now.late
        ? "Some of this borrower's markets are short of required cash now; check which in the table."
        : "Nothing is wrong in any of this borrower's markets at this block.",
      tells: [
        {
          scope: "borrower",
          text: "Whether any of their markets needs attention today.",
        },
      ],
      doesNotTell:
        "Anything about the past: this card is a photograph, and In order, all markets is the record.",
    },
  }

  // 3.6 Completed credit cycle
  const completed = n("S30") ?? 0
  const verified = n("S33") ?? 0
  const closedAssets = new Set(
    borrower.markets
      .filter((market) => market.values.M77 === "Closed")
      .map((market) => market.values.M02),
  )
  const capital = n("S31") ?? 0
  const oneAsset =
    closedAssets.size === 1 ? String([...closedAssets][0]) : undefined
  // Capital leads the card when one asset makes it a single amount.
  const cycleValue = oneAsset
    ? `${tokens(capital)} ${oneAsset}`
    : `${count(completed)} completed`
  const cycle: RowCard = {
    key: "3.6",
    card: {
      name: "Completed credit cycle",
      help: "Markets this borrower closed after repaying everything owed: the strongest proof on the protocol, because a closure cannot happen until every lender is repaid.",
      value: completed ? cycleValue : undefined,
      word: completed ? undefined : BLANK.noneCompleted,
      sub: completed
        ? `${oneAsset ? `${count(completed)} completed · ` : ""}${count(
            verified,
          )} of ${count(completed)} verified · ${count(n("S34") ?? 0)} clean`
        : "everything still running",
      comparison: protocol
        ? `protocol: ${count(
            protocol.completedFacilities,
          )} completed facilities`
        : undefined,
    },
    panel: {
      ids: ["S31", "S30", "S32", "S33", "S34"],
      question: "Has this borrower repaid and closed a market in full?",
      formula: completed
        ? [
            `${count(
              completed,
            )} markets were closed after everything owed was repaid.`,
            `${lifeShare(
              n("S32") ?? 0,
            )} of the borrower's market-days come from those markets (S32).`,
            `${count(verified)} of ${count(
              completed,
            )} closures pass the check at their closing block: assets at least equal to debts, and not delinquent.`,
            `${count(n("S34") ?? 0)} closed with no incident open.`,
          ]
        : ["No market of this borrower has been closed yet."],
      numbers: completed
        ? [
            [
              "Capital through completed markets",
              oneAsset
                ? `${tokens(capital)} ${oneAsset}`
                : `${tokens(capital)} (face value across assets)`,
            ],
            ["Completed", count(completed)],
            ["Verified at closure", count(verified)],
            ["Clean closures", count(n("S34") ?? 0)],
          ]
        : [],
      chips: protocol
        ? [
            {
              label: "protocol",
              text: `${count(
                protocol.completedFacilities,
              )} facilities have been completed across the protocol.`,
            },
          ]
        : [],
      meaning: completed
        ? `This borrower has run ${count(
            completed,
          )} markets to the end and repaid every lender.`
        : "None of this borrower's markets has ended yet; absent evidence is not a mark against them.",
      tells: [
        {
          scope: "borrower",
          text: "Whether this borrower has already repaid lenders in full at the end of a facility.",
        },
      ],
      doesNotTell:
        "Whether they will repay a market that is running now: completion proves only the markets that ended.",
    },
  }

  // 3.8 Discipline
  const incidents = n("S12") ?? 0
  const discipline: RowCard = {
    key: "3.8",
    card: {
      name: "Discipline",
      help: "Late spells across the book: how many, how quickly they are cured and the longest.",
      value: incidents ? `${count(incidents)} incidents` : undefined,
      word: incidents ? undefined : BLANK.noIncidents,
      sub: incidents
        ? `typical cure ${hours(n("D16") ?? 0)} · longest ${days(
            n("D15") ?? 0,
          )}`
        : undefined,
      comparison: cmp.S12
        ? `median ${count(cmp.S12.median)} incidents`
        : undefined,
    },
    panel: {
      ids: ["S12", "D16", "S13", "S01", "D15"],
      question: "How do late spells across the book usually go?",
      formula: [
        `${count(incidents)} incidents across ${count(
          markets,
        )} markets, including any still open.`,
        `Typical time to cure a finished incident: ${hours(n("D16") ?? 0, 2)}.`,
        `Longest incident in any market: ${days(n("D15") ?? 0)}.`,
        `Incidents past the grace period: ${BLANK.countSoon}.`,
      ],
      numbers: [
        ["Incidents", count(incidents)],
        ["Typical cure", hours(n("D16") ?? 0)],
        ["Longest", days(n("D15") ?? 0)],
        ["Past the grace period", BLANK.countSoon],
      ],
      chips: cmp.S12
        ? [
            {
              label: "median",
              text: `Across ${count(
                cmp.S12.population,
              )} graded borrowers the median is ${count(
                cmp.S12.median,
              )} incidents.`,
            },
          ]
        : [],
      meaning: incidents
        ? `When this borrower's markets fall short, the typical incident is cured in ${hours(
            n("D16") ?? 0,
          )}.`
        : "None of this borrower's markets has ever been short of required cash.",
      tells: [
        {
          scope: "borrower",
          text: "How quickly this borrower restores the reserve when it slips.",
        },
        {
          scope: "borrower",
          text: "Whether the worst incident is far beyond the usual one.",
        },
      ],
      doesNotTell:
        "How much cash was short, or how many incidents broke the grace period (the breach count is coming soon).",
    },
  }

  // 3.10 Lender breadth
  const lenders = n("S37") ?? 0
  const breadth: RowCard = {
    key: "3.10",
    card: {
      name: "Lender breadth",
      help: "Distinct wallets that have ever held a market token of this borrower, by deposit or by transfer.",
      value: `${count(lenders)} lenders`,
      sub: "ever, across all markets",
      comparison: cmp.S37 ? `median ${count(cmp.S37.median)}` : undefined,
    },
    panel: {
      ids: ["S37"],
      question: "How many lenders have trusted this borrower?",
      formula: [
        `${count(
          lenders,
        )} distinct wallets have held a market token of this borrower, whether they deposited or received it by transfer.`,
      ],
      chips: cmp.S37
        ? [
            {
              label: "median",
              text: `Across ${count(
                cmp.S37.population,
              )} graded borrowers the median is ${count(
                cmp.S37.median,
              )} lenders.`,
            },
          ]
        : [],
      meaning: `${count(lenders)} lenders have funded this borrower over time.`,
      tells: [
        {
          scope: "borrower",
          text: "How broad this borrower's lender base has been.",
        },
      ],
      doesNotTell:
        "How much each lender holds, or whether several wallets belong to one lender.",
    },
  }

  return { rowA: [inOrder, rightNow, cycle, discipline, breadth] }
}

/** Trouble over time: late share of each market's own life, and direction. */
export function troubleOverTime(borrower: BorrowerAnalytics) {
  const rows: LateShareRow[] = borrower.markets
    .filter(
      (market) =>
        typeof market.values.H01 === "number" && Number(market.values.H01) > 0,
    )
    .map((market) => {
      const late =
        (100 * Number(market.values.H02 ?? 0)) / Number(market.values.H01)
      const past = Math.min(late, Number(market.values.M26 ?? 0))
      return {
        label: market.symbol ?? market.address.slice(0, 10),
        withinGrace: late - past,
        pastAllowance: past,
        valueLabel: `${percent(late)} of life late`,
        tooltip: `${days(Number(market.values.D17 ?? 0))} late over ${count(
          Number(market.values.M05 ?? 0),
        )} days (D17); ${lifeShare(past)} past the grace period`,
      }
    })
    .sort(
      (left, right) =>
        right.withinGrace +
        right.pastAllowance -
        (left.withinGrace + left.pastAllowance),
    )
  const { n } = reader(borrower.values)
  const lifetime = n("S05")
  const trailing = n("S27")
  return {
    concentration: rows.length ? (
      <LateShareRows rows={rows} ids={["H02", "H01", "M26", "D17"]} />
    ) : null,
    direction:
      lifetime !== undefined && trailing !== undefined ? (
        <DirectionLine
          from={lifetime}
          to={trailing}
          fromLabel={`lifetime ${score(lifetime)}`}
          toLabel={`last 90 days ${score(trailing)}`}
          ids={["S05", "S27"]}
        />
      ) : null,
  }
}
