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
  countByOutcome,
  groupByPage,
  suitePageOverride,
  type Outcome,
  type PageGroup,
  type UatJournalEntry,
  type UatRun,
  type UatTest,
} from "./uatModel"

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

const uiBadge = (source?: string) =>
  source === "ui" ? ` <span class="badge ui">via app UI</span>` : ""

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

/**
 * Every oracle comparison the row recorded: the `agreement:` attachments, plus journal `data`
 * entries (console errors, page errors, ad-hoc oracles) that are not already an agreement. Keyed
 * on label AND content so a genuine second reading under the same label still shows.
 */
const evidenceItems = (t: UatTest): { label: string; data: unknown }[] => {
  const out: { label: string; data: unknown }[] = []
  const seen = new Set<string>()
  const add = (label: string, data: unknown) => {
    const key = `${label} ${json(data) ?? "undefined"}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ label, data })
  }
  for (const a of t.agreements) add(evidenceLabel(a.name), a.json)
  for (const e of t.journal)
    if (e.kind === "data") add(evidenceLabel(e.name ?? "data"), e.data)
  return out
}

const renderWhatWasVerified = (t: UatTest): string => {
  const items = evidenceItems(t)
  if (items.length === 0) return ""
  return `<h3>What was verified</h3>\n${items
    .map((i) => evidenceCard(i.label, i.data))
    .join("\n")}`
}

/** Inline note for a navigation that happened inside a step. */
const navNote = (e: UatJournalEntry): string =>
  `<span class="note nav" title="${esc(e.url ?? "")}">→ ${esc(
    shortenHexIn(routeOf(e.url ?? "")),
  )}</span>`

/** Inline note for a transaction that happened inside a step. */
const txNote = (e: UatJournalEntry): string => {
  const fn = e.enriched?.fn ?? e.functionName ?? e.fn
  const parts = [
    `tx ${fn ?? "transaction"}`,
    e.status ?? "?",
    e.block ? `block ${e.block}` : "",
  ].filter(Boolean)
  return `<span class="note tx${
    e.status === "reverted" ? " bad" : ""
  }" title="${esc(e.hash ?? "")}">${esc(parts.join(" · "))}</span>`
}

/**
 * The nav/tx notes for a span, with consecutive duplicates collapsed: a client-side router fires
 * `framenavigated` twice for the same route often enough that "-> /admin -> /admin" would
 * otherwise read like a bug in the app rather than noise in the recorder.
 */
const noteList = (entries: UatJournalEntry[]): string[] =>
  entries
    .filter((e) => e.kind === "nav" || e.kind === "tx")
    .map((e) => (e.kind === "nav" ? navNote(e) : txNote(e)))
    .filter((note, i, all) => note !== all[i - 1])

const stepNotes = (entries: UatJournalEntry[]): string => {
  const notes = noteList(entries)
  return notes.length > 0 ? `<span class="notes">${notes.join(" ")}</span>` : ""
}

const msBetween = (a?: string, b?: string): number | undefined => {
  if (!a || !b) return undefined
  const d = Date.parse(b) - Date.parse(a)
  return Number.isFinite(d) && d >= 0 ? d : undefined
}

/**
 * The numbered narrative: every `step()` checkpoint as a sentence, with the navigations and
 * transactions that happened inside it, and the checkpoint the row failed at called out.
 */
