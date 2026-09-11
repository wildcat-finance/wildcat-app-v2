/* eslint-disable no-restricted-syntax, no-continue */
/**
 * The STATIC id inventory: every UAT id the spec sources DECLARE, whether or not a given board run
 * executed it.
 *
 * Presence has to come from the sources, not from a run.json: `npm run board` filters BOP-14 and
 * BOP-14b out with `--grep-invert`, so those ids are entirely absent from a perfectly good run and
 * still are rows the branch has. Inferring presence from two run.json files alone reports them as
 * missing, which is exactly the hole this module closes.
 *
 * `scanSpecTitles` is pure — it takes source TEXT, so its rules are unit-testable with no
 * filesystem. `buildInventory` is the thin node:fs walker around it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { parseUatId } from "./uatModel"

/** How the row was DECLARED. fixme/skip rows never execute: present, but not evidence. */
export type InvKind = "test" | "fixme" | "skip" | "fail"

export type InventoryRow = {
  /** null for setup:/teardown:/smoke/withdrawal rows — real rows, but not pairing keys. */
  id: string | null
  /** Repo-relative spec path, always with "/" separators. */
  file: string
  kind: InvKind
  title: string
}

export type Inventory = InventoryRow[]

/**
 * Matches a DECLARATION — `test("…"`, `test.fixme("…"`, `test.skip("…"`, `test.fail("…"` — whose
 * FIRST argument is a string literal. The runtime forms `test.skip(cond, "reason")` and
 * `test.fixme(true, "reason")` inside a test body do not match, because their first argument is not
 * a string. `\s*` spans newlines, so a declaration whose title sits on its own line is still found.
 */
const DECL_RE =
  /\btest(?:\.(fixme|skip|fail))?\(\s*(["'`])((?:\\.|(?!\2).)*)\2/g

export const scanSpecTitles = (source: string, file: string): Inventory => {
  const rows: Inventory = []
  for (const m of source.matchAll(DECL_RE))
    rows.push({
      id: parseUatId(m[3]),
      file,
      kind: (m[1] as InvKind | undefined) ?? "test",
      title: m[3],
    })
  return rows
}

const specFiles = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir).sort()) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) specFiles(p, out)
    else if (p.endsWith(".spec.ts")) out.push(p)
  }
  return out
}

/** Every declared row under `<root>/e2e`, in path order. */
export const buildInventory = (root: string): Inventory =>
  specFiles(join(root, "e2e")).flatMap((f) =>
    scanSpecTitles(
      readFileSync(f, "utf8"),
      relative(root, f).split(sep).join("/"),
    ),
  )

/** Ids declared more than once — the pairing key must be unique. */
export const duplicateInventoryIds = (inv: Inventory): string[] => {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const r of inv) {
    if (!r.id) continue
    if (seen.has(r.id)) dupes.add(r.id)
    seen.add(r.id)
  }
  return [...dupes].sort()
}

/** The distinct ids a branch declares. */
export const inventoryIds = (inv: Inventory): Set<string> =>
  new Set(inv.map((r) => r.id).filter((id): id is string => id !== null))

/** What a branch has for one id, from the sources alone. */
export type Declared = "absent" | "declared" | "declared-skipped"

export const declaredOf = (inv: Inventory, id: string): Declared => {
  const rows = inv.filter((r) => r.id === id)
  if (rows.length === 0) return "absent"
  return rows.every((r) => r.kind === "fixme" || r.kind === "skip")
    ? "declared-skipped"
    : "declared"
}
