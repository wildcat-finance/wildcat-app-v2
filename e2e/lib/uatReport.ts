/* eslint-disable no-restricted-syntax, no-await-in-loop, import/no-extraneous-dependencies, no-nested-ternary, no-empty-pattern, prefer-destructuring */

/**
 * Pure renderer for the self-contained UAT report (uat-report/index.html).
 *
 * Design goal: a failed test must be readable IN AN INSTANT — the final app screenshot,
 * a plain-language "why it failed", and the state at failure are all visible without a
 * single click; the stack trace and raw JSON blobs are collapsed. Everything is inline
 * (no CDNs, no external fonts) so the file renders offline via file://.
 *
 * All asset paths inside a UatTest are relative to the uat-report/ directory.
 */

import { buildOverlay, type Overlay, type OverlayCell } from "./compare"
import {
  parseKnownIssues,
  parseCoverage,
  releaseBlockers,
  type KnownIssue,
} from "./knownIssues"
import type { Manifest } from "./manifest"
import {
  OUTCOME_ORDER,
  annotationReason,
  chainTimeText,
  countByOutcome,
  groupByPage,
  suitePageOverride,
  type MarketIndexEntry,
  type MarketType,
  type Outcome,
  type PageGroup,
  type UatJournalEntry,
  type UatRun,
  type UatSpecRequirement,
  type UatTest,
} from "./uatModel"
import { ledgerOf, signatureResultOf, verdictOf, type Verdict } from "./verdict"

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const fmtDuration = (ms: number): string => {
  if (!Number.isFinite(ms)) return "?"
  if (ms < 1_000) return `${Math.round(ms)}ms`
  const s = ms / 1_000
  if (s < 90) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s - m * 60)}s`
}

const json = (value: unknown): string =>
  JSON.stringify(
    value,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  )

/** Colorize expect-style detail lines: Expected → green, Received → red. */
const renderErrorDetail = (detail: string): string =>
  detail
    .split("\n")
    .map((line) => {
      const t = esc(line)
      if (/^\s*Expected/.test(line)) return `<span class="exp">${t}</span>`
      if (/^\s*Received/.test(line)) return `<span class="rcv">${t}</span>`
      return t
    })
    .join("\n")

const txBadge = (status?: string) =>
  `<span class="badge ${status === "success" ? "ok" : "bad"}">${esc(
    status ?? "?",
  )}</span>`

// ---------- row detail: what happened / what was verified ----------

const MAX_DEPTH = 4
/** Addresses (20 bytes) and hashes (32 bytes) — anything long enough to be unreadable inline. */
const LONG_HEX = /^0x[0-9a-fA-F]{16,}$/

const shortHex = (v: string): string => `${v.slice(0, 6)}…${v.slice(-4)}`

/** Shorten every long hex run inside a URL path so it reads as a route, not a hash. */
const shortenHexIn = (s: string): string =>
  s.replace(/0x[0-9a-fA-F]{16,}/g, (m) => shortHex(m))

/** Route part of a URL — the origin is the same for every row and says nothing. */
const routeOf = (url: string): string => {
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)?$/i.exec(url)
  return m ? m[1] ?? "/" : url
}

/**
 * Domain words that are acronyms even when a key spells them in camelCase (`utilisationApr`),
 * which the casing rule below cannot tell from an ordinary word.
 */
const ACRONYMS: ReadonlySet<string> = new Set([
  "apr",
  "apy",
  "api",
  "ui",
  "url",
  "id",
  "mla",
  "tou",
  "erc",
  "nft",
  "tvl",
  "usd",
  "usdc",
  "eth",
  "rpc",
])

/**
 * `annualInterestBips` -> "Annual interest bips"; `utilisationApr` -> "Utilisation APR".
 * Acronym runs (2+ capitals) are left alone so APR/MLA/ID keep their shape.
 */
const humanKey = (k: string): string => {
  const words = k
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) =>
      /^[A-Z0-9]{2,}$/.test(w)
        ? w
        : ACRONYMS.has(w.toLowerCase())
          ? w.toUpperCase()
          : w.toLowerCase(),
    )
  const first = words[0]
  if (first !== undefined && !/^[A-Z0-9]{2,}$/.test(first))
    words[0] = first.charAt(0).toUpperCase() + first.slice(1)
  return words.join(" ") || k
}

const groupDigits = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")

/**
 * Keys whose number is an IDENTIFIER, not a quantity — a chain id, a block, a unix timestamp.
 * Grouping those into 11,155,111 reads as a count of something and is actively misleading.
 */
const IDENTIFIER_WORDS: ReadonlySet<string> = new Set([
  "id",
  "ids",
  "block",
  "blocknumber",
  "timestamp",
  "nonce",
  "year",
  "version",
  "chainid",
])

/** True when the key's trailing word (or last two words) names an identifier, not a quantity. */
const isIdentifierKey = (key: string): boolean => {
  const words = key
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const last = words[words.length - 1]
  return (
    (last !== undefined && IDENTIFIER_WORDS.has(last)) ||
    IDENTIFIER_WORDS.has(words.slice(-2).join(""))
  )
}

/**
 * One value as the reader wants it: yes/no for booleans, shortened hex with the full value on
 * hover, thousands separators for plain counts only. A bigint-like STRING (wei, ray, a 77-digit
 * token amount) is left exactly as the test recorded it — regrouping it would invent precision.
 * The 10 000 floor keeps bips/APR values (0…10000) unseparated.
 */
const renderScalar = (v: unknown, key?: string): string => {
  if (v === null || v === undefined) return `<span class="muted">none</span>`
  if (typeof v === "boolean") return v ? "yes" : "no"
  if (typeof v === "number")
    return Number.isInteger(v) &&
      Math.abs(v) >= 10_000 &&
      !(key !== undefined && isIdentifierKey(key))
      ? esc(groupDigits(v))
      : esc(String(v))
  const s = String(v)
  if (LONG_HEX.test(s))
    return `<span class="mono" title="${esc(s)}">${esc(shortHex(s))}</span>`
  if (s === "") return `<span class="muted">empty</span>`
  return esc(s)
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const isScalar = (v: unknown): boolean => !isPlainObject(v) && !Array.isArray(v)

/** A field that explains the evidence in words leads the card, as a sentence. */
const NOTE_KEYS = ["note", "reason", "why", "summary"]

/**
 * Evidence values, recursively: scalars inline, scalar arrays as comma lists, object arrays as a
 * small table (union of keys as columns), nested objects as an indented key/value sub-list.
 * Anything past MAX_DEPTH falls back to inline JSON rather than nesting forever — and the card's
 * "raw" toggle always holds the complete object either way.
 */
const renderValue = (value: unknown, depth: number, key?: string): string => {
  if (Array.isArray(value)) {
    if (value.length === 0) return `<span class="muted">none</span>`
    if (value.every(isScalar))
      return value.map((x) => renderScalar(x, key)).join(", ")
    if (depth >= MAX_DEPTH) return `<code>${esc(json(value))}</code>`
    if (value.every(isPlainObject)) {
      const rows = value as Record<string, unknown>[]
      const cols: string[] = []
      for (const r of rows)
        for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k)
      const head = cols.map((c) => `<th>${esc(humanKey(c))}</th>`).join("")
      const body = rows
        .map(
          (r) =>
            `<tr>${cols
              .map(
                (c) =>
                  `<td>${
                    c in r
                      ? renderValue(r[c], depth + 1, c)
                      : `<span class="muted">—</span>`
                  }</td>`,
              )
              .join("")}</tr>`,
        )
        .join("\n")
      return `<div class="scroll-x"><table class="ev-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    }
    return `<ul class="ev-list">${value
      .map((x) => `<li>${renderValue(x, depth + 1)}</li>`)
      .join("")}</ul>`
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) return `<span class="muted">no data recorded</span>`
    if (depth >= MAX_DEPTH) return `<code>${esc(json(value))}</code>`
    const noteKey = NOTE_KEYS.find(
      (k) => typeof value[k] === "string" && (value[k] as string).trim() !== "",
    )
    const note = noteKey ? `<p class="ev-note">${esc(value[noteKey])}</p>` : ""
    const rows = keys
      .filter((k) => k !== noteKey)
      .map(
        (k) =>
          `<div class="kv"><dt>${esc(humanKey(k))}</dt><dd>${renderValue(
            value[k],
            depth + 1,
            k,
          )}</dd></div>`,
      )
      .join("\n")
    const list = rows ? `<dl class="ev-kv">${rows}</dl>` : ""
    return depth === 0
      ? `${note}${list}`
      : `${note}<div class="ev-nest">${list}</div>`
  }
  return renderScalar(value, key)
}

/**
 * One piece of evidence: what the test asserted, as a card. The raw JSON stays one click away so
 * an engineer never loses the exact bytes the oracle compared.
 */
const evidenceCard = (label: string, data: unknown): string => {
  const empty = `<p class="muted">no data recorded</p>`
  const body =
    data === undefined || data === null
      ? empty
      : typeof data === "string"
        ? data.trim() === ""
          ? empty
          : `<p class="ev-prose">${esc(data)}</p>`
        : isScalar(data)
          ? `<p class="ev-prose">${renderScalar(data)}</p>`
          : renderValue(data, 0) || empty
  const raw =
    data === undefined
      ? ""
      : `<details class="raw"><summary>raw</summary><pre>${esc(
          json(data),
        )}</pre></details>`
  return `<section class="ev"><h4 class="ev-head">${esc(
    label,
  )}</h4>${body}${raw}</section>`
}

/** "agreement: parameters name the APR" -> "parameters name the APR". */
const evidenceLabel = (name: string): string =>
  name.replace(/^agreement:\s*/i, "").trim() || name

/** Browser console output: counted in the harness footer, never narrated in the timeline. */
const isConsole = (e: UatJournalEntry): boolean =>
  e.kind === "data" && /^console\./.test(e.name ?? "")

/** The ledger's own journal entries: the footer shows them as the decision table. */
const isLedgerEntry = (e: UatJournalEntry): boolean =>
  e.kind === "data" &&
  (e.name === "ledger decision" || e.name === "ledger signature")

const msBetween = (a?: string, b?: string): number | undefined => {
  if (!a || !b) return undefined
  const d = Date.parse(b) - Date.parse(a)
  return Number.isFinite(d) && d >= 0 ? d : undefined
}

/** A navigation inside the timeline: the route, long hex shortened, the full URL on hover. */
const navItem = (e: UatJournalEntry): string =>
  `<li class="ev nav" title="${esc(e.url ?? "")}"><span class="mono">→ ${esc(
    shortenHexIn(routeOf(e.url ?? "")),
  )}</span></li>`

