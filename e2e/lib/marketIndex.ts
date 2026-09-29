/* eslint-disable no-restricted-syntax, no-continue, no-await-in-loop */
/**
 * Market provenance: for every market a run transacted with, where it came from (forked at the
 * fork block, created by a row of this run, or unknown) and every transaction and chain-time
 * change the run applied to it, in order.
 *
 * Derived from the run's own journal (`tests[].journal`), the fork block and the subgraph's facts
 * about the markets — never from ledger.json, KNOWN-ISSUES, COVERAGE or the manifest.
 *
 * `buildMarketIndex` is pure. `fetchMarketFacts` is the only I/O and never throws. This module
 * imports nothing from env.ts or journal.ts: render-report loads it through loadTs, which cannot
 * resolve @playwright/test, so the subgraph url and the pins are passed in.
 */
import {
  chainTimeText,
  type MarketIndexEntry,
  type MarketTx,
  type UatJournalEntry,
  type UatTest,
} from "./uatModel"
import { anchorOf } from "./uatReport"

type ParamValue = string | number | boolean | null

export type MarketFact = {
  name?: string
  symbol?: string
  /** deployedEvent.blockNumber */
  deployedBlock?: number
  /** deployedEvent.transactionHash — the ONLY key that identifies the creating tx. */
  deployedTx?: string
  parameters: Record<string, ParamValue>
}

/** lowercased market address → what the subgraph says about it. */
export type MarketFacts = Record<string, MarketFact>

const lc = (s?: string | null): string => (s ?? "").toLowerCase()

const ADDRESS = /^0x[0-9a-f]{40}$/

const stringify = (v: unknown): string => {
  try {
    return JSON.stringify(v, (_k, x) =>
      typeof x === "bigint" ? x.toString() : x,
    )
  } catch {
    return ""
  }
}

/**
 * Does this tx NAME the market? `to`, the full address in a decoded param's raw value, in the
 * recorded args, or in the calldata. Never the call text: enriched.call shortens addresses.
 */
const namesMarket = (e: UatJournalEntry, addr: string): boolean => {
  if (lc(e.to) === addr) return true
  if (e.enriched?.params?.some((p) => lc(p.raw).includes(addr))) return true
  if (e.args && lc(stringify(e.args)).includes(addr)) return true
  if (e.input && lc(e.input).replace(/^0x/, "").includes(addr.slice(2)))
    return true
  return false
}

const callOf = (e: UatJournalEntry): string => {
  if (e.enriched?.call) return e.enriched.call
  if (e.functionName)
    return `${e.functionName}(${(e.args ?? [])
      .map((a) =>
        typeof a === "string" || typeof a === "bigint" || typeof a === "number"
          ? String(a)
          : stringify(a),
      )
      .join(", ")})`
  if (e.input && e.input.length >= 10) return `selector ${e.input.slice(0, 10)}`
  return "(unknown call)"
}

/** One journal entry with its place in the run. */
type Placed = {
  e: UatJournalEntry
  t: UatTest
  /** Global journal position: tests in array order, entries in journal order. */
  pos: number
  /** The entry's block, else the last block seen earlier in the same journal. */
  sortBlock: number
}

const place = (tests: UatTest[]): Placed[] => {
  const out: Placed[] = []
  let pos = 0
  for (const t of tests) {
    let last = -1
    for (const e of t.journal ?? []) {
      const b = e.block !== undefined ? Number(e.block) : NaN
      if (Number.isFinite(b)) last = b
      if (e.kind === "tx" || e.kind === "chain-time")
        out.push({ e, t, pos, sortBlock: Number.isFinite(b) ? b : last })
      pos += 1
    }
  }
  return out
}

const toMarketTx = (p: Placed, seq: number): MarketTx => {
  const { e, t } = p
  const m: MarketTx = {
    seq,
    row: t.uatId ?? t.title,
    anchor: anchorOf(t),
    call: e.kind === "chain-time" ? chainTimeText(e) : callOf(e),
    kind: e.kind === "chain-time" ? "chain-time" : "tx",
  }
  if (e.kind !== "chain-time") {
    const during = e.enriched?.during ?? e.duringStep
    if (during) m.during = during
  }
  if (e.block !== undefined) m.block = e.block
  if (e.kind === "tx") {
    const from = e.enriched?.actor ?? e.from
    if (from) m.from = from
    if (e.status === "success" || e.status === "reverted") m.status = e.status
    if (e.hash) m.hash = e.hash
  }
  return m
}

const ORIGIN_RANK: Record<MarketIndexEntry["origin"], number> = {
  created: 0,
  forked: 1,
  unknown: 2,
}