const renderWhatHappened = (t: UatTest): string => {
  const head = `<h3>What happened</h3>`
  const entries = t.journal
  const stepIdx = entries.flatMap((e, i) => (e.kind === "step" ? [i] : []))
  if (stepIdx.length === 0) {
    const loose = noteList(entries)
    if (loose.length === 0)
      return `${head}<p class="muted">No steps were journalled for this row — it recorded no <code>step()</code> checkpoints, navigations or transactions.</p>`
    return `${head}<ol class="steps">${loose
      .map(
        (note) =>
          `<li class="step"><span class="step-what">${note}</span></li>`,
      )
      .join(
        "\n",
      )}</ol><p class="muted">No <code>step()</code> checkpoints were recorded — the list above is the raw navigation and transaction trace.</p>`
  }

  const f = t.failedDuring
  const failName =
    f && (f.kind === "step" || f.kind === "between") ? f.name : undefined
  let failAt = failName
    ? stepIdx.findIndex((i) => entries[i].name === failName)
    : -1
  if (failAt < 0 && f?.kind === "step" && f.index !== undefined)
    failAt = f.index - 1

  const endOfRun =
    t.startedAt && Number.isFinite(t.durationMs)
      ? new Date(Date.parse(t.startedAt) + t.durationMs).toISOString()
      : undefined

  const preamble = noteList(entries.slice(0, stepIdx[0]))
  const lead =
    preamble.length > 0
      ? `<p class="pre-steps"><b>Before the first checkpoint:</b> ${preamble.join(
          " ",
        )}</p>`
      : ""

  const items = stepIdx
    .map((start, n) => {
      const e = entries[start]
      const next = stepIdx[n + 1]
      const inside = entries.slice(start + 1, next ?? entries.length)
      const ms = msBetween(
        e.at,
        next !== undefined ? entries[next].at : endOfRun,
      )
      const failed = n === failAt
      const marker = failed
        ? f?.kind === "between"
          ? `<span class="badge warn">last checkpoint before the failure</span>`
          : `<span class="badge bad">failed here</span>`
        : ""
      return `<li class="step${failed ? " step-failed" : ""}">
<span class="step-what">${esc(e.name ?? "(unnamed checkpoint)")}</span>${
        ms !== undefined
          ? ` <span class="step-ms">${fmtDuration(ms)}</span>`
          : ""
      } ${marker}
${stepNotes(inside)}</li>`
    })
    .join("\n")
  return `${head}${lead}<ol class="steps">${items}</ol>`
}

const renderTxTable = (entries: UatJournalEntry[]): string => {
  const txs = entries.filter((e) => e.kind === "tx")
  if (txs.length === 0) return ""
  // Enriched layout: # | during | actor | target | call | status | block | gas (hash expandable).
  // Without enrichment (decoder offline) fall back to the raw hash table.
  if (!txs.some((e) => e.enriched)) {
    const rows = txs
      .map(
        (tx, i) =>
          `<tr><td>${i + 1}</td><td class="mono">${esc(
            tx.hash,
          )}</td><td>${txBadge(tx.status)}</td><td class="mono">${esc(
            tx.block,
          )}</td><td class="mono">${esc(tx.gasUsed ?? "")}</td></tr>`,
      )
      .join("\n")
    return `<h3>Transactions</h3>
<div class="scroll-x"><table class="txs">
<thead><tr><th>#</th><th>hash</th><th>status</th><th>block</th><th>gas</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>`
  }
  const rows = txs
    .map((tx, i) => {
      const en = tx.enriched
      const target = en
        ? `<div class="tx-target">${esc(en.target.name)}${
            en.target.kind
              ? ` <span class="chip">${esc(en.target.kind)}</span>`
              : ""
          }${
            en.to
              ? `<div class="mono sub" title="${esc(en.to)}">${esc(
                  `${en.to.slice(0, 10)}…${en.to.slice(-6)}`,
                )}</div>`
              : ""
          }</div>`
        : `<span class="mono">${esc(tx.to ?? "?")}</span>`
      const call = en
        ? `<code class="tx-call">${esc(en.call)}</code>${uiBadge(
            en.source,
          )}<details class="tx-hash"><summary>hash</summary><span class="mono">${esc(
            tx.hash,
          )}</span></details>`
        : `<span class="mono">${esc(tx.hash)}</span>`
      return `<tr><td>${i + 1}</td><td class="tx-during">${esc(
        en?.during ?? "",
      )}</td><td>${esc(
        en?.actor ?? tx.from ?? "?",
      )}</td><td>${target}</td><td>${call}</td><td>${txBadge(
        tx.status,
      )}</td><td class="mono">${esc(tx.block)}</td><td class="mono">${esc(
        tx.gasUsed ?? "",
      )}</td></tr>`
    })
    .join("\n")
  return `<h3>Transactions</h3>
<div class="scroll-x"><table class="txs">
<thead><tr><th>#</th><th>during</th><th>actor</th><th>target</th><th>call</th><th>status</th><th>block</th><th>gas</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>`
}

