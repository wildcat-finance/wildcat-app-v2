// Names and copy from the product#908 spec, one to one: metric names from
// cheat sheet v4.2, card copy from the design handoff (cards.json). Edit them
// only to follow a spec change.

export const METRIC_NAMES: Record<string, string> = {
  M01: "Market name and symbol",
  M02: "Underlying asset",
  M03: "Deployed (UTC)",
  M05: "Market age",
  M06: "Capacity now",
  M07: "Total owed to lenders now",
  M08: "Assets held by the market",
  M11: "Base APR now",
  M12: "Penalty APR",
  M13: "Protocol fee share",
  M14: "Reserve ratio",
  M15: "Grace period (allowed lateness)",
  M16: "Withdrawal cycle (payout window)",
  M18: "In order, cash there",
  M20: "Delinquency episodes",
  M21: "Late within grace now",
  M22: "Mean episode duration",
  M23: "Longest episode",
  M24: "Worst incident, share of allowance",
  M25: "Grace breaches",
  M26: "Time under penalty",
  M27: "Penalty interest paid",
  M30: "Batches expired",
  M31: "Batches fully funded at expiry",
  M32: "Exits paid on time",
  M33: "Exits paid on time, by money",
  M37: "Open unpaid batches now",
  M38: "Unclaimed withdrawals",
  M39: "Realised lender APR",
  M40: "Time-weighted base APR",
  M41: "Lifetime lender interest",
  M42: "Penalty share of lender interest",
  M44: "APR changes",
  M48: "Active lenders now",
  M49: "Distinct lenders, lifetime",
  M51: "Lender retention",
  M56: "Lifetime borrowed",
  M57: "Lifetime repaid",
  M58: "Out with the borrower",
  M59: "Borrow transactions",
  M60: "Repay transactions",
  M67: "In order, trailing 90 days",
  M68: "Trend",
  M69: "Episodes under 6 hours",
  M70: "Episodes 6 to 24 hours",
  M71: "Episodes 24 to 48 hours",
  M72: "Episodes over 48 hours",
  M77: "Lifecycle status",
  M80: "Quiet window (hours)",
  M82: "Hours since last activity",
  M83: "Cured within grace",
  M84: "Days since last episode cured",
  M85: "Past grace now",
  M86: "Capacity used",
  S01: "Markets on Wildcat",
  S02: "First market deployed",
  S05: "In order, all markets",
  S06: "Worst market",
  S07: "Best market",
  S12: "Episodes, all markets",
  S13: "Grace breaches, all markets",
  S14: "Batches expired, all markets",
  S15: "Batches funded at expiry, all markets",
  S16: "Exits paid on time, all markets",
  S17: "Weakest market on exits",
  S18: "Markets late now",
  S27: "In order, all markets, trailing 90 days",
  S28: "Trend, all markets",
  S30: "Completed facilities",
  S31: "Capital through completed facilities",
  S32: "Share of record from completed facilities",
  S33: "Completions verified",
  S34: "Clean closures",
  S35: "Debt late within grace now",
  S36: "Debt past grace now",
  S37: "Distinct lenders, all markets",
  D03: "Minimum deposit",
  D05: "Grace countdown",
  D06: "Cycle status",
  D10: "Current lender concentration",
  D11: "Defaults on record",
  D15: "Longest episode, all markets",
  D16: "Typical cure time, all markets",
  D17: "Late time per market",
  D18: "Uncovered deadlines: paid late / never paid",
  D21: "Contract kept, all markets",
  H01: "Recorded life (seconds)",
  H02: "Delinquent seconds",
  H08: "Silent tail: short time inside the quiet window (seconds)",
  H09: "Penalty seconds in the quiet window",
  G4: "Market type labels",
}

/** A metric as the spec names it: "Late within grace now (M21)". */
export const metric = (id: string) => `${METRIC_NAMES[id] ?? id} (${id})`

export type CardCopy = {
  name: string
  means: string
  /** Both readers in one line, as the spec writes it: "[lender] … [borrower] …". */
  tells: string
  notTells: string
}

