/**
 * What a row is testing, in plain English — DISPLAY ONLY.
 *
 * The report's "What it tests" tab shows, per row, the runsheet row the test implements (what the
 * tester does, what should happen) and the ledger's statement of every requirement the row proves.
 * This module derives that text from the ledger and the vendored `runsheet.json`; the ledger
 * fixture attaches it to a row as a `spec` annotation, and `render-report.mjs --ledger` backfills
 * it for an archive that predates the annotation.
 *
 * Nothing here decides anything. No outcome, verdict, decision or signature check reads a spec: a
 * typo in the runsheet can change what the card says, never what the row did.
 *
 * Pure and fs-free, with no bare imports: `render-report.mjs` loads it through `loadTs`, whose
 * data: URL modules cannot resolve a package name.
 */
import type { Ledger, LedgerRequirement, LedgerVersionId } from "./ledger"
import {
  SPEC_ANNOTATION,
  type UatAnnotation,
  type UatSpec,
  type UatSpecRequirement,
  type UatSpecRunsheet,
} from "./uatModel"

/** One `runsheet.json` row, as vendored beside the ledger. */
export type RunsheetRow = {
  page?: number | null
  pageTitle?: string | null
  uatId?: string | null
  title?: string | null
  preconditions?: string | null
  steps?: string | null
  expected?: string | null
  notes?: string | null
}

export type RunsheetIndex = Map<string, RunsheetRow>

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

/** `uatId -> row` from `runsheet.json` (`{ rows: [...] }`) or a bare array. First row wins. */
export const runsheetIndex = (raw: unknown): RunsheetIndex => {
  let rows: unknown[] = []
  if (Array.isArray(raw)) rows = raw
  else if (isRecord(raw) && Array.isArray(raw.rows)) rows = raw.rows
  const index: RunsheetIndex = new Map()
  rows.forEach((r: unknown) => {
    if (
      isRecord(r) &&
      typeof r.uatId === "string" &&
      r.uatId &&
      !index.has(r.uatId)
    )
      index.set(r.uatId, r as RunsheetRow)
  })
  return index
}

/**
 * The runsheet row for a test id. A "b"-suffixed id (MKT-23b, LEN-35b) is a second test of the
 * same runsheet row, so it falls back to its base id when the runsheet has no row of its own.
 */
export const runsheetRowFor = (
  index: RunsheetIndex | undefined,
  uatId: string | null | undefined,
): (RunsheetRow & { uatId: string }) | undefined => {
  if (!index || !uatId) return undefined
  const own = index.get(uatId)
  if (own) return { ...own, uatId }
  const base = /^(.*\d)b$/.exec(uatId)?.[1]
  const row = base ? index.get(base) : undefined
  return row && base ? { ...row, uatId: base } : undefined
}

const requirementsOf = (ledger: Ledger | undefined): LedgerRequirement[] => {
  const out: LedgerRequirement[] = []
  const areas = Array.isArray(ledger?.areas) ? ledger!.areas : []
  areas.forEach((area) => {
    const caps =
      isRecord(area) && Array.isArray(area.capabilities)
        ? area.capabilities
        : []
    caps.forEach((cap) => {
      const reqs =
        isRecord(cap) && Array.isArray(cap.requirements) ? cap.requirements : []
      reqs.forEach((r) => {
        if (isRecord(r) && typeof r.id === "string")
          out.push(r as LedgerRequirement)
      })
    })
  })
  return out
}

const versionEntry = (
  r: LedgerRequirement | undefined,
  version: LedgerVersionId | undefined,
) => {
  const versions = isRecord(r?.versions) ? r!.versions : undefined
  const e = version && versions ? versions[version] : undefined
  return isRecord(e) ? e : undefined
}

const describeRequirement = (
  id: string,
  r: LedgerRequirement | undefined,
  version: LedgerVersionId | undefined,
): UatSpecRequirement => {
  if (!r) return { id, known: false }
  const e = versionEntry(r, version)
  const out: UatSpecRequirement = { id }
  if (typeof r.statement === "string") out.statement = r.statement
  if (typeof r.desired?.text === "string") out.desired = r.desired.text
  const app = isRecord(e?.applicability) ? e!.applicability : undefined
  if (typeof app?.class === "string") out.applicability = app.class
  if (typeof app?.status === "string") out.applicabilityStatus = app.status
  const impl = isRecord(e?.implementation) ? e!.implementation : undefined
  if (typeof impl?.class === "string") out.implementation = impl.class
  const ki = isRecord(impl?.knownIssue) ? impl!.knownIssue : undefined
  if (ki && typeof ki.id === "string")
    out.knownIssue = `${ki.register ?? version ?? "?"}#${ki.id}`
  return out
}

/** The requirements whose coverage, on `version`, names this row. */
const mappedTo = (
  all: LedgerRequirement[],
  version: LedgerVersionId | undefined,
  uatId: string | null,
): LedgerRequirement[] =>
  !version || !uatId
    ? []
    : all.filter((r) => {
        const cov = versionEntry(r, version)?.coverage
        const tests = isRecord(cov) && Array.isArray(cov.tests) ? cov.tests : []
        return tests.some((x: unknown) => isRecord(x) && x.uatId === uatId)
      })

const runsheetText = (
  row: RunsheetRow & { uatId: string },
): UatSpecRunsheet => ({
  uatId: row.uatId,
  page: row.page ?? null,
  pageTitle: row.pageTitle ?? null,
  title: row.title ?? null,
  preconditions: row.preconditions ?? null,
  steps: row.steps ?? null,
  expected: row.expected ?? null,
  notes: row.notes ?? null,
})

/**
 * The spec of one row. `declared` is the row's own `requirements()` declaration; when it is empty
 * (an unmigrated row) the requirements come from the ledger's coverage mapping for `version` and
 * the block says so (`source: "ledger-mapping"`). `undefined` when there is nothing to show — no
 * runsheet row and no requirement. Never throws.
 */
export const buildRowSpec = (input: {
  ledger?: Ledger
  version?: LedgerVersionId
  uatId: string | null
  declared: string[]
  runsheet?: RunsheetIndex
}): UatSpec | undefined => {
  try {
    const all = requirementsOf(input.ledger)
    const byId = new Map<string, LedgerRequirement>()
    all.forEach((r) => {
      if (!byId.has(r.id)) byId.set(r.id, r)
    })
    const declared = input.declared.length > 0
    const requirements = declared
      ? input.declared.map((id) =>
          describeRequirement(id, byId.get(id), input.version),
        )
      : mappedTo(all, input.version, input.uatId).map((r) =>
          describeRequirement(r.id, r, input.version),
        )
    const row = runsheetRowFor(input.runsheet, input.uatId)
    if (!row && requirements.length === 0) return undefined
    return {
      source: declared ? "declared" : "ledger-mapping",
      ...(row ? { runsheet: runsheetText(row) } : {}),
      requirements,
    }
  } catch {
    return undefined
  }
}

export const specAnnotation = (spec: UatSpec): UatAnnotation => ({
  type: SPEC_ANNOTATION,
  description: JSON.stringify(spec),
})