/** A transaction inside the timeline: actor, call, target, who signed it, status, block, hash. */
const txItem = (e: UatJournalEntry): string => {
  const en = e.enriched
  const status = e.status ?? en?.status
  const ok = status === "success"
  const source = en?.source ?? e.source
  const who = en?.actor ?? (e.from ? shortHex(e.from) : undefined)
  const call = en?.call ?? e.fn ?? e.functionName ?? "transaction"
  const block = e.block ?? en?.block
  const hash = e.hash ?? en?.hash
  const gas = e.gasUsed ?? en?.gasUsed
  return `<li class="ev tx${ok ? "" : " bad"}">${
    who ? `<span class="who">${esc(who)}</span> ` : ""
  }<code class="tx-call">${esc(call)}</code>${
    en?.target?.name
      ? ` <span class="muted">on</span> <span title="${esc(
          en.target.address ?? en.to ?? "",
        )}">${esc(en.target.name)}</span>`
      : ""
  }${
    source === "ui"
      ? ` <span class="badge ui">via app UI</span>`
      : source
        ? ` <span class="badge lib">by test</span>`
        : ""
  } <span class="txmeta ${ok ? "ok" : "bad"}">${esc(status ?? "?")}</span>${
    block
      ? ` <span class="mono muted"${
          gas ? ` title="gas ${esc(gas)}"` : ""
        }>block ${esc(block)}</span>`
      : ""
  }${
    hash
      ? ` <span class="mono muted hash" title="${esc(hash)}">${esc(
          hash.slice(0, 10),
        )}…</span>`
      : ""
  }</li>`
}

/** A chain-time change inside the timeline: "chain time +3,600 s → <ISO>". */
const chainTimeItem = (e: UatJournalEntry): string =>
  `<li class="ev chain-time"${
    e.block ? ` title="head ${esc(e.block)} after the mine"` : ""
  }>${esc(chainTimeText(e))}</li>`

const evidenceItem = (e: UatJournalEntry): string =>
  `<li class="ev data">${evidenceCard(
    evidenceLabel(e.name ?? "data"),
    e.data,
  )}</li>`

/**
 * A segment's items in reading order: navigations (a repeat of the same route collapsed — the
 * client router fires `framenavigated` twice often enough that "→ /admin → /admin" would read
 * like an app bug), then transactions in block order, then chain-time changes, then evidence.
 */
const itemsHtml = (items: UatJournalEntry[]): string => {
  const navs = items
    .filter((e) => e.kind === "nav")
    .filter((e, i, all) => i === 0 || e.url !== all[i - 1].url)
  const txs = items
    .filter((e) => e.kind === "tx")
    .map((e, i) => ({ e, i, b: Number(e.block ?? e.enriched?.block) }))
    .sort((x, y) =>
      Number.isFinite(x.b) && Number.isFinite(y.b) && x.b !== y.b
        ? x.b - y.b
        : x.i - y.i,
    )
    .map((x) => x.e)
  return [
    ...navs.map(navItem),
    ...txs.map(txItem),
    ...items.filter((e) => e.kind === "chain-time").map(chainTimeItem),
    ...items.filter((e) => e.kind === "data").map(evidenceItem),
  ].join("")
}

type Segment = {
  step?: UatJournalEntry
  /** 1-based checkpoint number; 0 for the arrange segment before the first checkpoint. */
  index: number
  items: UatJournalEntry[]
}

/**
 * The journal cut into the arrange segment and one segment per `step()` checkpoint. A transaction
 * belongs to the step it ran DURING (`enriched.during` / `duringStep`) — its journal position is
 * the receipt time, which can trail the step — and `during: "setup"` means arrange.
 */
const segmentsOf = (t: UatTest): { pre: Segment; steps: Segment[] } => {
  const pre: Segment = { index: 0, items: [] }
  const steps: Segment[] = []
  const byName = new Map<string, Segment>()
  const txs: { e: UatJournalEntry; fallback: Segment }[] = []
  let cur = pre
  for (const e of t.journal) {
    if (e.kind === "step") {
      cur = { step: e, index: steps.length + 1, items: [] }
      steps.push(cur)
      if (e.name && !byName.has(e.name)) byName.set(e.name, cur)
    } else if (e.kind === "tx") txs.push({ e, fallback: cur })
    else if (!isConsole(e) && !isLedgerEntry(e)) cur.items.push(e)
  }
  for (const { e, fallback } of txs) {
    const during = e.enriched?.during ?? e.duringStep
    const seg =
      during === "setup" ? pre : (during && byName.get(during)) || fallback
    seg.items.push(e)
  }
  return { pre, steps }
}

/** The 0-based checkpoint the row failed at (or right after, for `between`); -1 for none. */
const failedStepIndex = (t: UatTest, steps: Segment[]): number => {
  const f = t.failedDuring
  if (!f || t.status !== "failed") return -1
  const name = f.kind === "step" || f.kind === "between" ? f.name : undefined
  let at = name ? steps.findIndex((s) => s.step?.name === name) : -1
  if (at < 0 && f.kind === "step" && f.index !== undefined) at = f.index - 1
  return at
}

const REQ_GLYPH: Record<string, string> = {
  pass: "✓",
  fail: "✗",
  skipped: "–",
  "not-run": "–",
  none: "–",
}
const REQ_CLASS: Record<string, string> = {
  pass: "pass",
  fail: "fail",
  skipped: "skipped",
  "not-run": "skipped",
  none: "skipped",
}

/**
 * A checkpoint's requirement result when no observation names it (uat-run/2, or a step the
 * emitter skipped): every checkpoint of a passed row passed; before the failing one passed; the
 * failing one failed (or, for a `between` site, passed — the failure came after it); after it, none.
 */
const stepChipStatus = (
  t: UatTest,
  n: number,
  failAt: number,
  between: boolean,
): string => {
  if (failAt < 0) return t.status === "passed" ? "pass" : "none"
  if (n < failAt || (n === failAt && between)) return "pass"
  return n === failAt ? "fail" : "none"
}

const reqChip = (id: string, status: string, known = false): string =>
  `<span class="req ${
    known && status === "fail" ? "known" : REQ_CLASS[status] ?? "skipped"
  }" title="${esc(id)}: ${esc(status === "none" ? "not observed" : status)}">${
    REQ_GLYPH[status] ?? "–"
  } ${esc(id)}</span>`

/** One result per requirement the row declares or observed: fail > pass > skipped > none. */
const requirementResults = (t: UatTest): [string, string][] => {
  const rank: Record<string, number> = {
    fail: 4,
    pass: 3,
    skipped: 2,
    "not-run": 1,
    none: 0,
  }
  const out = new Map<string, string>()
  for (const id of t.requirements ?? []) out.set(id, "none")
  for (const o of t.observations ?? []) {
    const cur = o.requirementId ? out.get(o.requirementId) ?? "none" : ""
    if (o.requirementId && (rank[o.status] ?? 0) >= (rank[cur] ?? 0))
      out.set(o.requirementId, o.status)
  }
  return [...out.entries()]
}

/** How many times `lines[at, at+k)` repeats back to back from `at` (1 = no repeat). */
const repeatsAt = (lines: string[], at: number, k: number): number => {
  const block = lines.slice(at, at + k)
  const same = (n: number): boolean =>
    at + (n + 1) * k <= lines.length &&
    block.every((l, j) => lines[at + n * k + j] === l)
  let n = 1
  while (same(n)) n += 1
  return n
}

/** Collapse a block of 1-3 lines repeated back to back ("… repeated ×9"): MKT-10b's call log. */
const foldRepeats = (text: string): string => {
  const lines = text.split("\n")
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const at = i
    const k = [1, 2, 3].find(
      (w) =>
        at + 2 * w <= lines.length &&
        lines.slice(at, at + w).some((l) => l.trim() !== "") &&
        repeatsAt(lines, at, w) > 1,
    )
    if (k === undefined) {
      out.push(lines[i])
      i += 1
    } else {
      const n = repeatsAt(lines, at, k)
      out.push(...lines.slice(at, at + k), `  … repeated ×${n}`)
      i += n * k
    }
  }
  return out.join("\n")
}

/** page · block · chain time · clock skew — the state the app was in when the check failed. */
const renderFailureFacts = (state?: Record<string, unknown>): string => {
  if (!state) return ""
  const parts: string[] = []
  if (typeof state.url === "string")
    parts.push(
      `page <a href="${esc(state.url)}" class="mono" title="${esc(
        state.url,
      )}">${esc(shortenHexIn(routeOf(state.url)))}</a>`,
    )
  if (state.chainBlock !== undefined)
    parts.push(`block <span class="mono">${esc(state.chainBlock)}</span>`)
  const chainTs =
    typeof state.chainTimestamp === "string" ? state.chainTimestamp : undefined
  const wall = typeof state.wallClock === "string" ? state.wallClock : undefined
  if (chainTs)
    parts.push(`chain time <span class="mono">${esc(chainTs)}</span>`)
  else if (wall) parts.push(`wall clock <span class="mono">${esc(wall)}</span>`)
  if (chainTs && wall) {
    const skewMs = Date.parse(chainTs) - Date.parse(wall)
    if (Number.isFinite(skewMs) && Math.abs(skewMs) > 60_000) {
      const hours = skewMs / 3_600_000
      parts.push(
        `chain is <b>${hours > 0 ? "+" : ""}${hours.toFixed(1)} h</b> ${
          hours > 0 ? "ahead of" : "behind"
        } the wall clock`,
      )
    }
  }
  const shown = ["url", "chainBlock", "chainTimestamp", "wallClock", "error"]
  Object.entries(state)
    .filter(([k]) => !shown.includes(k))
    .forEach(([k, v]) =>
      parts.push(`${esc(k)} <span class="mono">${esc(json(v))}</span>`),
    )
  return parts.length > 0 ? `<p class="facts">${parts.join(" · ")}</p>` : ""
}

const renderFilmStrip = (t: UatTest): string => {
  if (t.stepShots.length === 0) return ""
  const frames = t.stepShots
    .map(
      (s, i) =>
        `<figure><a href="${esc(s.file)}" data-lightbox><img src="${esc(
          s.file,
        )}" loading="lazy" alt="${esc(s.name)}"></a><figcaption>${i + 1}. ${esc(
          s.name,
        )}</figcaption></figure>`,
    )
    .join("\n")
  return `<div class="filmstrip">${frames}</div>`
}

/** Seconds from test start until the browser first navigated (chain-only setup shows as white
 *  video). Exported: the reporter uses it to physically trim that lead with ffmpeg. */
export const browserIdleSeconds = (t: UatTest): number => {
  if (!t.startedAt) return 0
  const nav = t.journal.find((e) => e.kind === "nav")
  if (!nav?.at) return 0
  const off = (Date.parse(nav.at) - Date.parse(t.startedAt)) / 1000
  return Number.isFinite(off) && off > 2 ? Math.floor(off) - 1 : 0
}

const OUTCOME_CLASS: Record<Outcome, string> = {
  passed: "ok",
  flaky: "warn",
  "expected-failure": "warn",
  "unexpected-pass": "bad",
  failed: "bad",
  skipped: "skip",
  "did-not-run": "skip",
}

const outcomeBadge = (o: Outcome): string =>
  `<span class="badge ${OUTCOME_CLASS[o]}">${esc(o)}</span>`

// slugAnchor is declared BEFORE anchorOf, which calls it: `next lint --quiet` (eslint 8.57.0)
// enables no-use-before-define, and a const arrow function used above its declaration trips it.
const slugAnchor = (s: string): string =>
  s
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80)

export const anchorOf = (t: UatTest): string =>
  t.uatId ? `uat-${t.uatId}` : `row-${slugAnchor(`${t.suite} ${t.title}`)}`

