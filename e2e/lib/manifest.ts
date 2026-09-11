/* eslint-disable no-restricted-syntax, no-continue */
/**
 * COMPARISON-MANIFEST.json (schema "comparison-manifest/1", written in W1): the checked-in
 * EXPECTED relation between the two apps' rows, keyed by UAT id. The relation cannot be derived
 * from either suite alone, which is why it is data and not code.
 *
 * The checker proves the manifest against the two suites' STATIC id inventories, optionally
 * refined by a pair of run.json files: shape, no duplicate ids, a row for every id either branch
 * DECLARES, no row that names a test neither branch has, and a relation the observed presence
 * does not contradict.
 */
import {
  declaredOf,
  duplicateInventoryIds,
  inventoryIds,
  type Inventory,
} from "./inventory"
import type { UatRun } from "./uatModel"

export type Relation =
  | "identical"
  | "v25-improves"
  | "intentionally-different"
  | "v25-only"
  | "main-only"
  | "untested-on-main"
  | "untested-on-v25"
  | "regression"

export const RELATIONS: readonly Relation[] = [
  "identical",
  "v25-improves",
  "intentionally-different",
  "v25-only",
  "main-only",
  "untested-on-main",
  "untested-on-v25",
  "regression",
]

export type ManifestRow = {
  relation: Relation
  reason?: string
  note?: string
  evidence?: string
  decision?: string
  /** "both" = deliberately no test on either branch (a retired row). Exempts it from orphan checks. */
  absent?: "both"
}

export type Manifest = {
  $schema: string
  variants: { a: string; b: string }
  rows: Record<string, ManifestRow>
}

const ID_RE = /^(M\d+|[A-Z][A-Z0-9]{1,3}-M?\d{1,3}[a-z]?(?:-[A-Z]{2,3})?)$/

export const validateManifest = (m: Manifest): string[] => {
  const errors: string[] = []
  if (m.$schema !== "comparison-manifest/1")
    errors.push(`$schema is "${m.$schema}", expected "comparison-manifest/1"`)
  for (const [id, row] of Object.entries(m.rows ?? {})) {
    if (!ID_RE.test(id)) errors.push(`${id}: not a UAT id`)
    if (!RELATIONS.includes(row.relation))
      errors.push(`${id}: unknown relation "${row.relation}"`)
    if (row.relation !== "identical" && !row.reason && !row.note)
      errors.push(`${id}: relation ${row.relation} needs a reason`)
  }
  return errors
}

/**
 * What one branch has for one id.
 *  - absent        the branch declares no test with this id
 *  - skipped       declared, but test.fixme/test.skip, or the board skipped it with a reason
 *  - not-executed  declared, but this board's run.json has no row for it (filtered, or it died
 *                  before reaching it). NOT an error on its own — see checkCompleteness's
 *                  `exclude` option, which is how the board's own --grep-invert is accounted for.
 *  - ran           executed and did not pass
 *  - passed        executed and passed (or was flaky)
 */
export type Presence = "passed" | "ran" | "skipped" | "not-executed" | "absent"

export type Inventories = { v25: Inventory; main: Inventory }

/** Presence is DECLARATION first, run second. A run can only refine a declared id's outcome. */
export const presenceOf = (
  inventory: Inventory,
  run: UatRun | null,
  id: string,
): Presence => {
  const declared = declaredOf(inventory, id)
  if (declared === "absent") return "absent"
  if (declared === "declared-skipped") return "skipped"
  const t = run?.tests.find((x) => x.uatId === id)
  if (!t) return "not-executed"
  if (t.outcome === "skipped" || t.outcome === "did-not-run") return "skipped"
  if (t.outcome === "passed" || t.outcome === "flaky") return "passed"
  return "ran"
}

export const duplicateIds = (run: UatRun): string[] => {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const t of run.tests) {
    if (!t.uatId) continue
    if (seen.has(t.uatId)) dupes.add(t.uatId)
    seen.add(t.uatId)
  }
  return [...dupes]
}

/** Presences that are NOT evidence the branch exercises the row. */
const NOT_EXERCISED = new Set<Presence>(["absent", "skipped", "not-executed"])

export type CompletenessOptions = {
  /**
   * The board script's own `--grep-invert`, as a regex. An id it matches is EXPECTED to be missing
   * from that board's run.json; the checker records the exclusion instead of complaining about it.
   * `npm run board` uses `--grep-invert "BOP-14"`, which matches BOP-14 and BOP-14b by prefix.
   */
  exclude?: RegExp
}