const renderFailureState = (state?: Record<string, unknown>): string => {
  if (!state) return ""
  const rows: string[] = []
  const add = (label: string, html: string) =>
    rows.push(`<div class="kv"><dt>${label}</dt><dd>${html}</dd></div>`)
  if (state.url)
    add("URL", `<a href="${esc(state.url)}" class="mono">${esc(state.url)}</a>`)
  if (state.chainBlock !== undefined)
    add("Chain block", `<span class="mono">${esc(state.chainBlock)}</span>`)
  const chainTs =
    typeof state.chainTimestamp === "string" ? state.chainTimestamp : undefined
  const wall = typeof state.wallClock === "string" ? state.wallClock : undefined
  if (chainTs) add("Chain time", `<span class="mono">${esc(chainTs)}</span>`)
  if (wall) add("Wall clock", `<span class="mono">${esc(wall)}</span>`)
  if (chainTs && wall) {
    const skewMs = Date.parse(chainTs) - Date.parse(wall)
    if (Number.isFinite(skewMs) && Math.abs(skewMs) > 60_000) {
      const hours = skewMs / 3_600_000
      add(
        "Clock skew",
        `chain is <b>${hours > 0 ? "+" : ""}${hours.toFixed(
          1,
        )}h</b> vs wall clock (time-travelled fork)`,
      )
    }
  }
  const shown = ["url", "chainBlock", "chainTimestamp", "wallClock", "error"]
  Object.entries(state)
    .filter(([k]) => !shown.includes(k))
    .forEach(([k, v]) =>
      add(esc(k), `<span class="mono">${esc(json(v))}</span>`),
    )
  if (rows.length === 0) return ""
  return `<h4>State at failure</h4><dl class="state">${rows.join("\n")}</dl>`
}