/** One line under the badge: why this row is not an ordinary green. */
const rowReason = (t: UatTest, issues: KnownIssue[]): string | undefined => {
  if (t.outcome === "did-not-run")
    return t.blockedAcrossSuites
      ? `did not run — the RUN stopped at ${
          t.blockedBy ?? "an earlier failure"
        }, in another suite (a worker crash or a fatal error, not ordinary serial fallout)`
      : `did not run — the serial suite stopped at ${
          t.blockedBy ?? "an earlier failure"
        }`
  const reason = annotationReason(t.annotations)
  if (reason) return reason
  if (t.outcome === "skipped") {
    // `test.fixme("ID: …", fn)` / `test.skip("ID: …", fn)` declare the WHOLE test out — that form
    // carries no reason string, so annotationReason (which requires a description) returned
    // nothing above. Say what actually happened instead of the generic "no reason recorded",
    // and point at the KNOWN-ISSUES entry that explains it when one cites this row's id.
    const declaredNoReason = t.annotations.some(
      (a) => (a.type === "fixme" || a.type === "skip") && !a.description,
    )
    if (declaredNoReason) {
      const citing = t.uatId
        ? issues.find((i) => i.tests.includes(t.uatId as string))
        : undefined
      return `fixme declared in the spec (no reason string)${
        citing ? ` — see KNOWN-ISSUES #${citing.id} ${citing.title}` : ""
      }`
    }
    return "skipped — no reason recorded by the test"
  }
  return undefined
}

const kv = (label: string, html: string) =>
  `<div class="kv"><dt>${esc(label)}</dt><dd>${html}</dd></div>`

const lead = (s?: number): string => {
  if (s === undefined) return '<span class="muted">not measured</span>'
  const h = s / 3_600
  return `${h > 0 ? "+" : ""}${h.toFixed(1)} h`
}

const renderProvenance = (run: UatRun): string => {
  const m = run.meta
  return `<section class="prov">
<h3>What was tested</h3>
<dl class="state">
${kv(
  "App commit",
  `<span class="mono">${esc(m.appCommit)}</span>${
    m.appDirty
      ? ` <span class="badge bad">dirty: ${m.appDirtyFiles} files</span>`
      : ""
  }`,
)}
${kv(
  "Build",
  `${
    m.buildId
      ? `<span class="mono">${esc(m.buildId)}</span>`
      : `<span class="muted">not observed from the app</span>`
  } ${
    m.build
      ? `<span class="badge ${m.build === "prod" ? "ok" : "warn"}">${esc(
          m.build,
        )}</span>`
      : `<span class="muted">kind not observed from the app</span>`
  }`,
)}
${kv("SDK", `<span class="mono">${esc(m.sdk)}</span>`)}
${kv(
  "Subgraph",
  `<span class="mono">${esc(m.subgraphName)}</span> · <span class="mono">${esc(
    m.subgraphDeployment,
  )}</span>`,
)}
${kv(
  "Fork block",
  `<span class="mono">${esc(m.forkBlock)}</span>${
    m.chainBlockStart !== undefined
      ? ` · head ${esc(m.chainBlockStart)} → ${esc(m.chainBlockEnd ?? "?")}`
      : ""
  }`,
)}
${kv(
  "Pins",
  `<span class="mono">sha256:${esc(
    m.pinsSha256.slice(0, 16),
  )}</span> <span class="muted">(harness/fork/pins.json)</span>`,
)}
${kv(
  "Chain lead",
  `${lead(m.chainLeadSecondsStart)} at start → ${lead(
    m.chainLeadSecondsEnd,
  )} at end`,
)}
${kv(
  "Test mode",
  `${
    m.envApplied
      ? m.testMode
        ? "on"
        : `<span class="badge bad">off</span>`
      : `<span class="muted">not observed</span>`
  }${
    m.pollingMs
      ? ` · polling ${esc(m.pollingMs.ui)} ms UI / ${esc(
          m.pollingMs.indexed,
        )} ms indexed`
      : ` · <span class="muted">polling cadence not recorded</span>`
  }`,
)}
${kv(
  "Selection",
  `<span class="badge ${m.mode === "full" ? "ok" : "warn"}">${esc(
    m.mode,
  )}</span> <span class="mono">${esc(m.argv.join(" ") || "(no args)")}</span>${
    m.pwVideo ? ` · PW_VIDEO=${esc(m.pwVideo)}` : ""
  }`,
)}
${
  run.markets
    ? `${kv(
        "Markets",
        `${["created", "forked", "unknown"]
          .map(
            (o) =>
              `${run.markets!.filter((x) => x.origin === o).length} ${
                o === "unknown" ? "unresolved" : o
              }`,
          )
          .join(" · ")} <a href="#markets">summary</a>`,
      )}\n`
    : ""
}${kv(
  "Run",
  `${esc(run.startedAt ?? "?")} · ${fmtDuration(run.durationMs ?? 0)} · ${
    run.tests.length
  } tests${
    m.archiveDir
      ? ` · archived <span class="mono">${esc(m.archiveDir)}</span>`
      : ""
  }`,
)}
</dl>
</section>`
}

// ---------- market provenance (uat-run/3 `markets`) ----------

/** row anchor → the markets that row transacted with (a tx of its own, the creation included). */
type TouchedIndex = Map<string, MarketIndexEntry[]>

const touchedIndex = (markets?: MarketIndexEntry[]): TouchedIndex => {
  const idx: TouchedIndex = new Map()
  for (const m of markets ?? []) {
    const anchors = new Set(
      m.txs.filter((x) => x.kind === "tx").map((x) => x.anchor),
    )
    for (const a of anchors) idx.set(a, [...(idx.get(a) ?? []), m])
  }
  return idx
}

const marketLabel = (m: MarketIndexEntry): string =>
  m.name ?? `${m.address.slice(0, 6)}…${m.address.slice(-4)}`

const trimNum = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "")

/** 360 → "6 min", 86400 → "1 d". */
const humanSeconds = (s: number): string =>
  s < 60
    ? `${trimNum(s)} s`
    : s < 3_600
      ? `${trimNum(s / 60)} min`
      : s < 86_400
        ? `${trimNum(s / 3_600)} h`
        : `${trimNum(s / 86_400)} d`

/** Config keys whose values are durations in seconds (timestamps arrive as ISO already). */
const DURATION_KEYS: ReadonlySet<string> = new Set([
  "periodDuration",
  "withdrawalWindowDuration",
])

const TERM_LABEL: Record<MarketType["term"], string> = {
  "open-term": "Open term",
  "fixed-term": "Fixed term",
  "periodic-term": "Periodic term",
  unknown: "unknown",
}

/** "Fixed term · revolving" in bold; "unknown" muted when there are no facts to type it by. */
const typeLabel = (m: MarketIndexEntry): string =>
  m.type
    ? `<b>${esc(
        [TERM_LABEL[m.type.term], m.type.kind].filter(Boolean).join(" · "),
      )}</b>`
    : `<span class="muted">unknown</span>`

const configChips = (m: MarketIndexEntry): string =>
  Object.entries(m.type?.config ?? {})
    .map(
      ([k, v]) =>
        `<span class="chip"><span class="k">${esc(k)}</span> ${esc(
          DURATION_KEYS.has(k) && typeof v === "number" ? humanSeconds(v) : v,
        )}</span>`,
    )
    .join(" ")

/** A row link; `short` cuts an infra row's (no uatId) long title to 24 characters, full in `title`. */
const rowLink = (row: string, anchor: string, short = false): string =>
  short && anchor.startsWith("row-") && row.length > 24
    ? `<a href="#${esc(anchor)}" title="${esc(row)}">${esc(
        `${row.slice(0, 24).trimEnd()}…`,
      )}</a>`
    : `<a href="#${esc(anchor)}">${esc(row)}</a>`

const originText = (m: MarketIndexEntry, short = false): string =>
  m.origin === "forked"
    ? `forked at block ${esc(m.forkBlock ?? "?")}`
    : m.origin === "created"
      ? m.createdBy
        ? `created by ${rowLink(
            m.createdBy.row,
            m.createdBy.anchor,
            short,
          )} at block ${esc(m.createdBy.block)}`
        : "created after the fork, outside this run's journal"
      : "origin unknown"

/** "chain time +3,600 s → <ISO>" → "chain time +3,600 s (1 h)", the ISO kept for a title. */
const chainTimeStep = (call: string): { text: string; to?: string } => {
  const m = /^chain time ([+−-])([\d,]+) s(?: → (\S+))?/.exec(call)
  if (!m) return { text: call }
  const secs = Number(m[2].replace(/,/g, ""))
  return {
    text: `chain time ${m[1]}${m[2]} s${
      secs >= 60 ? ` (${humanSeconds(secs)})` : ""
    }`,
    to: m[3],
  }
}

const MARKET_FOOT = `<p class="muted market-foot">Type and config from the subgraph's view of the market; history from this run's journal; time travel outside a row is not journaled.</p>`

/** A row name for a list: an infra row's (no uatId) long title cut to 24 characters. */
const shortRow = (row: string, anchor: string): string =>
  anchor.startsWith("row-") && row.length > 24
    ? `${row.slice(0, 24).trimEnd()}…`
    : row

/**
 * The starting state of each market this row transacted with: the market (type, origin, config)
 * and the earlier actions that led to it — entries of rows that came before this one in run order
 * (their first entry on the market precedes this row's), up to this row's last entry. This row's
 * own entries are not repeated here: they sit in its checkpoints. One timeline node per market;
 * the earlier actions are a `<details>`, open only when the card is a failure.
 */
const renderReached = (
  t: UatTest,
  touched: TouchedIndex,
  open: boolean,
): string => {
  const anchor = anchorOf(t)
  const ms = touched.get(anchor)
  if (!ms || ms.length === 0) return ""
  return ms
    .map((m, n) => {
      const first = new Map<string, number>()
      for (const x of m.txs)
        if (!first.has(x.anchor)) first.set(x.anchor, x.seq)
      const own = m.txs.filter((x) => x.anchor === anchor)
      const mine = first.get(anchor) ?? Infinity
      const lastOwn = Math.max(...own.map((x) => x.seq))
      const prior = m.txs
        .filter(
          (x) =>
            x.anchor !== anchor &&
            (first.get(x.anchor) ?? Infinity) < mine &&
            x.seq < lastOwn,
        )
        .sort((a, b) => a.seq - b.seq)
      const items = prior.map((x) => {
        const link = rowLink(x.row, x.anchor)
        const block = x.block
          ? ` <span class="mono muted">(block ${esc(x.block)})</span>`
          : ""
        if (x.kind === "chain-time") {
          const ct = chainTimeStep(x.call)
          return `<li class="chain-time">${link}: <span${
            ct.to ? ` title="${esc(ct.to)}"` : ""
          }>${esc(ct.text)}</span>${block}</li>`
        }
        const creation =
          m.createdBy && x.hash && x.hash === m.createdBy.txHash
            ? "created the market — "
            : ""
        const reverted = x.status === "reverted" ? ` ${txBadge(x.status)}` : ""
        return `<li>${link}: ${creation}<code class="tx-call">${esc(
          x.call,
        )}</code>${reverted}${block}</li>`
      })
      const rows = [...new Map(prior.map((x) => [x.anchor, x.row])).entries()]
        .map(([a, r]) => esc(shortRow(r, a)))
        .join(", ")
      const createdHere = m.createdBy?.anchor === anchor
      const origin = createdHere
        ? `created by this row at block ${esc(m.createdBy?.block ?? "?")}`
        : originText(m)
      const history =
        prior.length > 0
          ? `<details class="prior"${open ? " open" : ""}><summary>${
              prior.length
            } earlier action${
              prior.length === 1 ? "" : "s"
            } by rows ${rows}</summary><ol class="prior-list">${items.join(
              "",
            )}</ol></details>`
          : `<p class="muted">${
              createdHere
                ? "No earlier actions — this row created it."
                : "No earlier actions on it in this run."
            }</p>`
      return `<li class="tl-node state"><div class="dot"></div><div class="tl-body"><div class="tl-kicker">starting state</div>
<p class="state-head"><a href="#market-${esc(
        m.address,
      )}" class="market-name">${esc(marketLabel(m))}</a> — ${typeLabel(
        m,
      )} · ${origin}</p>${
        m.type && Object.keys(m.type.config).length > 0
          ? `\n<p class="chips">${configChips(m)}</p>`
          : ""
      }