export type CompletenessResult = {
  errors: string[]
  warnings: string[]
  /** Non-failing observations, chiefly ids a board's own filter kept out of the run. */
  notes: string[]
}

export const checkCompleteness = (
  m: Manifest,
  v25: UatRun | null,
  main: UatRun | null,
  inventory: Inventories,
  opts: CompletenessOptions = {},
): CompletenessResult => {
  const errors: string[] = []
  const warnings: string[] = []
  const notes: string[] = []

  for (const [label, inv] of [
    ["v2.5", inventory.v25],
    ["main", inventory.main],
  ] as const)
    for (const id of duplicateInventoryIds(inv))
      errors.push(
        `${label}: duplicate UAT id ${id} — ids are the pairing key and must be unique`,
      )

  for (const [label, run] of [
    ["v2.5", v25],
    ["main", main],
  ] as const)
    if (run)
      for (const id of duplicateIds(run))
        errors.push(`${label} run.json: duplicate UAT id ${id}`)

  // A row is required for every id either branch DECLARES — not for every id a board happened to
  // execute. That is the difference that makes a --grep-invert'd board pass.
  const ids = new Set<string>([
    ...inventoryIds(inventory.v25),
    ...inventoryIds(inventory.main),
  ])
  for (const id of [...ids].sort())
    if (!m.rows[id])
      errors.push(`${id}: declared on a branch with no manifest row`)

  for (const [id, row] of Object.entries(m.rows)) {
    const a = presenceOf(inventory.v25, v25, id)
    const b = presenceOf(inventory.main, main, id)
    if (a === "absent" && b === "absent") {
      if (row.absent !== "both")
        errors.push(
          `${id}: manifest row with no test on either branch (add "absent": "both" if that is deliberate)`,
        )
      continue
    }

    for (const [label, p, run] of [
      ["v2.5", a, v25],
      ["main", b, main],
    ] as const)
      if (p === "not-executed") {
        const excused = opts.exclude?.test(id) ?? false
        if (excused) {
          // With no run supplied, no board was run at all — say what WOULD happen instead of
          // asserting a board fact (`not executed on the … board`) that no board produced.
          notes.push(
            run
              ? `${id}: not executed on the ${label} board (excluded by --exclude ${opts.exclude?.source})`
              : `${id}: would be excluded from a board run (--exclude ${opts.exclude?.source})`,
          )
        } else if (run) {
          warnings.push(
            `${id}: not executed on the ${label} board (filtered or did not run)`,
          )
        }
      }

    const bad = (why: string) =>
      errors.push(`${id}: relation ${row.relation} but ${why}`)
    switch (row.relation) {
      case "v25-only":
        if (!NOT_EXERCISED.has(b)) bad(`main exercises it (${b})`)
        if (a === "absent") bad("v2.5 does not have it")
        break
      case "main-only":
        if (!NOT_EXERCISED.has(a)) bad(`v2.5 exercises it (${a})`)
        if (b === "absent") bad("main does not have it")
        break
      case "untested-on-main":
        if (!NOT_EXERCISED.has(b)) bad(`main exercises it (${b})`)
        // "no test at all" and "a test.fixme'd test" are both accepted here — that is what lets the
        // current manifest pass (LEN-28…LEN-31 and MKT-18 are test.fixme on main). Surface the
        // difference so the manifest cannot rot silently: deleting a test and fixme-ing it are not
        // the same fact.
        if (b === "skipped")
          warnings.push(
            `${id}: untested-on-main, but main HAS a test for it that is skipped/fixme rather than no test at all`,
          )
        break
      case "untested-on-v25":
        if (!NOT_EXERCISED.has(a)) bad(`v2.5 exercises it (${a})`)
        if (a === "skipped")
          warnings.push(
            `${id}: untested-on-v25, but v2.5 HAS a test for it that is skipped/fixme rather than no test at all`,
          )
        break
      case "identical":
      case "v25-improves":
      case "intentionally-different":
      case "regression":
        if (a === "absent") bad("v2.5 has no such test")
        if (b === "absent") bad("main has no such test")
        break
      default:
        break
    }
    if (
      (row.relation === "identical" || row.relation === "v25-improves") &&
      ((a === "passed" && b === "ran") || (a === "ran" && b === "passed"))
    )
      warnings.push(
        `${id}: REGRESSION? expected ${row.relation}, observed v2.5 ${a} / main ${b}`,
      )
  }
  return { errors, warnings, notes }
}