const renderFilmStrip = (t: UatTest): string => {
  if (t.stepShots.length === 0)
    // Do not tell the reader the row ran without checkpoints when the narrative above just
    // listed them — that is a different (and fixable) gap: the shots never reached the report.
    return t.journal.some((e) => e.kind === "step")
      ? `<p class="muted">No step screenshots reached the report for this row — the checkpoints above did run. The video below shows the whole run.</p>`
      : `<p class="muted">No step screenshots for this test — the failing section ran without <code>step()</code> checkpoints. The video below shows the whole run.</p>`
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

const stepChain = (t: UatTest): string =>
  t.journal
    .filter((e) => e.kind === "step")
    .map((e) => e.name)
    .join(" → ")

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

const anchorOf = (t: UatTest): string =>
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
${kv(
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

const renderFailedCard = (
  t: UatTest,
  anchor: string,
  overlay: Overlay | null,
  issues: KnownIssue[],
): string => {
  const shot = t.failureShot
    ? `<figure class="hero-fig"><a href="${esc(
        t.failureShot,
      )}" data-lightbox><img class="hero-shot" src="${esc(
        t.failureShot,
      )}" alt="app at failure"></a><figcaption>Final app state at the moment of failure — the assertion read its text from this page.</figcaption></figure>`
    : `<div class="no-shot">No failure screenshot (page was already closed).</div>`
  const where = (() => {
    const f = t.failedDuring
    if (!f) return ""
    if (f.kind === "step")
      return `<p class="where">Failed during checkpoint <b>${esc(
        f.name ?? "?",
      )}</b> (#${f.index}).</p>`
    if (f.kind === "arrange")
      return `<p class="where warn">⚠ Failed in the test's <b>setup/arrange phase</b> — before its first checkpoint. The behavior this test verifies was <b>never exercised</b>; fix the precondition, not the assertion.</p>`
    return `<p class="where">Failed <b>after</b> checkpoint <b>${esc(
      f.name ?? "?",
    )}</b> (#${
      f.index
    }), before the next — follow-up assertions of that phase.</p>`
  })()
  const patternNote = /Expected pattern/i.test(t.errorDetail ?? "")
    ? `<p class="muted">“Expected pattern” is a regex that was <b>not found</b> on the page — that is the failure. “Received” is the page text that WAS there (whitespace-flattened by innerText).</p>`
    : ""
  const detail = t.errorDetail
    ? `<pre class="err-detail">${renderErrorDetail(
        t.errorDetail,
      )}</pre>${patternNote}`
    : ""
  const stack = t.errorStack
    ? `<details class="stack"><summary>Stack trace</summary><pre>${esc(
        t.errorStack,
      )}</pre></details>`
    : ""
  const trimmed = t.videoTrimmedLeadSeconds
  const idle = trimmed !== undefined ? 0 : browserIdleSeconds(t)
  const idleNote =
    trimmed !== undefined
      ? `<p class="muted">First ~${trimmed}s of chain-only setup (browser idle, white screen) trimmed from this video — add ${trimmed}s to video timestamps when matching journal times.</p>`
      : idle > 0
        ? `<p class="muted">Browser idle (white) for the first ~${idle}s — chain-only setup before any page was opened. Playback starts at first page activity; drag back for the full run.</p>`
        : ""
  const video = t.video
    ? `<details class="blob" open><summary>▶ video (${fmtDuration(
        t.durationMs,
      )})</summary>${idleNote}<video controls preload="metadata" width="800"><source src="${esc(
        t.video,
      )}${
        idle > 0 ? `#t=${idle}` : ""
      }" type="video/webm">Your browser cannot play WebM video.</video></details>`
    : ""
  const trace = t.tracePath
    ? `<p class="muted">Full trace: <code>npx playwright show-trace ${esc(
        t.tracePath,
      )}</code></p>`
    : ""
  return `<article class="card failed" id="${esc(anchor)}">
<header class="card-head">
  ${outcomeBadge(t.outcome)}
  <h2>${esc(t.title)}</h2>
  <span class="meta">${esc(t.suite)} · ${fmtDuration(t.durationMs)}</span>
  ${overlayCell(t, overlay)}
</header>
${
  rowReason(t, issues)
    ? `<p class="reason">${esc(rowReason(t, issues))}</p>`
    : ""
}
<div class="hero">
  <div class="hero-left">${shot}</div>
  <div class="hero-right">
    <div class="headline">${esc(
      t.errorHead ?? "Test failed (no error message)",
    )}</div>
    ${where}
    ${detail}
    ${renderFailureState(t.failureState)}
    ${stack}
  </div>
</div>
${renderWhatHappened(t)}
${renderWhatWasVerified(t)}
${renderTxTable(t.journal)}
<h3>Artefacts</h3>
${renderFilmStrip(t)}
${video}
${trace}
</article>`
}

/**
 * A `test.fail()` row that PASSED. There is no failure media to show — by construction: the
 * reporter materialises screenshots and error text only for results that actually failed. So this
 * card says what the row MEANS and what to do about it, and shows the evidence that does exist
 * (the journal, the transactions, the agreements).
 */
const renderUnexpectedPassCard = (
  t: UatTest,
  anchor: string,
  overlay: Overlay | null,
): string => {
  const annotated = annotationReason(t.annotations)
  return `<article class="card failed" id="${esc(anchor)}">
<header class="card-head">
  ${outcomeBadge(t.outcome)}
  <h2>${esc(t.title)}</h2>
  <span class="meta">${esc(t.suite)} · ${fmtDuration(t.durationMs)}</span>
  ${overlayCell(t, overlay)}
</header>
<div class="unexpected">
  <p><b>This row is annotated <code>test.fail()</code>${
    annotated ? ` — “${esc(annotated)}”` : ""
  } — and it PASSED.</b></p>
  <p>One of two things is true, and the board cannot tell them apart: the documented defect is
  fixed, or the test no longer exercises it. Resolve it before the report is shown to anyone —
  confirm the behaviour by hand, then either close the KNOWN-ISSUES entry and drop the
  <code>test.fail()</code>, or fix the test so it exercises the defect again.</p>
  <p class="muted">No failure screenshot or error text exists for this row, and that is expected:
  the reporter captures failure media only for results that actually failed.</p>
</div>
${renderWhatHappened(t)}
${renderWhatWasVerified(t)}
${renderTxTable(t.journal)}
${
  t.video
    ? `<details class="blob"><summary>▶ video (${fmtDuration(
        t.durationMs,
      )})</summary><video controls preload="none" src="${esc(
        t.video,
      )}"></video></details>`
    : ""
}
</article>`
}

const renderQuietRow = (
  t: UatTest,
  overlay: Overlay | null,
  issues: KnownIssue[],
): string => {
  const reason = rowReason(t, issues)
  const chain = stepChain(t)
  const video = t.video
    ? `<details class="blob"><summary>▶ video (${fmtDuration(
        t.durationMs,
      )})</summary><video controls preload="none" src="${esc(
        t.video,
      )}"></video></details>`
    : ""
  // stepShots on a green row are reachable but effectively dead today: the reporter materialises
  // them only for results that actually failed (see summaryReporter's `failed` guard), and failed
  // / expected-failure rows go to renderFailedCard instead. Kept because a step strip on green
  // rows is wanted, and when it lands the change is on the reporter side, not here.
  const artefacts =
    t.stepShots.length > 0 || video
      ? `<h3>Artefacts</h3>${
          t.stepShots.length > 0 ? renderFilmStrip(t) : ""
        }${video}`
      : ""
  const body = [
    renderWhatHappened(t),
    renderWhatWasVerified(t),
    renderTxTable(t.journal),
    artefacts,
  ]
    .filter(Boolean)
    .join("\n")
  return `<details class="row ${OUTCOME_CLASS[t.outcome]}" id="${anchorOf(t)}">
<summary>
  ${outcomeBadge(t.outcome)}
  <span class="row-title">${
    t.uatId ? `<span class="mono id">${esc(t.uatId)}</span> ` : ""
  }${esc(t.title.replace(/^[^:]*:\s*/, ""))}</span>
  <span class="row-meta">${fmtDuration(t.durationMs)}${
    chain ? ` · ${esc(chain)}` : ""
  }</span>
  ${overlayCell(t, overlay)}
</summary>
<div class="row-body">${
    reason ? `<p class="reason">${esc(reason)}</p>` : ""
  }${body}</div>
</details>`
}