${history}${
        m.origin === "forked"
          ? `\n<p class="muted">state before the fork block is Sepolia's and not shown</p>`
          : ""
      }${n === ms.length - 1 ? `\n${MARKET_FOOT}` : ""}</div></li>`
    })
    .join("\n")
}

/** Header chips: one per market the row transacted with, "type · kind" then the name. */
const marketChips = (t: UatTest, touched: TouchedIndex): string =>
  (touched.get(anchorOf(t)) ?? [])
    .map(
      (m) =>
        `<span class="mchip" title="${esc(marketLabel(m))} · ${esc(
          m.address,
        )}"><b>${esc(
          m.type
            ? [TERM_LABEL[m.type.term], m.type.kind].filter(Boolean).join(" · ")
            : "unknown type",
        )}</b> ${esc(marketLabel(m))}</span>`,
    )
    .join("")

/** One summary row: the market (anchor target for the rows' sections), origin, type, config. */
const renderMarketSummaryRow = (m: MarketIndexEntry): string =>
  `<tr id="market-${esc(m.address)}"><td><span class="market-name">${esc(
    marketLabel(m),
  )}</span><div class="muted mono small">${esc(
    m.address,
  )}</div></td><td>${originText(m, true)}</td><td>${typeLabel(
    m,
  )}</td><td>${configChips(m)}</td></tr>`

/** The Markets summary: one table row per market the run transacted with. Absent/empty ⇒ nothing. */
const renderMarkets = (run: UatRun): string => {
  const markets = run.markets ?? []
  if (markets.length === 0) return ""
  const n = (o: MarketIndexEntry["origin"]) =>
    markets.filter((m) => m.origin === o).length
  return `
<section class="markets" id="markets" data-tab-pane="markets"><h2>Markets in this run</h2>
<p class="muted">${markets.length} market${
    markets.length === 1 ? "" : "s"
  } · ${n("created")} created by this run · ${n("forked")} forked · ${n(
    "unknown",
  )} unresolved. Origin from the subgraph's deploy event against the fork block; type and config from the market's hooks; each row's starting state lists the earlier transactions that led to it, from this run's journal.</p>${
    markets.some((m) => m.derivedAt === "render")
      ? `\n<p class="muted">derived at render time from the journal; created markets could not be resolved against the current fork</p>`
      : ""
  }
<div class="scroll-x"><table class="summary"><thead><tr><th>market</th><th>origin</th><th>type</th><th>config relevant to the type</th></tr></thead><tbody>${markets
    .map(renderMarketSummaryRow)
    .join("")}</tbody></table></div>
</section>`
}

const countStrip = (counts: Record<string, number>): string =>
  OUTCOME_ORDER.filter((o) => counts[o])
    .map((o) => `<b class="c-${OUTCOME_CLASS[o]}">${counts[o]} ${esc(o)}</b>`)
    .join(" · ")

/** Overlay counts mix relation names (identical, v25-only, …) and flag names (REGRESSION?, …) in
 *  one Record — see compare.ts's `bump`. Flags are what needs a decision; they lead. */
const OVERLAY_FLAG_KEYS: ReadonlySet<string> = new Set([
  "REGRESSION?",
  "MANIFEST-STALE",
  "not in main",
  "not in v2.5",
])

const renderAnswers = (
  run: UatRun,
  overlay: Overlay | null,
  otherLabel: string,
  issues: KnownIssue[],
  coverageMd?: string,
): string => {
  const counts = countByOutcome(run.tests)
  const blockers = releaseBlockers(issues)
  const untested = coverageMd ? parseCoverage(coverageMd) : []
  const decisions = issues.filter((i) => i.decisionPending)
  const blockerRows = blockers
    .map(
      (i) =>
        `<li><b>#${esc(i.id)}</b> <span class="badge bad">${esc(
          i.severity,
        )}</span> ${esc(i.title)} <span class="muted">(${esc(
          i.status,
        )}; blocks ${esc(i.blocks ?? "")})</span>${
          i.tests.length
            ? ` — ${i.tests
                .map((t) => `<a href="#uat-${esc(t)}">${esc(t)}</a>`)
                .join(", ")}`
            : ""
        }</li>`,
    )
    .join("\n")
  return `<section class="answers">
<h3>Answers</h3>
<p class="counts big">${countStrip(counts)}</p>
${
  overlay
    ? `<p><b>Against ${esc(otherLabel)}</b>: ${Object.entries(overlay.counts)
        .sort((a, b) => {
          const flagRank = (k: string) => (OVERLAY_FLAG_KEYS.has(k) ? 1 : 0)
          const rankDiff = flagRank(b[0]) - flagRank(a[0])
          return rankDiff !== 0 ? rankDiff : b[1] - a[1]
        })
        .map(([k, v]) => `${v} ${esc(k)}`)
        .join(" · ")}</p>`
    : ""
}
<p>${
    blockers.length === 0
      ? "No open release blockers recorded in KNOWN-ISSUES.md."
      : `<b>${blockers.length} release blocker(s):</b>`
  }</p>
${blockers.length ? `<ul class="blockers">${blockerRows}</ul>` : ""}
${
  decisions.length
    ? `<p class="muted">${decisions.length} entr${
        decisions.length === 1 ? "y" : "ies"
      } awaiting an owner decision: ${decisions
        .map((d) => `#${esc(d.id)}`)
        .join(", ")}.</p>`
    : ""
}
${
  untested.length
    ? `<details class="blob"><summary>${
        untested.length
      } runsheet rows have no test on this branch (COVERAGE.md)</summary>
<table class="txs"><thead><tr><th>UAT id</th><th>class</th><th>reason</th></tr></thead><tbody>
${untested
  .map(
    (r) =>
      `<tr><td class="mono">${esc(r.uatId)}</td><td>${esc(
        r.klass,
      )}</td><td>${esc(r.reason)}</td></tr>`,
  )
  .join("\n")}
</tbody></table></details>`
    : ""
}
</section>`
}

const flagHtml = (f: string) =>
  `<span class="flag ${f === "REGRESSION?" ? "bad" : "warn"}">${esc(f)}</span>`

const overlayCell = (t: UatTest, ov: Overlay | null): string => {
  if (!ov || !t.uatId) return ""
  const c = ov.byId.get(t.uatId)
  if (!c) return ""
  const badge = c.otherOutcome
    ? `<span class="badge ${OUTCOME_CLASS[c.otherOutcome]}">${esc(
        c.otherOutcome,
      )}</span>`
    : `<span class="badge none">absent</span>`
  return `<span class="other" title="${esc(
    c.relationReason ?? "",
  )}">main: ${badge}${
    c.relation ? `<span class="rel">${esc(c.relation)}</span>` : ""
  }${c.flags.map(flagHtml).join("")}</span>`
}

const renderOnlyInOther = (cells: OverlayCell[]): string =>
  cells.length === 0
    ? ""
    : `<section class="page" id="page-only-main">
<h2 class="page-head">Rows main ran that this branch does not have <span class="counts">${
        cells.length
      }</span></h2>
${cells
  .map(
    (c) =>
      `<details class="row skip" id="uat-${esc(
        c.uatId,
      )}"><summary><span class="badge none">not in v2.5</span><span class="row-title"><span class="mono id">${esc(
        c.uatId,
      )}</span> ${esc(
        c.title.replace(/^[^:]*:\s*/, ""),
      )}</span><span class="other">main: <span class="badge ${
        OUTCOME_CLASS[c.otherOutcome ?? "skipped"]
      }">${esc(c.otherOutcome ?? "?")}</span>${
        c.relation ? `<span class="rel">${esc(c.relation)}</span>` : ""
      }${c.flags
        .map(flagHtml)
        .join(
          "",
        )}</span></summary><div class="row-body"><p class="reason">${esc(
        c.relationReason ??
          "no manifest row — classify it in e2e/COMPARISON-MANIFEST.json",
      )}</p></div></details>`,
  )
  .join("\n")}
</section>`

/**
 * WHERE it failed, one sentence per failure SITE. `uat-run/2` only ever writes `step`, `arrange`
 * and `between`; `uat-run/3` adds `hook`, `fixture`, `teardown` and `unknown` (see
 * e2e/CONVENTIONS.md and `run.schema.json`), and those four have no journal position at all. So
 * the `#n` suffix is written ONLY when the site actually carries an index — a `/3` `between`
 * whose checkpoint the journal never recorded has none either, and "(#undefined)" is never a
 * thing a reader should see.
 */
const failureWhere = (t: UatTest): string => {
  const f = t.failedDuring
  if (!f) return ""
  const at = f.index !== undefined ? ` (#${f.index})` : ""
  const named = f.name ? ` (<b>${esc(f.name)}</b>)` : ""
  switch (f.kind) {
    case "step":
      return `<p class="where">Failed during checkpoint <b>${esc(
        f.name ?? "?",
      )}</b>${at}.</p>`
    case "arrange":
      return `<p class="where warn">⚠ Failed in the test's <b>setup/arrange phase</b> — before its first checkpoint. The behavior this test verifies was <b>never exercised</b>; fix the precondition, not the assertion.</p>`
    case "hook":
      return `<p class="where warn">⚠ Failed in a test hook before/after the body${named} — outside every <code>step()</code> checkpoint, so no checkpoint owns this failure. Fix the hook, not an assertion.</p>`
    case "fixture":
      return `<p class="where warn">⚠ Failed while a fixture was set up or torn down${named} — the harness around the test broke, not a checkpoint inside it.</p>`
    case "teardown":
      return `<p class="where">Failed during teardown, after the last checkpoint${named} — every checkpoint of the body had already run, so the behaviour under test was exercised.</p>`
    case "unknown":
      return `<p class="where warn">⚠ Failed outside any journalled checkpoint (site not attributable)${named} — the journal recorded no checkpoint at this position, so there is none to cite.</p>`
    case "between":
      return `<p class="where">Failed <b>after</b> checkpoint <b>${esc(
        f.name ?? "?",
      )}</b>${at}, before the next — follow-up assertions of that phase.</p>`
    default:
      return `<p class="where warn">⚠ Failed at an unrecognised site <code>${esc(
        f.kind,
      )}</code>${named}${at}.</p>`
  }
}

/** The video link, with the note on the white lead (chain-only setup before any page opened). */
const videoLink = (t: UatTest): string => {
  if (!t.video) return ""
  const trimmed = t.videoTrimmedLeadSeconds
  const idle = trimmed !== undefined ? 0 : browserIdleSeconds(t)
  const note =
    trimmed !== undefined
      ? ` <span class="muted">first ~${trimmed}s of chain-only setup trimmed — add ${trimmed}s to video timestamps when matching journal times</span>`
      : idle > 0
        ? ` <span class="muted">browser idle (white) for the first ~${idle}s; playback starts at the first page activity</span>`
        : ""
  return `<p class="vlink"><a href="${esc(t.video)}${
    idle > 0 ? `#t=${idle}` : ""
  }" target="_blank">▶ video (${fmtDuration(t.durationMs)})</a>${note}</p>`
}

/**
 * The verdict block that closes a failed row's timeline: error head, where it failed, the error
 * text with repeats folded, the app at the moment of failure, and the state line.
 */