/** created iff deployed after the fork; forked iff at/before it, or a pin (forked by construction). */
const originOf = (
  fact: MarketFact | undefined,
  pinned: boolean,
  forkBlock: number,
): MarketIndexEntry["origin"] => {
  if (fact?.deployedBlock !== undefined)
    return fact.deployedBlock > forkBlock ? "created" : "forked"
  return pinned ? "forked" : "unknown"
}

/**
 * Build the market index. `pinnedMarkets` is `pins.markets` (the caller reads it; this module
 * reads no file) — pins are forked by construction, so they classify `forked` even offline.
 */
export const buildMarketIndex = (
  tests: UatTest[],
  facts: MarketFacts,
  forkBlock: number,
  derivedAt: "run" | "render",
  pinnedMarkets: Record<string, string> = {},
): MarketIndexEntry[] => {
  const factsLc: MarketFacts = {}
  for (const [a, f] of Object.entries(facts ?? {})) factsLc[lc(a)] = f

  const pinKeys = new Map<string, string[]>()
  for (const [key, a] of Object.entries(pinnedMarkets ?? {})) {
    // The wrapper pin is an ERC-4626 token over a market, not a market.
    if (key === "wrapper" || !ADDRESS.test(lc(a))) continue
    pinKeys.set(lc(a), [...(pinKeys.get(lc(a)) ?? []), key])
  }

  const placed = place(tests)
  const txs = placed.filter((p) => p.e.kind === "tx")

  // Candidates: the subgraph's markets, the pinned markets, and any address the run's own address
  // book already called a market (a created market the current fork no longer knows).
  const candidates = new Set<string>([
    ...Object.keys(factsLc),
    ...pinKeys.keys(),
  ])
  for (const p of txs)
    if (p.e.enriched?.target?.kind === "market" && ADDRESS.test(lc(p.e.to)))
      candidates.add(lc(p.e.to))

  const ranked: { entry: MarketIndexEntry; key: [number, number | string] }[] =
    []
  for (const addr of candidates) {
    const fact = factsLc[addr]
    const creator = fact?.deployedTx
      ? txs.find((p) => lc(p.e.hash) === lc(fact.deployedTx))
      : undefined
    const naming = txs.filter((p) => p !== creator && namesMarket(p.e, addr))
    if (naming.length === 0 && !creator) continue

    const touchedTests = new Set<UatTest>(naming.map((p) => p.t))
    if (creator) touchedTests.add(creator.t)
    // A chain-time change before the market existed was not applied to it: a created market's
    // history starts at its deploy tx.
    const bornAt = creator ? creator.sortBlock : -Infinity
    const times = placed.filter(
      (p) =>
        p.e.kind === "chain-time" &&
        touchedTests.has(p.t) &&
        p.sortBlock >= bornAt,
    )
    const rest = [...naming, ...times].sort(
      (a, b) => a.sortBlock - b.sortBlock || a.pos - b.pos,
    )
    const history = creator ? [creator, ...rest] : rest

    const origin = originOf(fact, pinKeys.has(addr), forkBlock)

    const bookName = txs.find(
      (p) => lc(p.e.to) === addr && p.e.enriched?.target?.name,
    )?.e.enriched?.target.name
    const name =
      fact?.name ??
      bookName ??
      (pinKeys.has(addr)
        ? `pinned market "${pinKeys.get(addr)!.join(" / ")}"`
        : undefined)

    const entry: MarketIndexEntry = {
      address: addr,
      origin,
      txs: history.map((p, i) => toMarketTx(p, i + 1)),
      derivedAt,
    }
    if (name !== undefined) entry.name = name
    if (origin === "forked") entry.forkBlock = forkBlock
    if (origin === "created" && creator)
      entry.createdBy = {
        row: creator.t.uatId ?? creator.t.title,
        anchor: anchorOf(creator.t),
        block: creator.e.block ?? String(fact?.deployedBlock ?? ""),
        txHash: creator.e.hash ?? "",
      }
    if (fact?.parameters) entry.parameters = fact.parameters
    // Created markets first by creation block, then forked, then unknown, each by first tx `at`.
    const firstAt = history[0]?.e.at ?? ""
    ranked.push({
      entry,
      key:
        origin === "created"
          ? [0, fact?.deployedBlock ?? 0]
          : [ORIGIN_RANK[origin], firstAt],
    })
  }

  ranked.sort(({ key: [ra, a] }, { key: [rb, b] }) => {
    if (ra !== rb) return ra - rb
    if (typeof a === "number" && typeof b === "number") return a - b
    if (a === b) return 0
    return String(a) < String(b) ? -1 : 1
  })
  return ranked.map((r) => r.entry)
}

// ---------- the only I/O: the subgraph's facts about the markets ----------

type GqlMarket = Record<string, unknown> & { id: string }