export const CARDS: Record<string, CardCopy> = {
  "2.1": {
    name: "In order",
    means:
      "Of all the time this market existed, the share when the required cash was there. Second line: the share it never went past the allowed lateness.",
    tells:
      "[lender] How reliably the exit cash was in place. [borrower] Whether the operating style is just-in-time funding (gap between the two lines) or rule-breaking (low second line).",
    notTells:
      "Whether anyone lost money, or whether exits were paid (card 2.3). Nothing about the present (card 2.4).",
  },
  "2.2": {
    name: "Worst incident",
    means:
      "How close to the edge it ever got, measured against this market’s own allowed lateness. Over 100 means a deadline broke at least once.",
    tells:
      "[lender] Whether the rule was ever broken and how often. [borrower] The single worst day on record.",
    notTells:
      "Whether it happened once or often (card 2.8). Nothing about exits (card 2.3) or the present (card 2.4).",
  },
  "2.3": {
    name: "Exits paid on time",
    means:
      "When lenders asked for money back, was the full amount there on the deadline, by count and by money, and where does the owed money sit.",
    tells:
      "[lender] The exit record and whether the queue is clear today. [borrower] How often repayment flow arrived in time.",
    notTells:
      "The wait within the day, and never the future. Not covered on the day is not never paid; the split is coming (D18).",
  },
  "2.4": {
    name: "Right now",
    means:
      "Is the required cash there this second, and if not, how much of the allowed lateness remains.",
    tells: "[lender] Whether to act today. [borrower] The live countdown.",
    notTells:
      "Anything about track record (cards 2.1 to 2.3). Green on a market with a bad history is a quiet day.",
  },
  "2.5": {
    name: "What it pays",
    means:
      "What lenders receive, what they actually earned over the market’s life, what the borrower pays, and how much of the yield came from trouble.",
    tells: "[lender] The price. [borrower] The all-in cost.",
    notTells:
      "Whether the price compensates for the risk; that judgment is yours after the other cards. The fee is never deducted from lenders.",
  },
  "2.6": {
    name: "How the line is used",
    means:
      "How full the deposit cap is, how much is owed, and whether the facility is worked like a revolver or a term loan.",
    tells: "[lender] Demand on the line. [borrower] Headroom.",
    notTells:
      "Anything about repayment behaviour (cards 2.1 to 2.3). Hidden for closed markets.",
  },
  "2.8": {
    name: "Incident history",
    means: "What shape the lateness took: many short blips or a few long ones.",
    tells:
      "[lender] Cure style: same-day fixer or multi-day drifter. [borrower] Whether slippage gets attended to quickly.",
    notTells:
      "The money involved in each incident. The count never headlines; the shape and the cure rate do.",
  },
  "2.9": {
    name: "Who funds it",
    means:
      "How many independent parties fund this market, and how concentrated the money is.",
    tells:
      "[lender] Who is ahead of you in an exit queue if a large holder leaves. [borrower] Breadth of trust.",
    notTells:
      "Who the lenders are, or why the others left. Exits in a working market are normal.",
  },
  "2.10": {
    name: "Terms",
    means:
      "What this market promised, in numbers. Terms set the scale for every other card.",
    tells:
      "[lender] The tolerance the borrower was given. [borrower] The rulebook.",
    notTells: "Whether the terms were honoured: that is every other card.",
  },
  "3.1": {
    name: "In order, all markets",
    means:
      "Across everything this borrower runs, weighted by how long each market has existed: was the cash there, was the contract kept, where is the floor, which way is it going, were exits paid.",
    tells:
      "[lender] The floor is the market you could be in. [borrower] The book as lenders see it.",
    notTells:
      "Which market is late today (3.4). Whether principal ever came all the way back (3.6).",
  },
  "3.4": {
    name: "Right now, all markets",
    means:
      "How many of their markets are short this second, and how much debt sits within and past the allowance.",
    tells: "[lender] Trouble next door. [borrower] What needs funding now.",
    notTells:
      "History (3.1, 3.8). Amber on the book does not mean amber on your market: check 2.4 there.",
  },
  "3.6": {
    name: "Completed credit cycle",
    means:
      "Has money come all the way back, and how much of the record is proven rather than live.",
    tells:
      "[lender] The only proof on the page that principal returned. [borrower] Settled history.",
    notTells:
      'How the live markets behave (3.1, 3.8). A running book reading "none completed yet" is neutral, never a red flag.',
  },
  "3.8": {
    name: "Discipline",
    means: "When they are short, is it just-in-time funding or distress.",
    tells:
      "[lender] Cure style across the book. [borrower] Operating discipline.",
    notTells: "The money involved, or which market (the per-market table).",
  },
  "3.10": {
    name: "Lender breadth",
    means: "How widely they are trusted.",
    tells: "[lender] Breadth of the base behind the book. [borrower] Reach.",
    notTells: "Who, and how much each holds (2.9 per market).",
  },
}

/** The three preset comparisons per page; never a free picker. */
export const CHIPS = {
  market: {
    median: "median",
    markets: "vs all markets",
    borrower: "vs this borrower",
  },
  borrower: {
    median: "median",
    borrowers: "vs all borrowers",
    range: "their range",
  },
} as const

/** Grace breaches (M25) wait for the recount (open item B2); M83 and S13 follow. */
export const BREACH_RECOUNT = "TBD: breach recount open (B2)"
