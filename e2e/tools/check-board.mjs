#!/usr/bin/env node
// Prove the artefact the board just wrote is the board's own, complete, and usable as evidence.
//
//   node e2e/tools/check-board.mjs [--min-journal-pct <n>]
//
// Journal coverage is MEASURED, not enforced: --min-journal-pct defaults to 0. The last run of
// record carried a journal on only 37 of 182 rows and the cause is not diagnosed yet. Printing the
// number on every board is what makes the gap visible; raise the floor once the cause is known.
import { existsSync, readFileSync, statSync } from "node:fs"

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const MIN_TESTS = Number(process.env.BOARD_MIN_TESTS ?? 100)
const MAX_AGE_MIN = Number(process.env.BOARD_MAX_AGE_MIN ?? 10)
const MIN_JOURNAL_PCT = Number(
  arg("min-journal-pct", process.env.BOARD_MIN_JOURNAL_PCT ?? 0),
)
const path = "uat-report/run.json"
const reportPath = "uat-report/index.html"

if (!existsSync(path)) {
  console.error("no uat-report/run.json — the run wrote no artefact (list-only, or it died before onEnd)")
  process.exit(1)
}
const run = JSON.parse(readFileSync(path, "utf8"))
const ageMin = (Date.now() - statSync(path).mtimeMs) / 60_000
const counts = {}
for (const t of run.tests ?? []) counts[t.outcome] = (counts[t.outcome] ?? 0) + 1

// Journal coverage over rows that actually EXECUTED. A skipped or did-not-run row has nothing to
// journal, so counting it would flatter the number.
const executed = (run.tests ?? []).filter(
  (t) => t.outcome !== "skipped" && t.outcome !== "did-not-run",
)
const withJournal = executed.filter((t) => (t.journal?.length ?? 0) > 0)
const journalPct = executed.length
  ? (withJournal.length / executed.length) * 100
  : 100

console.log(`board: ${run.tests?.length ?? 0} tests · ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · ")}`)
console.log(`journal:  ${withJournal.length} of ${executed.length} executed rows carry a journal (${journalPct.toFixed(0)}%)`)
console.log(`archived: ${run.meta?.archiveDir ?? "(not archived)"}`)
console.log(`report:   ${reportPath}`)

const errors = []
if (run.schema !== "uat-run/2") errors.push(`schema is ${run.schema}, expected uat-run/2`)
if (ageMin > MAX_AGE_MIN) errors.push(`run.json is ${ageMin.toFixed(0)} min old — this board did not write it`)
if (run.meta?.mode !== "full") errors.push(`selection is "${run.meta?.mode}" — a targeted run is not a board (argv: ${(run.meta?.argv ?? []).join(" ")})`)
if ((run.tests?.length ?? 0) < MIN_TESTS) errors.push(`only ${run.tests?.length ?? 0} tests (< ${MIN_TESTS})`)
if (counts.failed) errors.push(`${counts.failed} failed`)
if (counts["unexpected-pass"]) errors.push(`${counts["unexpected-pass"]} unexpected pass (a documented defect no longer reproduces)`)
if (counts["did-not-run"]) errors.push(`${counts["did-not-run"]} tests never ran (serial fallout)`)
if (journalPct < MIN_JOURNAL_PCT)
  errors.push(`journal coverage ${journalPct.toFixed(0)}% < --min-journal-pct ${MIN_JOURNAL_PCT}%`)

// A broken UAT_OTHER_RUN is INVISIBLE without this: the reporter's readIfExists swallows the error,
// renderInputs().otherRaw comes back undefined, and the report renders with no main column —
// indistinguishable from a board that never asked for one.
const otherRun = process.env.UAT_OTHER_RUN
if (otherRun) {
  let other
  try {
    other = JSON.parse(readFileSync(otherRun, "utf8"))
  } catch (e) {
    errors.push(`UAT_OTHER_RUN=${otherRun} did not parse (${e.message}) — the report has no main column`)
  }
  if (other) {
    if (other.schema !== "uat-run/2")
      errors.push(`UAT_OTHER_RUN: schema ${other.schema}, expected uat-run/2`)
    if (!(other.tests?.length > 0))
      errors.push("UAT_OTHER_RUN: 0 tests — buildOverlay is skipped and no main column renders")
    // A targeted or stale main run.json still makes `class="other"` render for every id-bearing
    // row (it just paints "not in main" / "absent" across the board) — that PROVES nothing, so
    // check it's actually a full board, not merely that a column exists.
    if (other.meta?.mode !== "full")
      errors.push(`UAT_OTHER_RUN: selection is "${other.meta?.mode}" — a targeted run is not a comparison board (argv: ${(other.meta?.argv ?? []).join(" ")})`)
    const ownIds = new Set((run.tests ?? []).filter((t) => t.uatId).map((t) => t.uatId))
    const otherIds = new Set((other.tests ?? []).filter((t) => t.uatId).map((t) => t.uatId))
    const paired = [...ownIds].filter((id) => otherIds.has(id)).length
    console.log(`other:    ${paired} id(s) paired with UAT_OTHER_RUN`)
    if (paired === 0)
      errors.push('UAT_OTHER_RUN: 0 ids in common with this run — the main column would paint "not in main" on every row without proving anything')
  }
  if (!existsSync(reportPath) || !readFileSync(reportPath, "utf8").includes('class="other"'))
    errors.push(`UAT_OTHER_RUN was set but ${reportPath} carries no main column`)
}

if (errors.length) {
  console.error("BOARD IS NOT A CLEAN RUN OF RECORD:")
  for (const e of errors) console.error(` - ${e}`)
  process.exit(1)
}
console.log("board ok")
