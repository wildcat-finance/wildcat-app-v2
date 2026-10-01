#!/usr/bin/env node
// Re-render a run's index.html from its run.json — after a renderer change, or to add the
// comparison overlay to a board that ran without it.
//
//   node e2e/tools/render-report.mjs --run uat-report
//   node e2e/tools/render-report.mjs --run uat-runs/<stamp> \
//        --other <path to main's run.json> --manifest e2e/COMPARISON-MANIFEST.json
//        [--gql <fork subgraph url>]   (market index for a uat-run/3 archive that lacks one;
//                                       default: FORK_GQL from e2e/lib/env.ts)
//        [--ledger <ledger.json> [--runsheet <runsheet.json>] [--ledger-version v25|main]]
//                                      ("What it tests" for rows without a `spec`: the runsheet
//                                       text and the ledger's requirement statements; the runsheet
//                                       defaults to runsheet.json beside the ledger, the version to
//                                       UAT_LEDGER_VERSION, else the rows' own ledger decisions)
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
// uat-run/3 adds four fields to uat-run/2 and changes none of the ones the renderer reads.
if (!["uat-run/2", "uat-run/3"].includes(run.schema)) {
  console.error(`${runPath}: schema ${run.schema} — this renderer reads uat-run/2 and uat-run/3 only`)
  process.exit(1)
}

// uat-run/3 without a market index (a run older than the index): derive it here, RENDER-ONLY —
// never written back to run.json. The subgraph is today's fork, so markets a finished run created
// are usually gone after a reset and classify "unknown"; pinned markets still classify forked.
if (run.schema === "uat-run/3" && !run.markets) {
  try {
    let gql = arg("gql")
    let pinned = {}
    try {
      // env.ts is CommonJS-flavoured (__dirname); give its data: URL module one to resolve.
      globalThis.__dirname ??= join(here, "../lib")
      const env = await loadTs(join(here, "../lib/env.ts"))
      gql ??= env.FORK_GQL
      pinned = env.pins?.markets ?? {}
    } catch (e) {
      console.error(`env.ts did not load (${e.message}) — markets classify from the journal alone`)
    }
    const { buildMarketIndex, fetchMarketFacts } = await loadTs(join(here, "../lib/marketIndex.ts"))
    const facts = gql ? await fetchMarketFacts(gql) : {}
    run.markets = buildMarketIndex(run.tests, facts, run.meta.forkBlock, "render", pinned)
    console.log(`markets: ${run.markets.length} derived at render time (${Object.keys(facts).length} subgraph facts${gql ? ` from ${gql}` : ""})`)
  } catch (e) {
    console.error(`market index not derived (${e.message}) — rendering without it`)
  }
}

// "What it tests": backfill `spec` for rows that lack one, RENDER-ONLY — never written back to
// run.json. Display text only; nothing the renderer derives an outcome from is touched.
const ledgerPath = arg("ledger")
if (ledgerPath) {
  try {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"))
    const runsheetPath = arg("runsheet", join(dirname(ledgerPath), "runsheet.json"))
    const { buildRowSpec, runsheetIndex } = await loadTs(join(here, "../lib/rowSpec.ts"))
    const { parseRequirements, INFRA_ANNOTATION } = await loadTs(join(here, "../lib/uatModel.ts"))
    const runsheet = existsSync(runsheetPath)
      ? runsheetIndex(JSON.parse(readFileSync(runsheetPath, "utf8")))
      : undefined
    // The version is this archive's, not this checkout's: the rows' ledger decisions name it.
    const decided = run.tests
      .flatMap((t) => t.annotations ?? [])
      .filter((a) => a.type === "ledger" && a.description)
      .map((a) => {
        try {
          return JSON.parse(a.description).version
        } catch {
          return undefined
        }
      })
      .find((v) => v === "v25" || v === "main")
    const version = arg("ledger-version", process.env.UAT_LEDGER_VERSION || decided)
    let filled = 0
    for (const t of run.tests) {
      if (t.spec || t.infra || (t.annotations ?? []).some((a) => a.type === INFRA_ANNOTATION)) continue
      const declared = t.requirements?.length ? t.requirements : parseRequirements(t.annotations ?? [])
      const spec = buildRowSpec({ ledger, version, uatId: t.uatId, declared, runsheet })
      if (spec) {
        t.spec = spec
        filled += 1
      }
    }
    console.log(
      `spec: ${filled} row${filled === 1 ? "" : "s"} backfilled from the ledger (version ${version ?? "unknown — no coverage mapping"}; ${runsheet ? `${runsheet.size} runsheet rows` : "no runsheet"})`,
    )
  } catch (e) {
    console.error(`spec not backfilled (${e.message}) — rendering without it`)
  }
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