/**
 * Field GROUPS, one request each: a field one subgraph version lacks (main's deployed fork
 * subgraph is v2.1.8) costs its group, not the whole map. The last group is v2.5.11-only.
 */
const FACT_GROUPS = [
  "id name symbol deployedEvent { blockNumber transactionHash } asset { address symbol }",
  "id annualInterestBips reserveRatioBips delinquencyFeeBips delinquencyGracePeriod withdrawalBatchDuration maxTotalSupply",
  "id hooks { id name kind } hooksConfig { minimumDeposit transfersDisabled depositRequiresAccess fixedTermEndTime allowClosureBeforeTerm allowTermReduction firstWithdrawalWindowStart periodDuration withdrawalWindowDuration }",
  "id marketKind commitmentFeeBips",
]

const FACTS_TIMEOUT_MS = 10_000

const queryGroup = async (
  gqlUrl: string,
  fields: string,
): Promise<GqlMarket[]> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FACTS_TIMEOUT_MS)
  try {
    const res = await fetch(gqlUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: `{ markets(first: 1000) { ${fields} } }` }),
      signal: controller.signal,
    })
    const j = (await res.json()) as {
      data?: { markets?: GqlMarket[] }
      errors?: unknown
    }
    if (j.errors || !Array.isArray(j.data?.markets)) return []
    return j.data!.markets!
  } finally {
    clearTimeout(timer)
  }
}

const scalar = (v: unknown): ParamValue | undefined => {
  if (v === null || v === undefined) return undefined
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return v
  return String(v)
}

const obj = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : undefined

/** The as-deployed parameters, one shape for every market: null where the subgraph was silent. */
const parametersOf = (
  m: Record<string, unknown>,
): Record<string, ParamValue> => {
  const p: Record<string, ParamValue> = {}
  const req = (k: string, v: unknown) => {
    p[k] = scalar(v) ?? null
  }
  const opt = (k: string, v: unknown) => {
    const s = scalar(v)
    if (s !== undefined) p[k] = s
  }
  const asset = obj(m.asset)
  const hooks = obj(m.hooks)
  const cfg = obj(m.hooksConfig) ?? {}
  req("name", m.name)
  req("symbol", m.symbol)
  req(
    "asset",
    asset
      ? [asset.symbol, asset.address].filter((x) => x != null).join(" ") || null
      : null,
  )
  opt("marketKind", m.marketKind)
  opt("commitmentFeeBips", m.commitmentFeeBips)
  req(
    "hooks",
    hooks
      ? [hooks.kind, hooks.name].filter((x) => x != null).join(" ") || null
      : null,
  )
  for (const k of [
    "annualInterestBips",
    "reserveRatioBips",
    "delinquencyFeeBips",
    "delinquencyGracePeriod",
    "withdrawalBatchDuration",
    "maxTotalSupply",
  ])
    req(k, m[k])
  for (const k of [
    "minimumDeposit",
    "transfersDisabled",
    "depositRequiresAccess",
  ])
    req(k, cfg[k])
  for (const k of [
    "fixedTermEndTime",
    "allowClosureBeforeTerm",
    "allowTermReduction",
    "periodDuration",
    "withdrawalWindowDuration",
    "firstWithdrawalWindowStart",
  ])
    opt(k, cfg[k])
  return p
}

/**
 * Read the markets' facts from the fork subgraph. Never throws: unreachable ⇒ `{}` and every
 * market the index cannot place from pins alone classifies `unknown`.
 */
export const fetchMarketFacts = async (
  gqlUrl: string,
): Promise<MarketFacts> => {
  try {
    const groups = await Promise.allSettled(
      FACT_GROUPS.map((fields) => queryGroup(gqlUrl, fields)),
    )
    const merged = new Map<string, Record<string, unknown>>()
    for (const g of groups) {
      if (g.status !== "fulfilled") continue
      for (const m of g.value) {
        if (typeof m?.id !== "string") continue
        const id = lc(m.id)
        merged.set(id, { ...(merged.get(id) ?? {}), ...m })
      }
    }
    const facts: MarketFacts = {}
    for (const [id, m] of merged) {
      const ev = obj(m.deployedEvent)
      const block = ev?.blockNumber != null ? Number(ev.blockNumber) : NaN
      const fact: MarketFact = { parameters: parametersOf(m) }
      if (typeof m.name === "string") fact.name = m.name
      if (typeof m.symbol === "string") fact.symbol = m.symbol
      if (Number.isFinite(block)) fact.deployedBlock = block
      if (typeof ev?.transactionHash === "string")
        fact.deployedTx = ev.transactionHash
      facts[id] = fact
    }
    return facts
  } catch {
    return {}
  }
}
