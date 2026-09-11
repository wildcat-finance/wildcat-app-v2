#!/usr/bin/env node
// Re-render a run's index.html from its run.json — after a renderer change, or to add the
// comparison overlay to a board that ran without it.
//
//   node e2e/tools/render-report.mjs --run uat-report
//   node e2e/tools/render-report.mjs --run uat-runs/<stamp> \
//        --other <path to main's run.json> --manifest e2e/COMPARISON-MANIFEST.json
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { loadTs } from "./lib/loadTs.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, "../..")
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const read = (p) => (p && existsSync(p) ? readFileSync(p, "utf8") : undefined)

const dir = arg("run", join(repo, "uat-report"))
const runPath = join(dir, "run.json")
if (!existsSync(runPath)) {
  console.error(`${runPath} not found — point --run at a directory holding run.json`)
  process.exit(1)
}
const run = JSON.parse(readFileSync(runPath, "utf8"))
if (run.schema !== "uat-run/2") {
  console.error(`${runPath}: schema ${run.schema} — this renderer reads uat-run/2 only`)
  process.exit(1)
}

const otherRaw = read(arg("other"))
const manifestRaw = read(arg("manifest", join(repo, "e2e/COMPARISON-MANIFEST.json")))
const { renderUatReport } = await loadTs(join(here, "../lib/uatReport.ts"))
writeFileSync(
  join(dir, "index.html"),
  renderUatReport(run, {
    other: otherRaw ? JSON.parse(otherRaw) : null,
    otherLabel: arg("other-label", "main"),
    manifest: manifestRaw ? JSON.parse(manifestRaw) : null,
    knownIssuesMd: read(join(repo, "e2e/KNOWN-ISSUES.md")),
    coverageMd: read(join(repo, "e2e/COVERAGE.md")),
  }),
)
console.log(`wrote ${join(dir, "index.html")} · ${run.tests.length} tests${otherRaw ? " · with the main column" : ""}`)
