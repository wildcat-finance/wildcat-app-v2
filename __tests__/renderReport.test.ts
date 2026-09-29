/**
 * Market provenance (Task 3): render-report derives the index for a uat-run/3 archive that lacks
 * one, RENDER-ONLY. The tool is plain node (.mjs) — it is spawned, not imported — and it loads
 * env.ts through loadTs, which must work without @playwright/test (env.ts never imports it).
 */
import { spawnSync } from "node:child_process"
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const TOOL = resolve(__dirname, "../e2e/tools/render-report.mjs")
const PINNED = "0x07878e16a64ed6daacebe8a6537902a048de8f2d"

const archive = () => ({
  schema: "uat-run/3",
  status: "passed",
  startedAt: "2026-09-26T07:00:00.000Z",
  durationMs: 10,
  meta: {
    appCommit: "abc1234",
    appDirty: false,
    appDirtyFiles: 0,
    sdk: "x",
    subgraphName: "x",
    subgraphDeployment: "x",
    forkBlock: 11584253,
    pinsSha256: "a".repeat(64),
    testMode: true,
    argv: [],
    mode: "targeted",
  },
  tests: [
    {
      uatId: "LEN-18",
      page: 5,
      title: "LEN-18: queue a withdrawal",
      file: "e2e/lenderflows/lender.spec.ts",
      suite: "lender flows",
      status: "passed",
      expectedStatus: "passed",
      outcome: "passed",
      annotations: [],
      durationMs: 10,
      journal: [
        { at: "2026-09-26T07:00:00.000Z", kind: "step", name: "queue" },
        {
          at: "2026-09-26T07:00:01.000Z",
          kind: "tx",
          hash: `0x${"1".repeat(64)}`,
          status: "success",
          block: "11584665",
          gasUsed: "1",
          to: PINNED,
          functionName: "queueWithdrawal",
          args: ["40"],
        },
      ],
      stepShots: [],
      agreements: [],
    },
  ],
})

describe("render-report derives the market index at render time", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "render-report-"))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it("loads env.ts via loadTs (no @playwright/test), renders the index, and never rewrites run.json", () => {
    const runJson = join(dir, "run.json")
    writeFileSync(runJson, JSON.stringify(archive()))
    const before = readFileSync(runJson)
    const mtime = statSync(runJson).mtimeMs
    // An unroutable subgraph: the facts are {} and the pinned market classifies from pins alone.
    const r = spawnSync(
      process.execPath,
      [TOOL, "--run", dir, "--gql", "http://127.0.0.1:9/none"],
      { encoding: "utf8", timeout: 60_000 },
    )
    expect(r.status).toBe(0)
    expect(r.stderr).not.toContain("env.ts did not load")
    expect(r.stdout).toContain("markets: 1 derived at render time")
    expect(readFileSync(runJson).equals(before)).toBe(true)
    expect(statSync(runJson).mtimeMs).toBe(mtime)
    const html = readFileSync(join(dir, "index.html"), "utf8")
    expect(html).toContain(`id="market-${PINNED}"`)
    expect(html).toContain("forked at block 11584253")
    expect(html).toContain("derived at render time from the journal")
  })
})