const HERO: ReadonlySet<Outcome> = new Set<Outcome>([
  "failed",
  "unexpected-pass",
  "expected-failure",
])

const renderTest = (
  t: UatTest,
  overlay: Overlay | null,
  issues: KnownIssue[],
): string =>
  t.outcome === "unexpected-pass"
    ? renderUnexpectedPassCard(t, anchorOf(t), overlay)
    : HERO.has(t.outcome)
      ? renderFailedCard(t, anchorOf(t), overlay, issues)
      : renderQuietRow(t, overlay, issues)

const renderSection = (
  g: PageGroup,
  overlay: Overlay | null,
  issues: KnownIssue[],
): string =>
  `<section class="page" id="page-${g.page}">
<h2 class="page-head">${esc(g.label)} <span class="counts">${countStrip(
    g.counts,
  )}</span></h2>
${g.suites
  .map((s) => {
    const ov = suitePageOverride(s.suite)
    return `<h3 class="suite">${esc(s.suite)}${
      ov ? ` <span class="muted">${esc(ov.note)}</span>` : ""
    }</h3>\n${s.tests.map((t) => renderTest(t, overlay, issues)).join("\n")}`
  })
  .join("\n")}
</section>`

const CSS = `
:root{
  --bg:#f6f7f9; --card:#ffffff; --ink:#1c2330; --muted:#68707e; --line:#e3e6ea;
  --green:#1a7f37; --green-bg:#e6f4ea; --red:#c92a2a; --red-bg:#fdecec; --grey:#8b939e;
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

/* cards */
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;
  padding:20px 24px 24px;margin-bottom:28px}
.card.failed{border-left:5px solid var(--red)}
.card-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.card-head .meta{color:var(--muted);font-size:13px}

/* failed hero */
.hero{display:grid;grid-template-columns:minmax(320px,7fr) minmax(300px,5fr);gap:22px;align-items:start}
@media (max-width:900px){.hero{grid-template-columns:1fr}}
.hero-shot{width:100%;border:1px solid var(--line);border-radius:8px;display:block;cursor:zoom-in}
.no-shot{border:1px dashed var(--line);border-radius:8px;padding:40px;text-align:center;color:var(--muted)}
.headline{font-size:17px;font-weight:700;color:var(--red);margin-bottom:10px}
.where{font-size:13px;margin:0 0 10px;padding:6px 10px;border-left:3px solid var(--line);background:#f7f7f9;border-radius:4px}
.where.warn{border-left-color:#e2a000;background:#fdf6e3}
.err-detail{background:#fff8f8;border-color:#f3d6d6}
.err-detail .exp{color:var(--green)} .err-detail .rcv{color:var(--red)}
.stack summary{cursor:pointer;color:var(--muted);font-size:13px}
dl.state{margin:6px 0 0;display:grid;grid-template-columns:max-content 1fr;gap:4px 14px}
dl.state .kv{display:contents}
dl.state dt{color:var(--muted);font-size:12.5px;padding-top:1px}
dl.state dd{margin:0;font-size:13px}

/* film strip */
.filmstrip{display:flex;gap:12px;overflow-x:auto;padding:6px 2px 10px}
.filmstrip figure{margin:0;flex:none;width:220px}
.filmstrip img{width:100%;height:130px;object-fit:cover;object-position:top;
  border:1px solid var(--line);border-radius:6px;display:block;cursor:zoom-in}
.filmstrip figcaption{font-size:12px;color:var(--muted);margin-top:4px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* what happened: the numbered narrative */
ol.steps{margin:6px 0;padding-left:24px}
ol.steps li.step{margin:5px 0;padding-left:2px}
.step-what{font-weight:600}
.step-ms{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
li.step-failed{background:var(--red-bg);border-radius:5px;padding:4px 6px;margin-left:-6px}
li.step-failed .step-what{color:var(--red)}
.notes{display:block;margin-top:2px}
.note{display:inline-block;font-size:12px;color:var(--muted);background:#f2f3f5;
  border-radius:4px;padding:1px 7px;margin:2px 5px 0 0;font-family:var(--mono)}
.note.bad{background:var(--red-bg);color:var(--red)}
.pre-steps{font-size:12.5px;color:var(--muted);margin:6px 0}

/* what was verified: one evidence card per agreement */
section.ev{border:1px solid var(--line);border-left:3px solid #c9d3e0;border-radius:6px;
  background:#fbfcfd;padding:10px 14px;margin:8px 0}
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
details.raw{margin:8px 0 0}
details.raw summary{cursor:pointer;color:var(--muted);font-size:11.5px;
  text-transform:uppercase;letter-spacing:.05em}
.badge{font-size:11px;font-weight:700;border-radius:4px;padding:1px 7px;text-transform:uppercase}
.badge.ok{background:var(--green-bg);color:var(--green)}
.badge.bad{background:var(--red-bg);color:var(--red)}
.badge.ui{background:#e8f0fe;color:#0b57d0;margin-left:6px}

/* tx table */
table.txs{border-collapse:collapse;font-size:13px;min-width:520px}
table.txs th,table.txs td{border:1px solid var(--line);padding:5px 10px;text-align:left;vertical-align:top}
table.txs th{background:#f2f3f5;font-weight:600}
.chip{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);
  background:#eef0f2;border-radius:4px;padding:1px 5px;vertical-align:middle}
.sub{color:var(--muted);font-size:11.5px;margin-top:2px}
.tx-target{min-width:150px}
.tx-during{color:var(--muted);max-width:180px}
code.tx-call{display:block;max-width:420px;white-space:pre-wrap;word-break:break-word}
details.tx-hash{margin-top:3px}
details.tx-hash summary{cursor:pointer;color:var(--muted);font-size:11px}
details.tx-hash .mono{font-size:11px;word-break:break-all;user-select:all}

/* blobs */
details.blob{margin:6px 0}
details.blob summary{cursor:pointer;font-family:var(--mono);font-size:13px}

/* quiet rows */
details.row{background:var(--card);border:1px solid var(--line);border-radius:8px;
  margin-bottom:8px;padding:0 14px}
details.row summary{display:flex;align-items:center;gap:10px;min-height:40px;
  cursor:pointer;list-style:none}
details.row summary::-webkit-details-marker{display:none}
.row-title{font-weight:600;flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row-meta{color:var(--muted);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
.pagenav{margin:8px 0 20px;font-size:13px}
.page-head{font-size:16px;margin:28px 0 6px;text-transform:none;letter-spacing:0;color:var(--ink)}
h3.suite{font-size:12px;margin:14px 0 6px;color:var(--muted)}
.reason{margin:4px 0 8px;padding:5px 10px;border-left:3px solid var(--line);background:#f7f7f9;border-radius:4px;font-size:13px}
.row-title .id{font-weight:700;margin-right:4px}
.other{margin-left:auto;font-size:12px;white-space:nowrap}
.rel{background:#eef0f2;border-radius:4px;padding:1px 6px;margin-left:5px;font-size:11px}
.flag{border-radius:4px;padding:1px 6px;margin-left:5px;font-size:11px;font-weight:700}
.flag.bad{background:var(--red-bg);color:var(--red)} .flag.warn{background:#fdf6e3;color:#a35b00}
/* unexpected-pass card */
.unexpected{background:var(--red-bg);border-left:4px solid var(--red);border-radius:6px;padding:10px 16px;margin-bottom:16px}
.unexpected p{margin:6px 0}
h3.suite .muted{font-weight:400;text-transform:none}
`

