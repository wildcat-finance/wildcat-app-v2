/* eslint-disable no-restricted-syntax, no-continue */
/**
 * Parsers for the two markdown documents the report header renders.
 *
 * KNOWN-ISSUES.md: each entry carries one machine header inside its row —
 *   <!-- ki: id=20 severity=blocker status=open tests=BOP-17,BOP-17b blocks=2.5 -->
 * The human title is read from the row itself, so the prose stays the source of truth and the
 * comment only carries what a human cannot be asked to keep consistent.
 *
 * COVERAGE.md: the "| UAT id | class | reason |" table of rows this branch does not test.
 */

export const SEVERITIES = ["blocker", "high", "medium", "low"] as const
export const STATUSES = [
  "open",
  "fixed-upstream",
  "fixed-verified",
  "not-a-defect",
  "owner-call",
  "closed",
] as const

export type KnownIssue = {
  id: string
  severity: (typeof SEVERITIES)[number]
  status: string
  tests: string[]
  /** Everything wrong with this row's header: unknown field names, unrecognised values, missing
   *  `blocks=`. Empty for a well-formed row. A typo must never read as a silent default. */
  defects: string[]
  /** Release this entry blocks, or null when blocks=no. */
  blocks: string | null
  decisionPending: boolean
  /** Human title: the entry's own row/heading text, comment stripped. */
  title: string
}

const KI_RE = /<!--\s*ki:\s*([^>]*?)\s*-->/

const KNOWN_FIELDS = new Set([
  "id",
  "severity",
  "status",
  "tests",
  "blocks",
  "decision",
])

const fields = (body: string): Record<string, string> =>
  Object.fromEntries(
    body
      .split(/\s+/)
      .filter(Boolean)
      .map((pair) => {
        const i = pair.indexOf("=")
        return i < 0 ? [pair, ""] : [pair.slice(0, i), pair.slice(i + 1)]
      }),
  )

const titleOf = (line: string): string => {
  const clean = line.replace(KI_RE, "").trim()
  if (clean.startsWith("|")) {
    const cells = clean
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "")
    // "| # | Finding | Status | Tests |" — the finding is the second cell.
    return (cells[1] ?? cells[0] ?? "").slice(0, 240)
  }
  return clean.replace(/^#+\s*/, "").slice(0, 240)
}

export const parseKnownIssues = (md: string): KnownIssue[] => {
  const out: KnownIssue[] = []
  for (const line of md.split("\n")) {
    const m = KI_RE.exec(line)
    if (!m) continue
    const f = fields(m[1])
    if (!f.id) continue
    const defects: string[] = []
    for (const k of Object.keys(f))
      if (!KNOWN_FIELDS.has(k)) defects.push(`unknown field "${k}"`)
    const severityOk = SEVERITIES.includes(f.severity as never)
    if (!severityOk)
      defects.push(
        `severity "${f.severity ?? ""}" is not ${SEVERITIES.join("|")}`,
      )
    const statusOk = STATUSES.includes(f.status as never)
    if (!statusOk)
      defects.push(`status "${f.status ?? ""}" is not ${STATUSES.join("|")}`)
    if (!f.blocks)
      defects.push("no blocks= field (write blocks=no when it blocks nothing)")
    out.push({
      id: f.id,
      severity: severityOk ? (f.severity as KnownIssue["severity"]) : "medium",
      status: statusOk ? f.status : "open",
      defects,
      tests: (f.tests ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t && t !== "-"),
      blocks: !f.blocks || f.blocks === "no" ? null : f.blocks,
      decisionPending: f.decision === "pending",
      title: titleOf(line),
    })
  }
  return out
}

/**
 * A header whose field name is misspelled (`severty=`, `blcoks=`, `tets=`) parses to a silent
 * default and quietly drops the row out of the release view — a `blocks` typo removes a real
 * blocker from the report with no error anywhere. This is the check the docs step runs against the
 * REAL file, so a typo fails the task instead of the report.
 */
export const headerDefects = (issues: KnownIssue[]): string[] =>
  issues
    .filter((i) => i.defects.length > 0)
    .map((i) => `#${i.id}: ${i.defects.join("; ")}`)

const SETTLED = new Set(["closed", "fixed-verified", "not-a-defect"])

/** Entries that block a release: a `blocks=<release>` field and a status that is not settled. */
export const releaseBlockers = (issues: KnownIssue[]): KnownIssue[] =>
  issues.filter((i) => i.blocks !== null && !SETTLED.has(i.status))

export type CoverageRow = { uatId: string; klass: string; reason: string }

export const parseCoverage = (md: string): CoverageRow[] => {
  const out: CoverageRow[] = []
  for (const line of md.split("\n")) {
    if (!line.trim().startsWith("|")) continue
    const cells = line.split("|").map((c) => c.trim())
    // ["", uatId, class, reason, ""] for a well-formed 3-column row. A DIFFERENT pipe table (e.g.
    // COVERAGE.md's "| UAT id | why it skips |" 2-column table, which lists rows that DO have a
    // running test) yields 4 cells here, not 5 — reject it rather than silently reading its first
    // column as a "no test on this branch" id with an empty reason.
    if (cells.length !== 5) continue
    const [, uatId, klass, reason] = cells
    if (!uatId || uatId === "UAT id" || /^-+$/.test(uatId)) continue
    if (!/^[A-Z]/.test(uatId)) continue
    out.push({ uatId, klass: klass ?? "", reason: reason ?? "" })
  }
  return out
}