const renderVerdictBlock = (t: UatTest): string => {
  const shot = t.failureShot
    ? `<figure class="shot-fig"><a href="${esc(
        t.failureShot,
      )}" data-lightbox><img class="shot" src="${esc(
        t.failureShot,
      )}" alt="app at failure" loading="lazy"></a><figcaption>The app at the moment of failure — the assertion read its text from this page.</figcaption></figure>`
    : t.video
      ? `<figure class="shot-fig"><video controls preload="metadata" src="${esc(
          t.video,
        )}"></video><figcaption>No failure screenshot; the video of the run.</figcaption></figure>`
      : `<div class="no-shot">No failure screenshot (page was already closed).</div>`
  const patternNote = /Expected pattern/i.test(t.errorDetail ?? "")
    ? `<p class="muted">“Expected pattern” is a regex that was <b>not found</b> on the page — that is the failure. “Received” is the page text that WAS there (whitespace-flattened by innerText).</p>`
    : ""
  const detail = t.errorDetail
    ? `<pre class="err-detail">${renderErrorDetail(
        foldRepeats(t.errorDetail),
      )}</pre>${patternNote}`
    : ""
  const full = t.errorStack ?? t.errorDetail
  const stack = full
    ? `<details class="stack"><summary>full error and stack</summary><pre>${esc(
        full,
      )}</pre></details>`
    : ""
  return `<li class="tl-node verdict bad"><div class="dot"></div><div class="tl-body"><div class="vgrid">
<div class="vtext"><div class="headline">${esc(
    t.errorHead ?? "Test failed (no error message)",
  )}</div>
${failureWhere(t)}${detail}${renderFailureFacts(
    t.failureState,
  )}${stack}${videoLink(t)}</div>
${shot}
</div></div></li>`
}

/** Agreements the journal did not position (no matching `data` entry): one node after the checkpoints. */
const looseEvidence = (t: UatTest): { label: string; data: unknown }[] => {
  const journalled = new Set(
    t.journal
      .filter((e) => e.kind === "data")
      .map((e) => `${evidenceLabel(e.name ?? "data")} ${json(e.data) ?? ""}`),
  )
  const out: { label: string; data: unknown }[] = []
  const seen = new Set<string>()
  for (const a of t.agreements) {
    const label = evidenceLabel(a.name)
    const key = `${label} ${json(a.json) ?? ""}`
    if (!journalled.has(key) && !seen.has(key)) {
      seen.add(key)
      out.push({ label, data: a.json })
    }
  }
  return out
}

const tlNode = (cls: string, dot: string, body: string): string =>
  `<li class="tl-node ${cls}"><div class="dot">${dot}</div><div class="tl-body">${body}</div></li>`

/**
 * One timeline: starting state → arrange → each checkpoint with its transactions, navigations,
 * chain-time changes and evidence inline → loose evidence → the verdict block of a failed row.
 */
const renderTimeline = (t: UatTest, starting: string): string => {
  const { pre, steps } = segmentsOf(t)
  const nodes: string[] = starting ? [starting] : []
  const preHtml = itemsHtml(pre.items)
  if (steps.length === 0) {
    if (preHtml)
      nodes.push(
        tlNode(
          "arrange",
          "",
          `<div class="tl-kicker">what the row did</div><ul class="evs">${preHtml}</ul><p class="muted">No <code>step()</code> checkpoints were recorded — the list above is the raw navigation and transaction trace.</p>`,
        ),
      )
    else if (t.outcome !== "skipped" && t.outcome !== "did-not-run")
      nodes.push(
        tlNode(
          "arrange",
          "",
          `<p class="muted">No steps were journalled for this row — it recorded no <code>step()</code> checkpoints, navigations or transactions.</p>`,
        ),
      )
  } else if (preHtml)
    nodes.push(
      tlNode(
        "arrange",
        "",
        `<div class="tl-kicker">arrange — before the first checkpoint</div><ul class="evs">${preHtml}</ul>`,
      ),
    )

  const failAt = failedStepIndex(t, steps)
  const endOfRun =
    t.startedAt && Number.isFinite(t.durationMs)
      ? new Date(Date.parse(t.startedAt) + t.durationMs).toISOString()
      : undefined
  steps.forEach((s, n) => {
    const e = s.step as UatJournalEntry
    const ms = msBetween(e.at, steps[n + 1]?.step?.at ?? endOfRun)
    const failed = n === failAt
    const between = failed && t.failedDuring?.kind === "between"
    const marker = failed
      ? between
        ? ` <span class="here warn">last checkpoint before the failure</span>`
        : ` <span class="here">failed here</span>`
      : ""
    const chips = (e.req ?? [])
      .map((id) => {
        const o = (t.observations ?? []).find(
          (x) => x.requirementId === id && x.stepIndex === s.index,
        )
        const st = o?.status ?? stepChipStatus(t, n, failAt, between)
        return reqChip(id, st, t.outcome === "expected-failure")
      })
      .join("")
    const inner = itemsHtml(s.items)
    nodes.push(
      tlNode(
        `step${failed && !between ? " failed" : ""}`,
        String(s.index),
        `<div class="step-line"><span class="step-name">${esc(
          e.name ?? "(unnamed checkpoint)",
        )}</span>${chips ? ` ${chips}` : ""}${
          ms !== undefined
            ? ` <span class="step-ms">${fmtDuration(ms)}</span>`
            : ""
        }${marker}</div>${inner ? `<ul class="evs">${inner}</ul>` : ""}`,
      ),
    )
  })

  const loose = looseEvidence(t)
  if (loose.length > 0)
    nodes.push(
      tlNode(
        "evidence",
        "",
        `<div class="tl-kicker">evidence</div>${loose
          .map((x) => evidenceCard(x.label, x.data))
          .join("\n")}`,
      ),
    )
  if (t.status === "failed") nodes.push(renderVerdictBlock(t))
  const strip = renderFilmStrip(t)
  if (strip) nodes.push(tlNode("shots", "", strip))
  return nodes.length > 0 ? `<ol class="tl">${nodes.join("\n")}</ol>` : ""
}

const ledgerTable = (t: UatTest): string => {
  const l = ledgerOf(t)
  if (!l) return ""
  const rows = (l.requirements ?? [])
    .map(
      (r) =>
        `<tr><td class="mono">${esc(r.requirementId)}</td><td>${esc(
          r.storedApplicability ?? (r.known ? "" : "unknown to the ledger"),
        )}${
          r.applicabilityStatus ? ` (${esc(r.applicabilityStatus)})` : ""
        }</td><td>${esc(r.effectiveApplicability ?? "")}</td><td>${esc(
          r.implementation ?? "",
        )}</td><td>${esc(r.coverage ?? "")}</td><td>${
          r.knownIssue
            ? esc(`${r.knownIssue.register ?? l.version}#${r.knownIssue.id}`)
            : ""
        }</td></tr>`,
    )
    .join("")
  return `<div class="scroll-x"><table class="ledger"><thead><tr><th>requirement</th><th>applicability</th><th>effective</th><th>implementation</th><th>coverage</th><th>known issue</th></tr></thead><tbody>${rows}</tbody></table></div><p>decision <b>${esc(
    l.decision,
  )}</b> on ${esc(l.version)} — ${esc(l.reason)}</p>`
}

/** The maintainer's detail, closed: suite, ledger decision, journal counts, trace, raw evidence. */
const renderHarnessFooter = (
  t: UatTest,
  v: Verdict,
  reason?: string,
): string => {
  const rows: string[] = [
    kv("Suite", esc(t.suite)),
    kv("Spec", `<span class="mono">${esc(t.file)}</span>`),
  ]
  if (reason && v.open) rows.push(kv("Annotation", esc(reason)))
  const ledger = ledgerTable(t)
  if (ledger) rows.push(kv("Ledger", ledger))
  const sig = signatureResultOf(t)
  if (sig)
    rows.push(kv("Signature check", `<span class="mono">${esc(sig)}</span>`))
  rows.push(
    kv(
      "Journal",
      `${(["step", "nav", "tx", "data", "chain-time"] as const)
        .map((k) => `${t.journal.filter((e) => e.kind === k).length} ${k}`)
        .join(" · ")}${
        t.needsAnnotation
          ? ` · <span class="c-warn">needs a requirements annotation</span>`
          : ""
      }`,
    ),
  )
  const consoles = t.journal.filter(isConsole)
  if (consoles.length > 0) {
    const errors = consoles.filter((e) => e.name === "console.error").length
    rows.push(
      kv(
        "Console",
        `<details class="raw"><summary>${errors} console error${
          errors === 1 ? "" : "s"
        }${
          consoles.length > errors
            ? ` · ${consoles.length - errors} other message${
                consoles.length - errors === 1 ? "" : "s"
              }`
            : ""
        }</summary><ul class="console">${consoles
          .map(
            (e) =>
              `<li><span class="mono">${esc(
                (e.name ?? "").replace("console.", ""),
              )}</span> ${esc(
                (typeof e.data === "string" ? e.data : json(e.data))
                  .split("\n")[0]
                  .slice(0, 240),
              )}</li>`,
          )
          .join("")}</ul></details>`,
      ),
    )
  }
  if (t.tracePath)
    rows.push(
      kv("Trace", `<code>npx playwright show-trace ${esc(t.tracePath)}</code>`),
    )
  if (t.video && t.status !== "failed") rows.push(kv("Video", videoLink(t)))
  if (t.agreements.length > 0)
    rows.push(
      kv(
        "Evidence",
        `<details class="raw"><summary>raw JSON of ${
          t.agreements.length
        } agreement${t.agreements.length === 1 ? "" : "s"}</summary><pre>${esc(
          json(
            t.agreements.map((a) => ({
              name: evidenceLabel(a.name),
              json: a.json,
            })),
          ),
        )}</pre></details>`,
      ),
    )
  return `<details class="harness"><summary>Harness details</summary><dl class="state">${rows.join(
    "",
  )}</dl></details>`
}

type CardContext = {
  overlay: Overlay | null
  issues: KnownIssue[]
  touched: TouchedIndex
}

// ---------- "What it tests": the runsheet row and the requirements, in plain English ----------

const specRow = (label: string, value?: string | null): string =>
  value ? `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>` : ""

const specTags = (r: UatSpecRequirement): string =>
  [
    r.known === false
      ? `<span class="tag unknown">not in the ledger</span>`
      : "",
    r.applicability && r.applicability !== "required"
      ? `<span class="tag ruling">${esc(r.applicability)}${
          r.applicabilityStatus ? ` · ${esc(r.applicabilityStatus)}` : ""
        }</span>`
      : "",
    r.implementation === "known-defect"
      ? `<span class="tag defect">known defect${
          r.knownIssue ? ` ${esc(r.knownIssue)}` : ""
        }</span>`
      : "",
  ].join("")

/**
 * The "What it tests" pane: the runsheet row (what the tester does, what should happen), the
 * requirements the row proves with the ledger's own words, how the test checks them (its
 * checkpoints, in order, with the requirement ids each one carries), then the spec file. Display
 * only — built from `t.spec`, which no outcome or verdict reads.
 */
const renderSpecPane = (t: UatTest): string => {
  const sp = t.spec
  const parts: string[] = []
  if (!sp)
    parts.push(
      `<p class="muted no-spec">No runsheet or ledger text for this row in this run.</p>`,
    )
  const rs = sp?.runsheet
  if (rs) {
    const head = [rs.pageTitle, rs.uatId].filter(Boolean).join(" · ")
    parts.push(
      `<h5>Runsheet — ${esc(head)}</h5><div class="rs">${
        rs.title ? `<div class="rs-title">${esc(rs.title)}</div>` : ""
      }<dl>${specRow("Preconditions", rs.preconditions)}${specRow(
        "What the tester does",
        rs.steps,
      )}${specRow("What should happen", rs.expected)}${specRow(
        "Notes",
        rs.notes,
      )}</dl></div>${
        t.uatId && rs.uatId !== t.uatId
          ? `<p class="muted small">${esc(
              t.uatId,
            )} is a further test of runsheet row ${esc(rs.uatId)}.</p>`
          : ""
      }`,
    )
  }
  if (sp) {
    const reqs = sp.requirements ?? []
    parts.push(
      `<h5>Requirements this row proves (${reqs.length})</h5>${
        sp.source === "ledger-mapping"
          ? `<p class="spec-note">These are mapped by the ledger, not declared by the test — the row carries no <code>requirements()</code> declaration yet.</p>`
          : ""
      }${
        reqs.length === 0
          ? `<p class="muted">None — ${
              sp.source === "ledger-mapping"
                ? "the ledger maps no requirement to this row on this version."
                : "the row declares no requirement."
            }</p>`
          : reqs
              .map(
                (r) =>
                  `<div class="sreq"><div class="sreq-head"><span class="mono rid">${esc(
                    r.id,
                  )}</span>${specTags(r)}</div>${
                    r.statement
                      ? `<div class="sreq-stmt">${esc(r.statement)}</div>`
                      : ""
                  }${
                    r.desired && r.desired !== r.statement
                      ? `<div class="sreq-desired">${esc(r.desired)}</div>`
                      : ""
                  }</div>`,
              )
              .join("")
      }`,
    )
  }
  const checks = t.journal.filter((e) => e.kind === "step")
  parts.push(
    `<h5>How the test checks it</h5>${
      checks.length === 0
        ? `<p class="muted">No checkpoints were journalled for this row in this run.</p>`
        : `<ol class="checks">${checks
            .map(
              (e) =>
                `<li>${esc(e.name ?? "(unnamed checkpoint)")}${
                  e.req?.length
                    ? ` <span class="rids">${e.req
                        .map((id) => `<span class="mono">${esc(id)}</span>`)
                        .join(" ")}</span>`
                    : ""
                }</li>`,
            )
            .join("")}</ol>`
    }<p class="muted small spec-file">Spec file <span class="mono">${esc(
      t.file,
    )}</span></p>`,
  )
  return `<div class="cpane tests">
<h4 class="cpane-head">What it tests</h4>
<div class="spec">${parts.join("\n")}</div>
</div>`
}

const CARD_SWITCH = `<div class="cswitch"><button type="button" class="on" data-cpane="ran">What ran</button><button type="button" data-cpane="tests">What it tests</button></div>`

/**
 * One row, one card. The header line is the whole card for passed / skipped / setup rows (closed
 * `<details>`); every other row opens with its verdict sentence and Next line, then one timeline,
 * then the closed harness footer.
 */
const renderTest = (t: UatTest, ctx: CardContext): string => {
  const v = verdictOf(t)
  const anchor = anchorOf(t)
  const reason = rowReason(t, ctx.issues)
  const reqs = requirementResults(t)
    .map(([id, st]) => reqChip(id, st, v.kind === "known-issue"))
    .join("")
  const dur =
    t.durationMs > 0
      ? `<span class="dur">${fmtDuration(t.durationMs)}</span>`
      : ""
  const title =
    t.uatId && t.title.startsWith(`${t.uatId}:`)
      ? t.title.slice(t.uatId.length + 1).trim()
      : t.title
  const teaser =
    v.open && v.headline
      ? `<div class="teaser">${esc(v.headline)}${
          v.flag
            ? ` <span class="flag ${v.flag.tone}">${esc(v.flag.text)}</span>`
            : ""
        }</div>`
      : ""
  const summary = `<summary>${outcomeBadge(t.outcome)}${
    t.uatId ? `<span class="id mono">${esc(t.uatId)}</span>` : ""
  }<span class="ttl">${esc(title)}</span><a class="speclink" href="#${esc(
    anchor,
  )}" data-spec-link>what it tests</a><span class="right">${marketChips(
    t,
    ctx.touched,
  )}${reqs}${dur}${overlayCell(t, ctx.overlay)}</span>${teaser}</summary>`
  const verdict = v.sentence
    ? `<div class="verdict"><p class="verdict-sentence">${esc(v.sentence)}</p>${
        v.next ? `<p class="verdict-next"><b>Next:</b> ${esc(v.next)}</p>` : ""
      }</div>`
    : ""
  const ran = [
    renderTimeline(t, renderReached(t, ctx.touched, v.failure)),
    renderHarnessFooter(t, v, reason),
  ]
    .filter(Boolean)
    .join("\n")
  const body = [
    !v.open && reason ? `<p class="reason">${esc(reason)}</p>` : "",
    verdict,
    CARD_SWITCH,
    `<div class="cpane ran">\n${ran}\n</div>`,
    renderSpecPane(t),
  ]
    .filter(Boolean)
    .join("\n")
  return `<details class="tcard ${v.kind}${v.open ? "" : " quiet"}${
    t.infra ? " infra" : ""
  }" id="${esc(anchor)}"${v.open ? " open" : ""}>