const JS = `
(function () {
  var box = document.getElementById("lightbox")
  var img = box.querySelector("img")
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("[data-lightbox]") : null
    if (a) {
      ev.preventDefault()
      img.src = a.getAttribute("href")
      box.classList.add("open")
    } else if (ev.target === box || ev.target === img) {
      box.classList.remove("open")
      img.src = ""
    }
  })
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { box.classList.remove("open"); img.src = "" }
  })
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
  const nav = groups
    .map(
      (g) =>
        `<a href="#page-${g.page}">${esc(
          g.label,
        )} <span class="muted">${g.suites.reduce(
          (n, s) => n + s.tests.length,
          0,
        )}</span></a>`,
    )
    .join(" · ")
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
<main>
<div class="runbar"><span class="pill ${pillClass}">${esc(
    run.status,
  )}</span><span class="counts">${countStrip(
    countByOutcome(run.tests),
  )}</span></div>
${renderProvenance(run)}
${renderAnswers(
  run,
  overlay,
  opts.otherLabel ?? "main",
  issues,
  opts.coverageMd,
)}
<nav class="pagenav">${nav}</nav>
${groups.map((g) => renderSection(g, overlay, issues)).join("\n")}
${overlay ? renderOnlyInOther(overlay.onlyInOther) : ""}
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
