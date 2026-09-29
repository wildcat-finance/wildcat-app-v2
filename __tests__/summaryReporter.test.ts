/* eslint-disable import/no-extraneous-dependencies, no-nested-ternary */
/**
 * Unit tests for e2e/lib/summaryReporter.ts's onEnd — the reporter class implements the
 * Playwright `Reporter` interface but is a plain class, instantiable outside the Playwright
 * runner. It lives here (repo root __tests__/), not next to the module under e2e/lib/, because
 * jest.config.ts's testPathIgnorePatterns excludes <rootDir>/e2e/ wholesale (Playwright specs
 * under e2e/ are run by `npm run test:e2e`, not jest) — a *.test.ts placed inside e2e/lib/ is
 * silently never discovered, even when invoked with an explicit path.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
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

  /**
   * The failure SITE, on both schemas.
   *
   * `uat-run/2` is a frozen archive format: `failedDuring` stays the flattened-`test.step`
   * position it has always been, because `uatReport.ts` renders the kind and the index into prose
   * and archived runs are compared field for field across branches. `uat-run/3` needs a site that
   * can be RECONCILED against what actually ran — it is the evidence every per-requirement failure
   * attribution rests on — so it resolves the position against the journal, names the sites the
   * journal cannot account for, and keeps the hook/fixture/teardown distinction.
   */
  describe("onTestEnd records the failure site", () => {
    let originalSchema: string | undefined

    beforeEach(() => {
      originalSchema = process.env.UAT_RUN_SCHEMA
    })

    afterEach(() => {
      if (originalSchema === undefined) delete process.env.UAT_RUN_SCHEMA
      else process.env.UAT_RUN_SCHEMA = originalSchema
    })

    const journalOf = (...names: string[]) =>
      Buffer.from(
        JSON.stringify([
          { at: "2026-01-03T00:00:00.000Z", kind: "nav", url: "/lender" },
          ...names.map((name) => ({
            at: "2026-01-03T00:00:00.000Z",
            kind: "step",
            name,
          })),
        ]),
      )

    /** Playwright's own step tree: `test.step` checkpoints, optionally wrapped in a hook. */
    type Step = {
      category: string
      title: string
      error?: unknown
      steps?: Step[]
    }
    const checkpoints = (
      flat: { title: string; failing?: boolean }[],
    ): Step[] =>
      flat.map((f) => ({
        category: "test.step",
        title: f.title,
        error: f.failing ? { message: "boom" } : undefined,
        steps: [],
      }))

    const report = async (
      schema: "2" | "3",
      steps: Step[],
      journal: Buffer,
    ) => {
      if (schema === "3") process.env.UAT_RUN_SCHEMA = "3"
      else delete process.env.UAT_RUN_SCHEMA
      const reporter = new SummaryReporter()
      reporter.onTestEnd(
        {
          annotations: [{ type: "requirements", description: "REQ-ADM-001" }],
          expectedStatus: "passed",
          location: { file: "/repo/e2e/fixture/x.spec.ts" },
          title: "X-01: a row",
          titlePath: () => ["", "chromium", "x.spec.ts", "X-01: a row"],
        } as never,
        {
          status: "failed",
          retry: 0,
          duration: 5,
          startTime: new Date("2026-01-03T00:00:00.000Z"),
          error: { message: "Error: the last checkpoint broke" },
          attachments: [
            {
              name: "journal.json",
              body: journal,
              contentType: "application/json",
            },
          ],
          steps,
        } as never,
      )
      await reporter.onEnd({
        status: "failed",
        startTime: new Date("2026-01-03T00:00:00.000Z"),
        duration: 5,
      })
      return JSON.parse(
        readFileSync(join(dir, "uat-report", "run.json"), "utf8"),
      ).tests[0]
    }

    // ---- uat-run/2: the shapes the report renderer and every archived run already carry -------

    /**
     * A GOLDEN of the frozen format, over every shape the failure-site walk can take, with and
     * without a journal. These exact values were taken from the reporter as it stood before
     * uat-run/3 existed (`fe8577c6`), by driving both reporters over this same fixture table in
     * one process and comparing the run.json they wrote: byte-identical, `meta`, rows and all.
     * The table is what keeps them that way.
     */
    const FROZEN: [string, Step[], Buffer, Record<string, unknown>][] = [
      [
        "step failure, journal complete",
        checkpoints([{ title: "alpha" }, { title: "beta", failing: true }]),
        journalOf("alpha", "beta"),
        { kind: "step", name: "beta", index: 2 },
      ],
      [
        "step failure, NO journal at all",
        checkpoints([{ title: "alpha" }, { title: "beta", failing: true }]),
        Buffer.from("[]"),
        { kind: "step", name: "beta", index: 2 },
      ],
      [
        "step failure, journal missing the failing step",
        checkpoints([{ title: "alpha" }, { title: "beta", failing: true }]),
        journalOf("alpha"),
        { kind: "step", name: "beta", index: 2 },
      ],
      [
        "step failure, journal carries extra steps",
        checkpoints([{ title: "beta", failing: true }]),
        journalOf("warm", "beta", "later"),
        { kind: "step", name: "beta", index: 1 },
      ],
      [
        "duplicate step names, second fails",
        checkpoints([{ title: "retry" }, { title: "retry", failing: true }]),
        journalOf("retry", "retry"),
        { kind: "step", name: "retry", index: 2 },
      ],
      [
        "duplicate step names, NO journal",
        checkpoints([{ title: "retry" }, { title: "retry", failing: true }]),
        Buffer.from("[]"),
        { kind: "step", name: "retry", index: 2 },
      ],
      [
        "between, journal complete",
        checkpoints([{ title: "alpha" }, { title: "beta" }]),
        journalOf("alpha", "beta"),
        { kind: "between", name: "beta", index: 2 },
      ],
      [
        "between, NO journal",
        checkpoints([{ title: "alpha" }, { title: "beta" }]),
        Buffer.from("[]"),
        { kind: "between", name: "beta", index: 2 },
      ],
      ["arrange, no checkpoints", [], journalOf(), { kind: "arrange" }],
      [
        "arrange, no checkpoints, NO journal",
        [],
        Buffer.from("[]"),
        { kind: "arrange" },
      ],
      [
        "hook failure wrapping a fixture",
        [
          {
            category: "hook",
            title: "Before Hooks",
            error: { message: "boom" },
            steps: [
              {
                category: "fixture",
                title: "fixture: page",
                error: { message: "boom" },
              },
            ],
          },
        ],
        Buffer.from("[]"),
        { kind: "arrange" },
      ],
      [
        "After Hooks failure after a checkpoint",
        [
          ...checkpoints([{ title: "alpha" }]),
          {
            category: "hook",
            title: "After Hooks",
            error: { message: "boom" },
            steps: [],
          },
        ],
        journalOf("alpha"),
        { kind: "between", name: "alpha", index: 1 },
      ],
      [
        "nested step, child fails",
        [
          {
            category: "test.step",
            title: "outer",
            error: { message: "boom" },
            steps: checkpoints([{ title: "inner", failing: true }]),
          },
        ],
        journalOf("outer", "inner"),
        { kind: "step", name: "outer", index: 1 },
      ],
    ]

    it.each(FROZEN)(
      "uat-run/2 is unchanged: %s",
      async (_title, steps, journal, expected) => {
        const t = await report("2", steps, journal)
        expect(t.failedDuring).toEqual(expected)
      },
    )

    it("uat-run/2 writes no observations, no requirements and no infra marker", async () => {
      const t = await report(
        "2",
        checkpoints([{ title: "alpha", failing: true }]),
        journalOf("alpha"),
      )
      expect(t.observations).toBeUndefined()
      expect(t.requirements).toBeUndefined()
      expect(t.infra).toBeUndefined()
    })

    // ---- uat-run/3: a site that can be reconciled against the journal ------------------------

    it("uat-run/3 indexes the journal, not Playwright's flattened step list", async () => {
      const t = await report(
        "3",
        checkpoints([
          { title: "warm up" },
          { title: "alpha" },
          { title: "beta", failing: true },
        ]),
        journalOf("alpha", "beta"),
      )
      expect(t.failedDuring).toEqual({ kind: "step", name: "beta", index: 2 })
    })

    it("uat-run/3 claims no journal position for a checkpoint the journal never recorded", async () => {
      const t = await report(
        "3",
        checkpoints([
          { title: "alpha" },
          { title: "a raw test.step", failing: true },
        ]),
        journalOf("alpha"),
      )
      // The place is reported; the position is not invented. A site the journal cannot account
      // for owns no attributed assertion, and `unknown` is what the schema calls that.
      expect(t.failedDuring).toEqual({
        kind: "unknown",
        name: "a raw test.step",
      })
    })

    it("uat-run/3 names the last checkpoint, at its journal position, when nothing inside one failed", async () => {
      const t = await report(
        "3",
        checkpoints([{ title: "warm up" }, { title: "alpha" }]),
        journalOf("alpha"),
      )
      expect(t.failedDuring).toEqual({
        kind: "between",
        name: "alpha",
        index: 1,
      })
    })

    it("uat-run/3 says arrange when the row never reached a checkpoint", async () => {
      const t = await report("3", [], journalOf())
      expect(t.failedDuring).toEqual({ kind: "arrange" })
    })

    it("uat-run/3 reports a fixture failure as a fixture, not as arrange", async () => {
      const t = await report(
        "3",
        [
          {
            category: "hook",
            title: "Before Hooks",
            error: { message: "boom" },
            steps: [
              {
                category: "fixture",
                title: "fixture: page",
                error: { message: "boom" },
              },
            ],
          },
        ],
        journalOf(),
      )
      expect(t.failedDuring).toEqual({ kind: "fixture", name: "fixture: page" })
    })

    it("uat-run/3 reports a beforeEach failure as a hook", async () => {
      const t = await report(
        "3",
        [
          {
            category: "hook",
            title: "Before Hooks",
            error: { message: "boom" },
            steps: [],
          },
        ],
        journalOf(),
      )
      expect(t.failedDuring).toEqual({ kind: "hook", name: "Before Hooks" })
    })

    it("uat-run/3 reports an After Hooks failure as teardown, even after the checkpoints ran", async () => {
      const t = await report(
        "3",
        [
          ...checkpoints([{ title: "alpha" }]),
          {
            category: "hook",
            title: "After Hooks",
            error: { message: "boom" },
            steps: [
              {
                category: "fixture",
                title: "fixture: uatJournal",
                error: { message: "boom" },
              },
            ],
          },
        ],
        journalOf("alpha"),
      )
      expect(t.failedDuring).toEqual({
        kind: "teardown",
        name: "fixture: uatJournal",
      })
    })

    it("uat-run/3 prefers a failing checkpoint to the hook it ran under", async () => {
      // A `test.step` that broke is a more specific answer than "somewhere in Before Hooks", and
      // it is the only one an assertion can be attributed to.
      const t = await report(
        "3",
        [
          {
            category: "hook",
            title: "Before Hooks",
            error: { message: "boom" },
            steps: checkpoints([{ title: "alpha", failing: true }]),
          },
        ],
        journalOf("alpha"),
      )
      expect(t.failedDuring).toEqual({ kind: "step", name: "alpha", index: 1 })
    })
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

/**
 * Market provenance (Tasks 1 and 3). The chain-time entry and the `markets` index are uat-run/3
 * additions; under uat-run/2 the reporter must write what it always wrote. The recorder that
 * produces chain-time entries is registered only under /3 (lib/test.ts, see chainTime.test.ts),
 * so a /2 journal never carries one.
 */
describe("SummaryReporter.onEnd — market provenance", () => {
  let originalCwd: string
  let originalArgv: string[]
  let originalSchema: string | undefined
  let originalFetch: typeof globalThis.fetch
  let dir: string

  const MARKET = "0x07878e16a64ed6daacebe8a6537902a048de8f2d"
  const LENDER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"

  const stepEntry = {
    at: "2026-09-26T07:00:00.000Z",
    kind: "step",
    name: "queue a partial withdrawal",
  }
  const chainTimeEntry = {
    at: "2026-09-26T07:01:00.000Z",
    kind: "chain-time",
    seconds: 3_600,
    fromTs: 1_790_402_521,
    toTs: 1_790_406_122,
    block: "11584664",
  }
  const txEntry = {
    at: "2026-09-26T07:02:02.000Z",
    kind: "tx",
    hash: "0x08cccdcd4e977ed9a7830af55205fbeda117d58a549e0d1b9c6bcd22e2b8d847",
    status: "success",
    block: "11584665",
    gasUsed: "171036",
    from: LENDER,
    to: MARKET,
    functionName: "queueWithdrawal",
    args: ["40000000000000000000"],
    source: "lib",
  }

  const writeRun = async (
    schema: "2" | "3",
    journal: Record<string, unknown>[],
  ) => {
    if (schema === "3") process.env.UAT_RUN_SCHEMA = "3"
    else delete process.env.UAT_RUN_SCHEMA
    const reporter = new SummaryReporter()
    const entries = journal.map((e) => ({ ...e }))
    ;(reporter as unknown as { tests: unknown[] }).tests = [
      {
        title: "lender flows › LEN-18: queue a withdrawal",
        status: "failed",
        expectedStatus: "passed",
        outcome: "failed",
        durationMs: 10,
        error: "Error: boom",
        journal: entries,
        screenshots: [],
        agreements: [],
      },
    ]
    ;(reporter as unknown as { uatTests: unknown[] }).uatTests = [
      {
        uatId: "LEN-18",
        page: 5,
        title: "LEN-18: queue a withdrawal",
        file: "e2e/lenderflows/lender.spec.ts",
        suite: "lender flows",
        status: "failed",
        expectedStatus: "passed",
        outcome: "failed",
        annotations: [],
        durationMs: 10,
        journal: entries,
        stepShots: [],
        agreements: [],
      },
    ]
    process.argv = ["node", "playwright", "test"]
    await reporter.onEnd({
      status: "failed",
      startTime: new Date("2026-09-26T07:00:00.000Z"),
      duration: 10,
    })
    return {
      run: JSON.parse(
        readFileSync(join(dir, "uat-report", "run.json"), "utf8"),
      ),
      md: readFileSync(join(dir, "playwright-report.md"), "utf8"),
      summary: JSON.parse(
        readFileSync(join(dir, "playwright-summary.json"), "utf8"),
      ),
    }
  }

  beforeEach(() => {
    originalCwd = process.cwd()
    originalArgv = process.argv
    originalSchema = process.env.UAT_RUN_SCHEMA
    originalFetch = globalThis.fetch
    // No network in jest: the address book and the market facts both see an unreachable subgraph.
    globalThis.fetch = (async () => {
      throw new Error("offline")
    }) as never
    dir = mkdtempSync(join(tmpdir(), "summary-reporter-markets-"))
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    process.argv = originalArgv
    globalThis.fetch = originalFetch
    if (originalSchema === undefined) delete process.env.UAT_RUN_SCHEMA
    else process.env.UAT_RUN_SCHEMA = originalSchema
    rmSync(dir, { recursive: true, force: true })
  })

  it("uat-run/2: a journal without chain-time (the recorder is never registered) is written exactly as before", async () => {
    const { run, md, summary } = await writeRun("2", [stepEntry, txEntry])
    expect(run.schema).toBe("uat-run/2")
    expect(Object.keys(run)).toEqual([
      "schema",
      "status",
      "startedAt",
      "durationMs",
      "meta",
      "tests",
    ])
    expect(run.tests[0].journal.map((e: { kind: string }) => e.kind)).toEqual([
      "step",
      "tx",
    ])
    expect(summary.tests[0].journal).toHaveLength(2)
    // The reproduction list is the pre-existing format, line for line.
    const repro = md.slice(md.indexOf("**Reproduction steps:**"))
    expect(repro.split("\n").slice(0, 5)).toEqual([
      "**Reproduction steps:**",
      "",
      "1. do: queue a partial withdrawal",
      `2. tx: account #0 (lender) → queueWithdrawal(amount: 40000000000000000000) on pinned market "openTerm" — success (block 11584665)`,
      "",
    ])
  })

  it("uat-run/3: the chain-time entry is carried in run.json and printed in the reproduction steps", async () => {
    const { run, md } = await writeRun("3", [
      stepEntry,
      chainTimeEntry,
      txEntry,
    ])
    expect(run.schema).toBe("uat-run/3")
    expect(run.tests[0].journal[1]).toEqual(chainTimeEntry)
    expect(md).toContain(
      "2. chain time +3,600 s → 2026-09-26T07:02:02Z (block 11584664)",
    )
    expect(md).not.toContain("data: undefined")
  })

  /** A subgraph that knows the pinned market (deployed before the fork) — no network in jest. */
  const factsFetch = (async (_url: unknown, init?: { body?: string }) => {
    const body = JSON.parse(init?.body ?? "{}") as { query?: string }
    if (!body.query) return { ok: true, json: async () => ({}) } // chain-lead RPC: no result
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          markets: [
            {
              id: MARKET,
              name: "TEST DAI KW 3 Dai Stablecoin",
              symbol: "twDAI",
              deployedEvent: {
                blockNumber: "11000000",
                transactionHash: "0xold",
              },
              asset: {
                address: `0x${"7".repeat(40)}`,
                symbol: "DAI",
              },
              hooks: { kind: "OpenTerm" },
              hooksConfig: {
                depositRequiresAccess: false,
                transfersDisabled: false,
              },
              marketKind: "STANDARD",
            },
          ],
        },
      }),
    }
  }) as never

  it("uat-run/3: run.json carries the market index, derived at run time", async () => {
    globalThis.fetch = factsFetch
    const { run } = await writeRun("3", [stepEntry, chainTimeEntry, txEntry])
    expect(run.markets).toHaveLength(1)
    const [m] = run.markets
    expect(m).toMatchObject({
      address: MARKET,
      name: "TEST DAI KW 3 Dai Stablecoin",
      origin: "forked",
      forkBlock: run.meta.forkBlock,
      derivedAt: "run",
    })
    expect(m.type).toEqual({
      term: "open-term",
      kind: "standard",
      asset: `DAI 0x${"7".repeat(40)}`,
      config: { depositRequiresAccess: false, transfersDisabled: false },
    })
    expect("parameters" in m).toBe(false)
    expect(
      m.txs.map((t: { kind: string; seq: number }) => [t.seq, t.kind]),
    ).toEqual([
      [1, "chain-time"],
      [2, "tx"],
    ])
    expect(m.txs[1]).toMatchObject({
      row: "LEN-18",
      anchor: "uat-LEN-18",
      hash: txEntry.hash,
      status: "success",
    })
  })

  it("uat-run/3 offline: the pinned market still classifies forked; the report still renders", async () => {
    const { run } = await writeRun("3", [stepEntry, txEntry])
    expect(run.markets).toHaveLength(1)
    expect(run.markets[0]).toMatchObject({ address: MARKET, origin: "forked" })
    expect(existsSync(join(dir, "uat-report", "index.html"))).toBe(true)
  })

  it("uat-run/3: a bug in the index is logged, never fatal — run.json and the report still land", async () => {
    const buggy = { id: MARKET }
    Object.defineProperty(buggy, "name", {
      enumerable: true,
      get() {
        throw new TypeError("bug in the facts merge")
      },
    })
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      const body = JSON.parse(init?.body ?? "{}") as { query?: string }
      if (!body.query || body.query.includes("hooksInstances"))
        return { ok: true, json: async () => ({}) }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { markets: [buggy] } }),
      }
    }) as never
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    try {
      const { run } = await writeRun("3", [stepEntry, txEntry])
      expect(run.schema).toBe("uat-run/3")
      expect(run.markets).toBeUndefined()
      expect(existsSync(join(dir, "uat-report", "index.html"))).toBe(true)
      expect(
        warn.mock.calls.some(
          (c) =>
            c[0] === "[summaryReporter] market index skipped:" &&
            c[1] instanceof TypeError,
        ),
      ).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })

  it("uat-run/2: no market index, whatever the subgraph says", async () => {
    globalThis.fetch = factsFetch
    const { run } = await writeRun("2", [stepEntry, txEntry])
    expect(run.markets).toBeUndefined()
    expect("markets" in run).toBe(false)
  })
})