${summary}
<div class="tbody">
${body}
</div>
</details>`
}

/** True when every row is a closed (quiet) card: the "Needs attention only" filter hides the heading too. */
const allQuiet = (tests: UatTest[]): boolean =>
  tests.every((t) => !verdictOf(t).open)

const renderSection = (g: PageGroup, ctx: CardContext): string => {
  const quiet = allQuiet(g.suites.flatMap((s) => s.tests))
  return `<section class="page${quiet ? " quiet-only" : ""}" id="page-${
    g.page
  }" data-tab-pane="page-${g.page}">
<h2 class="page-head">${esc(g.label)} <span class="counts">${countStrip(
    g.counts,
  )}</span></h2>${
    quiet
      ? `\n<p class="quiet-note">Every row on this page passed, was skipped or is setup — nothing here needs attention.</p>`
      : ""
  }
${g.suites
  .map((s) => {
    const ov = suitePageOverride(s.suite)
    return `<h3 class="suite${allQuiet(s.tests) ? " quiet-only" : ""}">${esc(
      s.suite,
    )}${ov ? ` <span class="muted">${esc(ov.note)}</span>` : ""}</h3>\n${s.tests
      .map((t) => renderTest(t, ctx))
      .join("\n")}`
  })
  .join("\n")}
</section>`
}

// ---------- the Overview tab and the tab bar ----------

/** A row the Overview lists: a failure, an unexpected pass, or an expected failure that did not
 *  fail the documented way. Excused (matched) expected failures, passes and skips are not. */
const needsAttention = (t: UatTest): boolean =>
  t.outcome === "failed" ||
  t.outcome === "unexpected-pass" ||
  verdictOf(t).kind === "known-issue-mismatch"

const groupRows = (g: PageGroup): UatTest[] => g.suites.flatMap((s) => s.tests)

const renderTabs = (groups: PageGroup[], run: UatRun): string =>
  `<nav class="tabs" aria-label="Report sections"><a href="#home" data-tab="home">Overview</a>${groups
    .map(
      (g) =>
        `<a href="#page-${g.page}" data-tab="page-${g.page}">${esc(
          g.label,
        )} <span class="tn">${groupRows(g).length}</span>${
          groupRows(g).some(needsAttention)
            ? `<span class="tdot" title="needs attention"></span>`
            : ""
        }</a>`,
    )
    .join("")}${
    run.markets?.length
      ? `<a href="#markets" data-tab="markets">Markets <span class="tn">${run.markets.length}</span></a>`
      : ""
  }</nav>`

const renderTiles = (groups: PageGroup[], run: UatRun): string => {
  const markets = run.markets ?? []
  const tiles = groups.map(
    (g) =>
      `<a class="tile${
        groupRows(g).some(needsAttention) ? " bad" : ""
      }" href="#page-${g.page}"><span class="tile-name">${esc(
        g.label,
      )}</span><span class="tile-n">${groupRows(g).length} row${
        groupRows(g).length === 1 ? "" : "s"
      }</span><span class="tile-c">${countStrip(g.counts)}</span></a>`,
  )
  if (markets.length > 0)
    tiles.push(
      `<a class="tile markets" href="#markets"><span class="tile-name">Markets in this run</span><span class="tile-n">${
        markets.length
      } market${
        markets.length === 1 ? "" : "s"
      }</span><span class="tile-c muted">${(
        ["created", "forked", "unknown"] as const
      )
        .map(
          (o) =>
            `${markets.filter((m) => m.origin === o).length} ${
              o === "unknown" ? "unresolved" : o
            }`,
        )
        .join(" · ")}</span></a>`,
    )
  return `<h3>Runsheet pages</h3>\n<div class="tiles">${tiles.join("")}</div>`
}

const renderAttention = (groups: PageGroup[]): string => {
  const items = groups.flatMap((g) =>
    groupRows(g)
      .filter(needsAttention)
      .map((t) => {
        const v = verdictOf(t)
        const title =
          t.uatId && t.title.startsWith(`${t.uatId}:`)
            ? t.title.slice(t.uatId.length + 1).trim()
            : t.title
        const flag = v.flag
          ? `<span class="flag ${v.flag.tone}">${esc(v.flag.text)}</span>`
          : `<span class="flag bad">${esc(t.outcome)}</span>`
        return `<li><a href="#${esc(anchorOf(t))}">${
          t.uatId ? `<span class="mono id">${esc(t.uatId)}</span> ` : ""
        }${esc(title)}</a> ${flag} <span class="muted">· ${esc(
          g.label,
        )}</span>${
          v.headline ? `<div class="attn-why">${esc(v.headline)}</div>` : ""
        }</li>`
      }),
  )
  return `<h3>Needs attention</h3>\n${
    items.length === 0
      ? `<p class="muted">Nothing needs attention: no failed row, no unexpected pass and no expected failure that failed another way.</p>`
      : `<ul class="attn">${items.join("\n")}</ul>`
  }`
}

const TOOLBAR = `<div class="toolbar"><label><input type="checkbox" id="attention-only"> Needs attention only</label><button type="button" data-expand="1">Expand all</button><button type="button" data-expand="0">Collapse all</button><span class="muted">hides passed, skipped and setup rows</span></div>`

const CSS = `
:root{
  --bg:#f6f7f9; --card:#ffffff; --ink:#1c2330; --muted:#68707e; --line:#e3e6ea;
  --green:#1a7f37; --green-bg:#e6f4ea; --red:#c92a2a; --red-bg:#fdecec; --grey:#8b939e;
  --amber:#a35b00; --amber-bg:#fdf6e3; --violet:#6b3fa0; --violet-bg:#f3edfa;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 20px 80px}
h1{font-size:22px;margin:0}
h2{font-size:17px;margin:0}
h3{font-size:14px;margin:26px 0 8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
h4{font-size:12px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
a{color:#0b57d0;text-decoration:none;word-break:break-all}
a:hover{text-decoration:underline}
.mono,code,pre{font-family:var(--mono);font-size:12.5px}
pre{white-space:pre-wrap;word-break:break-word;background:#f2f3f5;border:1px solid var(--line);
  border-radius:6px;padding:10px 12px;margin:8px 0;max-height:420px;overflow:auto}
.muted{color:var(--muted)}
.scroll-x{overflow-x:auto}

/* header */
.runbar{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-bottom:26px;
  background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 20px}
.pill{font-weight:700;font-size:13px;letter-spacing:.05em;text-transform:uppercase;
  border-radius:999px;padding:4px 14px}
.pill.failed{background:var(--red-bg);color:var(--red)}
.pill.passed{background:var(--green-bg);color:var(--green)}
.pill.other{background:#eef0f2;color:var(--muted)}
.counts b{font-weight:600}
.counts .c-skip{color:var(--grey)}
.runbar .meta{color:var(--muted);font-size:13px}

/* per-test card: header line */
details.tcard{background:var(--card);border:1px solid var(--line);border-radius:8px;margin-bottom:6px}
details.tcard[open]{margin:10px 0 14px}
details.tcard.did-not-hold,details.tcard.did-not-reach,details.tcard.known-issue-mismatch,details.tcard.failed,
details.tcard.failed-in-teardown,details.tcard.failed-between,details.tcard.assertion-not-reached{border-left:4px solid var(--red)}
details.tcard.ruling-pending{border-left:4px solid var(--violet)}
details.tcard.unexpected-pass,details.tcard.known-issue,details.tcard.flaky{border-left:4px solid var(--amber)}
details.tcard.infra{border-style:dashed}
details.tcard>summary{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:7px 14px;min-height:38px;cursor:pointer;list-style:none}
details.tcard>summary::-webkit-details-marker{display:none}
details.tcard[open]>summary{border-bottom:1px solid var(--line);padding:10px 14px}
details.tcard>summary .badge{min-width:74px;text-align:center}
.id{font-weight:700;font-size:13.5px;flex:none}
.ttl{font-weight:600;flex:1 1 300px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
details.tcard[open] .ttl{white-space:normal}
details.tcard.skipped .ttl,details.tcard.did-not-run .ttl,details.tcard.infra .ttl{color:var(--muted);font-weight:500}
.right{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto}
.mchip{font-size:12px;border:1px solid var(--line);border-radius:12px;padding:0 8px;white-space:nowrap}
.mchip b{font-weight:600}
.req{font-size:11.5px;font-family:var(--mono);border-radius:4px;padding:0 5px;white-space:nowrap;background:#eef0f2;color:var(--muted)}
.req.pass{background:var(--green-bg);color:var(--green)}.req.fail{background:var(--red-bg);color:var(--red)}
.req.known{background:var(--amber-bg);color:var(--amber)}
.dur{color:var(--muted);font-size:12px;min-width:42px;text-align:right}
.teaser{flex-basis:100%;color:var(--red);font-size:13.5px;font-weight:600;padding-left:84px}
details.tcard.unexpected-pass .teaser,details.tcard.known-issue .teaser{color:var(--amber)}
details.tcard.ruling-pending .teaser{color:var(--violet)}
.flag.known{background:var(--amber-bg);color:var(--amber)}.flag.ruling{background:var(--violet-bg);color:var(--violet)}
@media (max-width:700px){.teaser{padding-left:0}.right{margin-left:0}}
.tbody{padding:4px 0 6px}
.tbody>.reason{margin:10px 18px 4px}
.verdict{margin:12px 18px 4px;padding:8px 12px;border-radius:6px;background:#f7f7f9}
details.tcard.did-not-hold .verdict,details.tcard.did-not-reach .verdict,details.tcard.known-issue-mismatch .verdict,details.tcard.failed .verdict,
details.tcard.failed-in-teardown .verdict,details.tcard.failed-between .verdict,details.tcard.assertion-not-reached .verdict{background:var(--red-bg)}
details.tcard.ruling-pending .verdict{background:var(--violet-bg)}
details.tcard.unexpected-pass .verdict,details.tcard.known-issue .verdict,details.tcard.flaky .verdict{background:var(--amber-bg)}
.verdict-sentence{margin:0;font-size:14.5px;font-weight:600}
.verdict-next{margin:3px 0 0;font-size:13px}

/* per-test card: one timeline */
ol.tl{list-style:none;margin:0;padding:12px 18px 2px}
.tl-node{position:relative;padding:0 0 12px 34px}
.tl-node::before{content:"";position:absolute;left:10px;top:4px;bottom:-4px;width:2px;background:var(--line)}
.tl-node:last-child::before{display:none}
.tl-node .dot{position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #c3c9d1;
  font-size:10px;font-weight:700;line-height:12px;text-align:center;color:var(--muted)}
.tl-node.step .dot{width:22px;height:22px;left:0;top:0;line-height:18px;font-size:11px;border-color:#9aa4b1;color:var(--ink)}
.tl-node.state .dot{border-style:dashed}
.tl-node.step.failed .dot,.tl-node.verdict .dot{border-color:var(--red);background:var(--red);color:#fff}
.tl-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:1px}
.tl-body{font-size:13.5px;min-width:0}
.state-head{margin:0 0 2px;font-size:13.5px}
.market-name{font-weight:600}
.chips{margin:2px 0 4px}
.chips .chip,table.summary .chip{display:inline-block;text-transform:none;letter-spacing:0;border:1px solid var(--line);border-radius:12px;
  padding:1px 8px;margin:2px 4px 2px 0;font-size:12px;font-weight:400;color:var(--ink);background:#fff}
.chips .chip .k,table.summary .chip .k{color:#6b7785;font-family:var(--mono)}
details.prior>summary{cursor:pointer;font-size:13px}
ol.prior-list{margin:4px 0;padding-left:24px;font-size:12.5px}
ol.prior-list li{margin:2px 0}
ol.prior-list li.chain-time{color:var(--muted);font-style:italic}
.market-foot{font-size:11.5px;margin:4px 0 0}
.step-line{padding-top:1px}
.step-name{font-weight:600}
.tl-node.step.failed .step-name{color:var(--red)}
.step-ms{color:var(--muted);font-size:11.5px;font-variant-numeric:tabular-nums}
.here{font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--red);letter-spacing:.04em}
.here.warn{color:var(--amber)}
ul.evs{list-style:none;margin:3px 0 0;padding:0}
li.ev{margin:2px 0;font-size:12.5px}
li.ev.nav{color:var(--muted)}
li.ev.tx .who{color:var(--muted)}
li.ev.tx.bad .tx-call{color:var(--red)}
li.ev.chain-time{color:#8a5a00}
code.tx-call{background:#f2f3f5;border-radius:4px;padding:0 4px;word-break:break-word}
.badge.lib{background:#eef0f2;color:var(--muted)}
.txmeta{font-size:11px;font-weight:700}.txmeta.ok{color:var(--green)}.txmeta.bad{color:var(--red)}
.hash{font-size:11px}
.vgrid{display:grid;grid-template-columns:minmax(0,5fr) minmax(260px,6fr);gap:18px;align-items:start}
@media (max-width:900px){.vgrid{grid-template-columns:1fr}}
.headline{font-size:16px;font-weight:700;color:var(--red);margin-bottom:8px;line-height:1.35}
.where{font-size:13px;margin:0 0 8px;padding:6px 10px;border-left:3px solid var(--line);background:#f7f7f9;border-radius:4px}
.where.warn{border-left-color:#e2a000;background:#fdf6e3}
.err-detail{background:#fff8f8;border-color:#f3d6d6}
.err-detail .exp{color:var(--green)} .err-detail .rcv{color:var(--red)}
.facts{font-size:12.5px;margin:6px 0}
.stack summary{cursor:pointer;color:var(--muted);font-size:12.5px}
.vlink{margin:6px 0;font-size:13px}
figure.shot-fig{margin:0}
img.shot{width:100%;border:1px solid var(--line);border-radius:8px;display:block;cursor:zoom-in}
figure.shot-fig figcaption{font-size:11.5px;color:var(--muted);margin-top:3px}
.no-shot{border:1px dashed var(--line);border-radius:8px;padding:30px;text-align:center;color:var(--muted)}
dl.state{margin:6px 0 0;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:4px 14px}
dl.state .kv{display:contents}
dl.state dt{color:var(--muted);font-size:12.5px;padding-top:1px}
dl.state dd{margin:0;font-size:13px;min-width:0;word-break:break-word}

/* per-test card: harness footer */
details.harness{margin:0 18px 8px 52px;font-size:12.5px}
details.harness>summary{cursor:pointer;color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.05em}
table.ledger{border-collapse:collapse;font-size:12px;margin:2px 0}
table.ledger th,table.ledger td{border:1px solid var(--line);padding:2px 7px;text-align:left}
table.ledger th{background:#f2f3f5;font-weight:600;color:var(--muted)}
ul.console{margin:2px 0;padding-left:16px;color:var(--muted);font-size:12px}

/* toolbar */
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;background:var(--bg);
  padding:6px 0;margin:0;font-size:13px}
.toolbar button{font:inherit;font-size:12.5px;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:2px 10px;cursor:pointer}
body.attention-only details.tcard.quiet,body.attention-only .quiet-only{display:none}

/* film strip */
.filmstrip{display:flex;gap:12px;overflow-x:auto;padding:6px 2px 10px}
.filmstrip figure{margin:0;flex:none;width:220px}
.filmstrip img{width:100%;height:130px;object-fit:cover;object-position:top;
  border:1px solid var(--line);border-radius:6px;display:block;cursor:zoom-in}
.filmstrip figcaption{font-size:12px;color:var(--muted);margin-top:4px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* markets summary */
section.markets{margin:0 0 26px}
section.markets .market-name{font-weight:600}
table.summary{border-collapse:collapse;font-size:13px}
table.summary td,table.summary th{vertical-align:top;padding:6px 8px;text-transform:none;letter-spacing:0;
  border-top:1px solid var(--line)}
table.summary td:nth-child(2){max-width:220px}
table.summary a{overflow-wrap:anywhere}
table.summary th{text-align:left;color:#6b7785;font-size:12px;font-weight:500}
.small{font-size:11px}

/* evidence: one card per agreement */
section.ev{border:1px solid var(--line);border-left:3px solid #c9d3e0;border-radius:6px;
  background:#fbfcfd;padding:8px 12px;margin:6px 0}
.ev-head{margin:0 0 6px;font-size:13px;text-transform:none;letter-spacing:0;color:var(--ink);
  font-weight:600}
.ev-note{margin:0 0 8px;font-size:13px}
.ev-prose{margin:0;font-size:13px;white-space:pre-wrap;word-break:break-word}
dl.ev-kv{margin:0;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:3px 16px}
dl.ev-kv .kv{display:contents}
dl.ev-kv dt{color:var(--muted);font-size:12.5px}
dl.ev-kv dd{margin:0;font-size:13px;min-width:0;word-break:break-word}
.ev-nest{border-left:2px solid var(--line);padding-left:10px;margin-top:2px}
ul.ev-list{margin:2px 0;padding-left:18px}
table.ev-table{border-collapse:collapse;font-size:12.5px;margin:2px 0}
table.ev-table th,table.ev-table td{border:1px solid var(--line);padding:3px 8px;
  text-align:left;vertical-align:top}
table.ev-table th{background:#f2f3f5;font-weight:600;color:var(--muted)}
details.raw{margin:6px 0 0}
details.raw summary{cursor:pointer;color:var(--muted);font-size:11.5px;
  text-transform:uppercase;letter-spacing:.05em}
.badge{font-size:11px;font-weight:700;border-radius:4px;padding:1px 7px;text-transform:uppercase}
.badge.ok{background:var(--green-bg);color:var(--green)}
.badge.bad{background:var(--red-bg);color:var(--red)}
.badge.ui{background:#e8f0fe;color:#0b57d0}

/* coverage table */
table.txs{border-collapse:collapse;font-size:13px;min-width:520px}
table.txs th,table.txs td{border:1px solid var(--line);padding:5px 10px;text-align:left;vertical-align:top}
table.txs th{background:#f2f3f5;font-weight:600}

/* blobs */
details.blob{margin:6px 0}
details.blob summary{cursor:pointer;font-family:var(--mono);font-size:13px}

/* rows only the other branch ran */
details.row{background:var(--card);border:1px solid var(--line);border-radius:8px;
  margin-bottom:8px;padding:0 14px}
details.row summary{display:flex;align-items:center;gap:10px;min-height:40px;
  cursor:pointer;list-style:none}
details.row summary::-webkit-details-marker{display:none}
.row-title{font-weight:600;flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
details.row.skip .row-title{color:var(--muted);font-weight:500}
.row-body{padding:4px 4px 14px}
video{max-width:100%;border:1px solid var(--line);border-radius:8px;background:#000}

/* lightbox */
#lightbox{position:fixed;inset:0;background:rgba(12,15,20,.88);display:none;
  align-items:center;justify-content:center;z-index:10;cursor:zoom-out;padding:30px}
#lightbox.open{display:flex}
#lightbox img{max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,.6)}
footer{margin-top:40px;color:var(--muted);font-size:12.5px}

/* header */
.prov,.answers{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 20px;margin-bottom:16px}
.counts.big b{font-size:15px;margin-right:4px}
.c-ok{color:var(--green)} .c-bad{color:var(--red)} .c-skip{color:var(--grey)} .c-warn{color:#a35b00}
.badge.warn{background:#fdf6e3;color:#a35b00} .badge.skip{background:#eef0f2;color:var(--grey)}
.badge.none{background:#eef0f2;color:var(--grey)}
ul.blockers{margin:6px 0 0;padding-left:20px} ul.blockers li{margin:3px 0}
.page-head{font-size:16px;margin:28px 0 6px;text-transform:none;letter-spacing:0;color:var(--ink)}
h3.suite{font-size:12px;margin:14px 0 6px;color:var(--muted)}
.reason{margin:4px 0 8px;padding:5px 10px;border-left:3px solid var(--line);background:#f7f7f9;border-radius:4px;font-size:13px}
.row-title .id{font-weight:700;margin-right:4px}
.other{margin-left:auto;font-size:12px;white-space:nowrap}
.rel{background:#eef0f2;border-radius:4px;padding:1px 6px;margin-left:5px;font-size:11px}
.flag{border-radius:4px;padding:1px 6px;margin-left:5px;font-size:11px;font-weight:700}
.flag.bad{background:var(--red-bg);color:var(--red)} .flag.warn{background:#fdf6e3;color:#a35b00}
h3.suite .muted{font-weight:400;text-transform:none}

/* layout: sticky tab bar, Overview, tab panes */
.topbar{position:sticky;top:0;z-index:6;background:var(--bg);border-bottom:1px solid var(--line)}
.topbar-in{max-width:1200px;margin:0 auto;padding:8px 20px 0}
nav.tabs{display:flex;flex-wrap:wrap;gap:2px}
nav.tabs a{padding:6px 12px;border:1px solid transparent;border-bottom:0;border-radius:6px 6px 0 0;color:#334;font-size:13px;word-break:normal;white-space:nowrap}
nav.tabs a:hover{background:var(--card);text-decoration:none}
nav.tabs a.on{background:var(--card);border-color:var(--line);font-weight:600}
nav.tabs .tn{color:var(--grey);font-size:11px;font-weight:400}
nav.tabs .tdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--red);margin-left:5px;vertical-align:middle}
body.js[data-tab="home"] .toolbar,body.js[data-tab="markets"] .toolbar{display:none}
body.js [data-tab-pane]:not(.active){display:none}
details.tcard,[data-tab-pane]{scroll-margin-top:130px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:8px 0 18px}
.tile{display:flex;flex-direction:column;gap:2px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--green);
  border-radius:8px;padding:10px 12px;color:inherit;word-break:normal}
.tile:hover{text-decoration:none;border-color:#c9d3e0}
.tile.bad{border-left-color:var(--red)} .tile.markets{border-left-color:var(--grey)}
.tile-name{font-weight:600} .tile-n{color:var(--muted);font-size:12px} .tile-c{font-size:12px}
ul.attn{margin:6px 0 18px;padding-left:20px} ul.attn li{margin:5px 0} ul.attn .id{font-weight:700}
.attn-why{color:var(--muted);font-size:13px}
.quiet-note{display:none;color:var(--muted)}
body.js.attention-only section.page.quiet-only.active{display:block}
body.js.attention-only section.page.quiet-only.active .quiet-note{display:block}

/* card: What ran / What it tests */
.speclink{font-size:11.5px;color:#0b57d0;white-space:nowrap}
.cswitch{display:flex;gap:4px;margin:8px 18px 0;border-bottom:1px solid var(--line)}
.cswitch button{font:inherit;font-size:12.5px;border:0;background:none;padding:5px 10px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px}
.cswitch button.on{color:var(--ink);font-weight:600;border-bottom-color:#0b57d0}
body:not(.js) .cswitch{display:none}
body.js .cpane-head{display:none}
body.js .cpane.tests{display:none}
body.js details.tcard.show-tests .cpane.tests{display:block}
body.js details.tcard.show-tests .cpane.ran{display:none}
.cpane.tests{padding:4px 18px 10px}
.spec{font-size:13.5px}
.spec h5{margin:14px 0 5px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.spec .rs{background:#f8fafc;border:1px solid var(--line);border-radius:6px;padding:8px 12px}
.spec .rs-title{font-weight:600}
.spec .rs dl{margin:2px 0 0} .spec .rs dt{font-weight:600;margin-top:6px} .spec .rs dd{margin:1px 0 0}
.spec .sreq{border-left:3px solid #c9d3e0;padding:3px 10px;margin:6px 0}
.spec .rid{font-size:11.5px;color:var(--muted)}
.spec .sreq-stmt{font-weight:600} .spec .sreq-desired{color:var(--muted)}
.spec .tag{font-size:10.5px;border-radius:3px;padding:1px 6px;margin-left:6px;background:#eef0f2;color:var(--muted)}
.spec .tag.ruling{background:var(--violet-bg);color:var(--violet)} .spec .tag.defect{background:var(--amber-bg);color:var(--amber)}
.spec .tag.unknown{background:var(--red-bg);color:var(--red)}
.spec .spec-note{font-size:12.5px;color:var(--amber);margin:2px 0 6px}
.spec ol.checks{margin:4px 0;padding-left:22px} .spec ol.checks li{margin:2px 0}
.spec .rids .mono{font-size:11px;color:var(--muted);margin-left:4px}
`

const JS = `
(function () {
  var body = document.body
  body.classList.add("js")
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn) }
  var box = document.getElementById("lightbox")
  var img = box ? box.querySelector("img") : null

  // One card's switch: "What ran" (the timeline) or "What it tests" (runsheet + requirements).
  function setPane(card, name) {
    card.classList.toggle("show-tests", name === "tests")
    each(card.querySelectorAll(".cswitch [data-cpane]"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-cpane") === name)
    })
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target : null
    if (!t) return
    var a = t.closest("[data-lightbox]")
    if (a && box) {
      ev.preventDefault()
      img.src = a.getAttribute("href")
      box.classList.add("open")
      return
    }
    if (box && (t === box || t === img)) {
      box.classList.remove("open")
      img.src = ""
      return
    }
    var sw = t.closest(".cswitch [data-cpane]")
    if (sw) {
      var card = sw.closest("details.tcard")
      if (card) setPane(card, sw.getAttribute("data-cpane"))
      return
    }
    // The header's "what it tests" link: open the card on that pane, without toggling it shut.
    var sl = t.closest("[data-spec-link]")
    if (sl) {
      ev.preventDefault()
      var c = sl.closest("details.tcard")
      if (c) { c.open = true; setPane(c, "tests") }
    }
  })
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && box) { box.classList.remove("open"); img.src = "" }
  })
  var only = document.getElementById("attention-only")
  if (only) only.addEventListener("change", function () {
    body.classList.toggle("attention-only", only.checked)
  })
  // Expand / collapse act within the tab on screen.
  each(document.querySelectorAll("[data-expand]"), function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("data-expand") === "1"
      var scope = document.querySelector("[data-tab-pane].active") || document
      each(scope.querySelectorAll("details.tcard"), function (d) { d.open = open })
    })
  })

  // Tabs. #home, #page-N and #markets select a tab; any other anchor (#uat-…, #row-…, #market-…)
  // selects the tab holding it, opens the card and scrolls to it. Unknown or malformed ⇒ Overview.
  // Without this script every pane shows in document order and the tabs are plain anchor links.
  var panes = document.querySelectorAll("[data-tab-pane]")
  function show(name) {
    each(panes, function (p) { p.classList.toggle("active", p.getAttribute("data-tab-pane") === name) })
    each(document.querySelectorAll("nav.tabs [data-tab]"), function (a) {
      a.classList.toggle("on", a.getAttribute("data-tab") === name)
    })
    body.setAttribute("data-tab", name)
  }
  function route() {
    var id = ""
    try { id = decodeURIComponent(location.hash.slice(1)) } catch (e) { id = "" }
    var el = id ? document.getElementById(id) : null
    var pane = el ? (el.hasAttribute("data-tab-pane") ? el : el.closest("[data-tab-pane]")) : null
    if (!pane) { show("home"); return }
    show(pane.getAttribute("data-tab-pane"))
    if (el === pane) { if (window.pageYOffset) window.scrollTo(0, 0); return }
    if (el.tagName === "DETAILS") el.open = true
    if (el.scrollIntoView) el.scrollIntoView({ block: "start" })
  }
  window.addEventListener("hashchange", route)
  route()
})()
`

export type RenderOptions = {
  other?: UatRun | null
  otherLabel?: string
  manifest?: Manifest | null
  knownIssuesMd?: string
  coverageMd?: string
}

export const renderUatReport = (
  run: UatRun,
  opts: RenderOptions = {},
): string => {
  const overlay =
    opts.other && opts.other.tests?.length
      ? buildOverlay(run, opts.other, opts.manifest ?? null)
      : null
  const issues = opts.knownIssuesMd ? parseKnownIssues(opts.knownIssuesMd) : []
  const groups = groupByPage(run.tests)
  const ctx: CardContext = {
    overlay,
    issues,
    touched: touchedIndex(run.markets),
  }
  const pillClass =
    run.status === "passed"
      ? "passed"
      : run.status === "failed"
        ? "failed"
        : "other"
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wildcat UAT report — ${esc(run.status)}</title>
<style>${CSS}</style>
</head>
<body>
<header class="topbar"><div class="topbar-in">${renderTabs(groups, run)}
${TOOLBAR}</div></header>
<main>
<section class="overview" id="home" data-tab-pane="home">
<div class="runbar"><span class="pill ${pillClass}">${esc(
    run.status,
  )}</span><span class="counts">${countStrip(
    countByOutcome(run.tests),
  )}</span></div>
${renderAnswers(
  run,
  overlay,
  opts.otherLabel ?? "main",
  issues,
  opts.coverageMd,
)}
${renderTiles(groups, run)}
${renderAttention(groups)}
${renderProvenance(run)}
${overlay ? renderOnlyInOther(overlay.onlyInOther) : ""}
</section>
${groups.map((g) => renderSection(g, ctx)).join("\n")}
${renderMarkets(run)}
<footer>
Self-contained report — safe to open via file://. Traces need <code>npx playwright show-trace</code>.
Re-render an archived run with <code>node e2e/tools/render-report.mjs --run uat-runs/&lt;stamp&gt;</code>.
</footer>
</main>
<div id="lightbox"><img alt=""></div>
<script>${JS}</script>
</body>
</html>
`
}
