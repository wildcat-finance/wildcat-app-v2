/* eslint-disable no-restricted-syntax, no-continue, no-nested-ternary */
/**
 * The comparison overlay: v2.5's report carries main's outcome per row, plus the manifest's
 * EXPECTED relation, plus a flag when the two disagree. Rows pair by UAT id — never by title,
 * which drifts between branches (presentability F3: 8 ids split into duplicate rows that way).
 */
import type { Manifest, Relation } from "./manifest"
import type { Outcome, UatRun, UatTest } from "./uatModel"

export type OverlayFlag =
  | "REGRESSION?"
  | "MANIFEST-STALE"
  | "not in main"
  | "not in v2.5"

export type OverlayCell = {
  uatId: string
  title: string
  otherOutcome: Outcome | null
  relation: Relation | null
  relationReason?: string
  flags: OverlayFlag[]
}

export type Overlay = {
  byId: Map<string, OverlayCell>
  /** Ids main ran that v2.5 does not have — rendered as their own section. */
  onlyInOther: OverlayCell[]
  counts: Record<string, number>
}

/** pass / fail / neither — the only distinction a regression flag may be based on. */
const verdict = (o: Outcome | null): "green" | "red" | "grey" =>
  o === "passed" || o === "flaky"
    ? "green"
    : o === "failed" || o === "unexpected-pass"
      ? "red"
      : "grey"

export const buildOverlay = (
  run: UatRun,
  other: UatRun,
  manifest: Manifest | null,
): Overlay => {
  const otherById = new Map<string, UatTest>()
  for (const t of other.tests) if (t.uatId) otherById.set(t.uatId, t)

  const byId = new Map<string, OverlayCell>()
  const counts: Record<string, number> = {}
  const bump = (k: string) => {
    counts[k] = (counts[k] ?? 0) + 1
  }

  for (const t of run.tests) {
    if (!t.uatId) continue
    const o = otherById.get(t.uatId)
    const row = manifest?.rows[t.uatId] ?? null
    const flags: OverlayFlag[] = []
    if (!o) flags.push("not in main")
    if (!row) flags.push("MANIFEST-STALE")
    if (
      row &&
      (row.relation === "identical" || row.relation === "v25-improves") &&
      o &&
      verdict(t.outcome) !== "grey" &&
      verdict(o.outcome) !== "grey" &&
      verdict(t.outcome) !== verdict(o.outcome)
    )
      flags.push("REGRESSION?")
    for (const f of flags) bump(f)
    if (row) bump(row.relation)
    byId.set(t.uatId, {
      uatId: t.uatId,
      title: t.title,
      otherOutcome: o?.outcome ?? null,
      relation: row?.relation ?? null,
      relationReason: row?.reason ?? row?.note,
      flags,
    })
  }

  const onlyInOther: OverlayCell[] = []
  for (const [id, t] of otherById) {
    if (byId.has(id)) continue
    const row = manifest?.rows[id] ?? null
    const flags: OverlayFlag[] = ["not in v2.5"]
    if (!row) flags.push("MANIFEST-STALE")
    for (const f of flags) bump(f)
    if (row) bump(row.relation)
    onlyInOther.push({
      uatId: id,
      title: t.title,
      otherOutcome: t.outcome,
      relation: row?.relation ?? null,
      relationReason: row?.reason ?? row?.note,
      flags,
    })
  }

  return { byId, onlyInOther, counts }
}
