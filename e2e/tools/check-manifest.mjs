#!/usr/bin/env node
// Validate COMPARISON-MANIFEST.json, and — given the two suites' id inventories — prove it
// complete. A pair of run.json files is optional and only refines each id's OUTCOME.
//
//   node e2e/tools/check-manifest.mjs                      # shape only
//   node e2e/tools/check-manifest.mjs --other-inventory <main worktree root> \
//        [--inventory <this worktree root>] [--exclude "BOP-14"] \
//        [--run uat-report/run.json --other <main run.json>]
//
// --other-inventory is a LOCAL path to the other branch's checkout. Nothing writes it anywhere;
// it exists because the two suites live in two worktrees and the pairing key spans both.
// --exclude takes the board script's --grep-invert pattern, so an id the board deliberately
// filtered out is recorded as a note rather than reported as a hole.
//
// Exit 0 = manifest usable; 1 = errors. Warnings and notes never fail the check.
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { loadTs } from "./lib/loadTs.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, "../..")
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const readRun = (p, label, errors) => {
  if (!p) return null
  const r = JSON.parse(readFileSync(p, "utf8"))
  if (r.schema !== "uat-run/2")
    errors.push(`${label}: schema ${r.schema}, expected uat-run/2`)
  return r
}

const { validateManifest, checkCompleteness } = await loadTs(join(here, "../lib/manifest.ts"))
const { buildInventory } = await loadTs(join(here, "../lib/inventory.ts"))

const manifestPath = arg("manifest") ?? join(here, "../COMPARISON-MANIFEST.json")
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const errors = validateManifest(manifest)

let warnings = []
let notes = []
const otherInventoryRoot = arg("other-inventory")
const runPath = arg("run")
const otherPath = arg("other")

if (otherInventoryRoot) {
  const inventory = {
    v25: buildInventory(arg("inventory") ?? repo),
    main: buildInventory(otherInventoryRoot),
  }
  const excludeSrc = arg("exclude")
  const res = checkCompleteness(
    manifest,
    readRun(runPath, "--run", errors),
    readRun(otherPath, "--other", errors),
    inventory,
    excludeSrc ? { exclude: new RegExp(excludeSrc) } : {},
  )
  errors.push(...res.errors)
  warnings = res.warnings
  notes = res.notes
} else if (runPath || otherPath) {
  errors.push("--run/--other need --other-inventory: presence comes from the suites, not the runs")
}

for (const n of notes) console.log(`note: ${n}`)
for (const w of warnings) console.warn(`warn: ${w}`)
if (errors.length) {
  console.error(`manifest FAILED (${errors.length}):`)
  for (const e of errors) console.error(` - ${e}`)
  process.exit(1)
}
console.log(
  `manifest ok: ${Object.keys(manifest.rows).length} rows${
    otherInventoryRoot
      ? ` · complete against both inventories${runPath ? " and both runs" : " (no runs given — relations checked by declaration only)"}`
      : " (shape only — pass --other-inventory to prove completeness)"
  }${warnings.length ? ` · ${warnings.length} warning(s)` : ""}${notes.length ? ` · ${notes.length} note(s)` : ""}`,
)
