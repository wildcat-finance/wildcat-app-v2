/* eslint-disable import/no-extraneous-dependencies, no-nested-ternary */
/**
 * Unit tests for e2e/lib/summaryReporter.ts's onEnd — the reporter class implements the
 * Playwright `Reporter` interface but is a plain class, instantiable outside the Playwright
 * runner. It lives here (repo root __tests__/), not next to the module under e2e/lib/, because
 * jest.config.ts's testPathIgnorePatterns excludes <rootDir>/e2e/ wholesale (Playwright specs
 * under e2e/ are run by `npm run test:e2e`, not jest) — a *.test.ts placed inside e2e/lib/ is
 * silently never discovered, even when invoked with an explicit path.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import SummaryReporter from "../e2e/lib/summaryReporter"

describe("SummaryReporter.onEnd", () => {
  let originalCwd: string
  let dir: string

  beforeEach(() => {
    originalCwd = process.cwd()
    dir = mkdtempSync(join(tmpdir(), "summary-reporter-test-"))
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  it("writes nothing when no test ran (e.g. `playwright test --list`)", async () => {
    const reporter = new SummaryReporter()

    await reporter.onEnd({
      status: "passed",
      startTime: new Date(),
      duration: 0,
    })

    expect(existsSync(join(dir, "uat-report"))).toBe(false)
    expect(existsSync(join(dir, "uat-runs"))).toBe(false)
    expect(existsSync(join(dir, "playwright-summary.json"))).toBe(false)
    expect(existsSync(join(dir, "playwright-report.md"))).toBe(false)
  })

  it("writes uat-report/run.json and archives it under uat-runs/<startedAt>/ when a test ran", async () => {
    const reporter = new SummaryReporter()

    // TestRecord/UatTest are internal shapes not exported by the module — push directly through
    // a cast onto the reporter's private arrays rather than fabricating full Playwright
    // TestCase/TestResult objects (which carry many fields unrelated to onEnd's behaviour).
    const fakeTest = {
      title: "fake suite › fake test",
      status: "passed",
      expectedStatus: "passed",
      outcome: "passed",
      durationMs: 10,
      journal: [],
      screenshots: [],
      agreements: [],
    }
    const fakeUatTest = {
      uatId: "MKT-01",
      page: 3,
      title: "MKT-01: new policy created through market creation",
      file: "e2e/borrowerflows/market-creation.spec.ts",
      suite: "borrower flows: market creation",
      status: "passed",
      expectedStatus: "passed",
      outcome: "passed",
      annotations: [],
      durationMs: 10,
      journal: [],
      stepShots: [],
      agreements: [],
    }
    ;(reporter as unknown as { tests: unknown[] }).tests = [fakeTest]
    ;(reporter as unknown as { uatTests: unknown[] }).uatTests = [fakeUatTest]

    // onEnd reads the REAL process.argv (jest's own argv is a "targeted" invocation) — stub it
    // to a plain full-board run for a deterministic assertion on `mode`/`argv`, then restore.
    const originalArgv = process.argv
    process.argv = ["node", "playwright", "test"]
    const startedAt = new Date("2026-09-11T02:00:34.123Z")
    try {
      await reporter.onEnd({
        status: "passed",
        startTime: startedAt,
        duration: 10,
      })
    } finally {
      process.argv = originalArgv
    }

    const runJsonPath = join(dir, "uat-report", "run.json")
    expect(existsSync(runJsonPath)).toBe(true)
    const run = JSON.parse(readFileSync(runJsonPath, "utf8"))
    expect(run.tests).toHaveLength(1)
    expect(run.schema).toBe("uat-run/2")
    expect(run.meta.mode).toBe("full")
    expect(Array.isArray(run.meta.argv)).toBe(true)
    expect(run.meta.forkBlock).toBeGreaterThan(0)
    expect(typeof run.meta.appDirty).toBe("boolean")
    // The reporter process's NODE_ENV says nothing about the app under test — no app-side
    // signal exists yet, so build kind stays unset rather than asserting a guess.
    expect(run.meta.build).toBeUndefined()
    expect(run.meta.pinsSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(run.meta.pollingMs).toBeUndefined()
    expect(run.meta.archiveDir).toBe("uat-runs/2026-09-11T02-00-34-123Z")
    expect(run.tests[0].uatId).toBe("MKT-01")
    expect(run.tests[0].page).toBe(3)

    const archiveRunJsonPath = join(
      dir,
      "uat-runs",
      "2026-09-11T02-00-34-123Z",
      "run.json",
    )
    expect(existsSync(archiveRunJsonPath)).toBe(true)
    const archivedRun = JSON.parse(readFileSync(archiveRunJsonPath, "utf8"))
    expect(archivedRun.tests).toHaveLength(1)
    expect(archivedRun.meta.mode).toBe("full")
  })

  it("re-labels a serial tail as did-not-run and names the blocking failure", async () => {
    const reporter = new SummaryReporter()
    const mk = (title: string, outcome: string, durationMs: number) => ({
      uatId: title.split(":")[0],
      page: 4,
      title,
      file: "e2e/borrowerflows/borrower-ops.spec.ts",
      suite: "borrower ops",
      status:
        outcome === "failed"
          ? "failed"
          : outcome === "passed"
            ? "passed"
            : "skipped",
      expectedStatus: "passed",
      outcome,
      annotations: [],
      durationMs,
      journal: [],
      stepShots: [],
      agreements: [],
    })
    ;(reporter as unknown as { tests: unknown[] }).tests = [
      {
        title: "borrower ops › BOP-01: a",
        status: "failed",
        expectedStatus: "passed",
        outcome: "failed",
        durationMs: 500,
        journal: [],
        screenshots: [],
        agreements: [],
      },
    ]
    ;(reporter as unknown as { uatTests: unknown[] }).uatTests = [
      mk("BOP-01: a", "failed", 500),
      mk("BOP-02: b", "skipped", 0),
    ]
    await reporter.onEnd({
      status: "failed",
      startTime: new Date("2026-09-11T03:00:00.000Z"),
      duration: 500,
    })
    const run = JSON.parse(
      readFileSync(join(dir, "uat-report", "run.json"), "utf8"),
    )
    expect(run.tests[1].outcome).toBe("did-not-run")
    expect(run.tests[1].blockedBy).toBe("BOP-01")
    expect(run.tests[1].blockedAcrossSuites).toBeUndefined()
  })

  it("records meta.envApplied from WILDCAT_ENV_FORK_APPLIED, so the report can tell an observed testMode from one it never saw", async () => {
    const originalEnv = process.env.WILDCAT_ENV_FORK_APPLIED
    delete process.env.WILDCAT_ENV_FORK_APPLIED
    try {
      const notApplied = new SummaryReporter()
      ;(notApplied as unknown as { tests: unknown[] }).tests = [
        {
          title: "fake",
          status: "passed",
          expectedStatus: "passed",
          outcome: "passed",
          durationMs: 1,
          journal: [],
          screenshots: [],
          agreements: [],
        },
      ]
      ;(notApplied as unknown as { uatTests: unknown[] }).uatTests = [
        {
          uatId: null,
          page: null,
          title: "fake",
          file: "e2e/x.spec.ts",
          suite: "x",
          status: "passed",
          expectedStatus: "passed",
          outcome: "passed",
          annotations: [],
          durationMs: 1,
          journal: [],
          stepShots: [],
          agreements: [],
        },
      ]
      await notApplied.onEnd({
        status: "passed",
        startTime: new Date("2026-09-11T04:00:00.000Z"),
        duration: 1,
      })
      const run1 = JSON.parse(
        readFileSync(join(dir, "uat-report", "run.json"), "utf8"),
      )
      expect(run1.meta.envApplied).toBe(false)

      rmSync(join(dir, "uat-report"), { recursive: true, force: true })
      rmSync(join(dir, "uat-runs"), { recursive: true, force: true })
      process.env.WILDCAT_ENV_FORK_APPLIED = "1"
      const applied = new SummaryReporter()
      ;(applied as unknown as { tests: unknown[] }).tests = (
        notApplied as unknown as { tests: unknown[] }
      ).tests
      ;(applied as unknown as { uatTests: unknown[] }).uatTests = (
        notApplied as unknown as { uatTests: unknown[] }
      ).uatTests
      await applied.onEnd({
        status: "passed",
        startTime: new Date("2026-09-11T04:01:00.000Z"),
        duration: 1,
      })
      const run2 = JSON.parse(
        readFileSync(join(dir, "uat-report", "run.json"), "utf8"),
      )
      expect(run2.meta.envApplied).toBe(true)
    } finally {
      if (originalEnv === undefined) delete process.env.WILDCAT_ENV_FORK_APPLIED
      else process.env.WILDCAT_ENV_FORK_APPLIED = originalEnv
    }
  })

  it("still archives run.json when rendering throws (a malformed UAT_OTHER_RUN)", async () => {
    const originalOther = process.env.UAT_OTHER_RUN
    const badOtherPath = join(dir, "not-json.txt")
    mkdirSync(dir, { recursive: true })
    writeFileSync(badOtherPath, "{ this is not valid json")
    process.env.UAT_OTHER_RUN = badOtherPath
    try {
      const reporter = new SummaryReporter()
      ;(reporter as unknown as { tests: unknown[] }).tests = [
        {
          title: "fake",
          status: "passed",
          expectedStatus: "passed",
          outcome: "passed",
          durationMs: 1,
          journal: [],
          screenshots: [],
          agreements: [],
        },
      ]
      ;(reporter as unknown as { uatTests: unknown[] }).uatTests = [
        {
          uatId: null,
          page: null,
          title: "fake",
          file: "e2e/x.spec.ts",
          suite: "x",
          status: "passed",
          expectedStatus: "passed",
          outcome: "passed",
          annotations: [],
          durationMs: 1,
          journal: [],
          stepShots: [],
          agreements: [],
        },
      ]
      const startedAt = new Date("2026-09-11T05:00:00.000Z")
      // renderUatReport throws while parsing inputs.otherRaw — onEnd must not propagate that: the
      // run of record (run.json) still has to land in both uat-report/ and its uat-runs/ archive.
      await expect(
        reporter.onEnd({ status: "passed", startTime: startedAt, duration: 1 }),
      ).resolves.toBeUndefined()

      const runJsonPath = join(dir, "uat-report", "run.json")
      expect(existsSync(runJsonPath)).toBe(true)
      const run = JSON.parse(readFileSync(runJsonPath, "utf8"))
      expect(run.tests).toHaveLength(1)

      const archiveRunJsonPath = join(
        dir,
        "uat-runs",
        "2026-09-11T05-00-00-000Z",
        "run.json",
      )
      expect(existsSync(archiveRunJsonPath)).toBe(true)
      // index.html never got written — the throw happened before writeFileSync for it.
      expect(existsSync(join(dir, "uat-report", "index.html"))).toBe(false)
    } finally {
      if (originalOther === undefined) delete process.env.UAT_OTHER_RUN
      else process.env.UAT_OTHER_RUN = originalOther
    }
  })
})
