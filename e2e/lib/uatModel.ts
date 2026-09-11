/* eslint-disable no-nested-ternary, no-restricted-syntax */
/**
 * run.json v2 ("uat-run/2"): the shape summaryReporter writes and uatReport/compare read.
 *
 * Pure by contract — no fs, no network, no @playwright/test import — so both branches' jest
 * suites can exercise every derivation without a runner. The one import is type-only and is
 * erased at compile time.
 */
import type { EnrichedTx } from "./txDecode"

export type UatJournalEntry = {
  at: string
  kind: "step" | "nav" | "tx" | "data"
  name?: string
  url?: string
  hash?: string
  status?: string
  block?: string
  gasUsed?: string
  fn?: string
  data?: unknown
  blockStart?: string
  blockEnd?: string
  from?: string
  to?: string
  functionName?: string
  args?: readonly unknown[]
  input?: string
  source?: string
  duringStep?: string
  enriched?: EnrichedTx
}

/** Playwright annotation: test.skip/fixme/fail carry their reason in `description`. */
export type UatAnnotation = { type: string; description?: string }

/**
 * What the row MEANS, as opposed to Playwright's raw status:
 *  - expected-failure  a test.fail() row that failed as documented (KNOWN-ISSUES blocker)
 *  - unexpected-pass   a test.fail() row that PASSED — the documented defect is gone, or the
 *                      test no longer exercises it. Always loud.
 *  - did-not-run       a serial-suite tail that never executed because an earlier row failed
 *  - skipped           test.skip/fixme, or a runtime precondition, with a reason
 */
export type Outcome =
  | "passed"
  | "expected-failure"
  | "unexpected-pass"
  | "failed"
  | "skipped"
  | "did-not-run"
  | "flaky"

export type UatTest = {
  /** UAT id parsed from the title; null for setup:/teardown:/smoke rows. Pairing key. */
  uatId: string | null
  /** Runsheet page, from the id's prefix; filled from the suite for unprefixed rows. */
  page: number | null
  title: string
  /** Spec file, repo-relative. */
  file: string
  suite: string
  status: string
  expectedStatus: string
  outcome: Outcome
  /**
   * Protocol generation the row exercised. W2 never sets it — the reporter has no branch-safe
   * source for it, and inventing one would mean importing app code. Declared, rather than added
   * later, so the board-honesty work that needs a per-row generation column can fill it in without
   * re-opening this schema and invalidating every archived run.
   */
  generation?: "V2" | "V2.1" | "V2.5" | "legacy-pin"
  annotations: UatAnnotation[]
  /** For did-not-run: the id (or title) of the earlier failure that stopped this row. */
  blockedBy?: string
  /** True when `blockedBy` is in a DIFFERENT suite — a run-wide stop, not serial fallout. */
  blockedAcrossSuites?: boolean
  durationMs: number
  startedAt?: string
  retry?: number
  failedDuring?: { kind: string; name?: string; index?: number }
  errorHead?: string
  errorDetail?: string
  errorStack?: string
  journal: UatJournalEntry[]
  stepShots: { name: string; file: string }[]
  failureShot?: string
  video?: string
  videoTrimmedLeadSeconds?: number
  tracePath?: string
  failureState?: Record<string, unknown>
  agreements: { name: string; json: unknown }[]
}

export type RunMeta = {
  appCommit: string
  appDirty: boolean
  appDirtyFiles: number
  /** .next/BUILD_ID when the app was built (absent under `next dev`). */
  buildId?: string
  /**
   * Build kind, set only when derived from something app-side. The reporter runs in the
   * Playwright process, not the app under test, so its own NODE_ENV cannot tell dev from prod —
   * this stays undefined until there is an app-side signal to read it from.
   */
  build?: "dev" | "prod"
  sdk: string
  subgraphName: string
  subgraphDeployment: string
  forkBlock: number
  /** sha256 of harness/fork/pins.json's bytes — the fixture set this board ran against. */
  pinsSha256: string
  /**
   * The app's test-mode polling cadence, when the harness exposes it. W2 leaves it undefined:
   * the values live in `src/config/polling.ts` (derived from NEXT_PUBLIC_TEST_MODE, not from
   * env vars of their own) and `e2e/lib/env.ts` does not re-export them, so the only way to
   * read them would be an import from `src/` — forbidden by the both-branches constraint.
   * Declared so a later week can fill it once env.ts exposes the two numbers.
   */
  pollingMs?: { ui: number; indexed: number }
  chainBlockStart?: number
  chainBlockEnd?: number
  /** Fork clock minus wall clock, in seconds (H1: the fork clock is one-way). */
  chainLeadSecondsStart?: number
  chainLeadSecondsEnd?: number
  testMode: boolean
  /**
   * True only when the board script actually loaded `harness/fork/.env.fork` into this process
   * (the `board`/`board:one` npm scripts export `WILDCAT_ENV_FORK_APPLIED=1` when they do).
   * `testMode` above is read from `process.env.NEXT_PUBLIC_TEST_MODE` regardless, so on its own it
   * cannot tell "the app had test mode off" from "this process never saw the app's env at all" —
   * the renderer must not show `testMode` as an observed on/off value unless this is true.
   */
  envApplied?: boolean
  pwVideo?: string
  argv: string[]
  /** "full" = the whole board (optionally with the documented `--grep-invert "BOP-14"` exclusion,
   *  which matches BOTH slow time-jump rows — BOP-14 and BOP-14b — by prefix). */
  mode: "full" | "targeted"
  /** Repo-relative path of this run's immutable archive under uat-runs/. */
  archiveDir?: string
}

export type UatRun = {
  schema: "uat-run/2"
  status: string
  startedAt?: string
  durationMs?: number
  meta: RunMeta
  tests: UatTest[]
}

/**
 * The UAT id at the head of a title. Covers every shape the two suites use:
 * LEN-07b, BOP-16b, BOP-06-UI, MKT-M01, V2P-09, M5. `setup:`/`teardown:`/smoke rows do not match.
 */
export const UAT_ID_RE =
  /^(M\d+|[A-Z][A-Z0-9]{1,3}-M?\d{1,3}[a-z]?(?:-[A-Z]{2,3})?)(?=[:\s]|$)/

export const parseUatId = (title: string): string | null => {
  const m = UAT_ID_RE.exec(title.trim())
  return m ? m[1] : null
}

export const MAIN_ONLY_PROTOCOL_PAGE = 90
export const MAIN_ONLY_PROBE_PAGE = 91
export const UNCLASSIFIED_PAGE = 92
export const HARNESS_PAGE = 99

/** Runsheet pages, in report order. 90+ are not runsheet pages; they sort last. */
export const RUNSHEET_PAGES: {
  page: number
  label: string
  prefixes: string[]
}[] = [
  { page: 1, label: "1 Admin", prefixes: ["ADM"] },
  { page: 2, label: "2 Borrower Onboarding", prefixes: ["BON"] },
  { page: 3, label: "3 Market Creation", prefixes: ["MKT"] },
  { page: 4, label: "4 Borrower Ops", prefixes: ["BOP"] },
  { page: 5, label: "5 Lender Flows", prefixes: ["LEN"] },
  { page: 6, label: "6 Wrappers", prefixes: ["WRP"] },
  { page: 7, label: "7 Wallet Matrix", prefixes: ["WAL"] },
  { page: 10, label: "10 Edge & Regression", prefixes: ["EDG"] },
  {
    page: MAIN_ONLY_PROTOCOL_PAGE,
    label: "Protocol suite (main only)",
    prefixes: ["V2P"],
  },
  {
    page: MAIN_ONLY_PROBE_PAGE,
    label: "Defect probes (main only)",
    prefixes: [],
  },
  { page: UNCLASSIFIED_PAGE, label: "Unclassified ids", prefixes: [] },
  {
    page: HARNESS_PAGE,
    label: "Harness rows (setup / teardown / smoke)",
    prefixes: [],
  },
]

export type SuitePageOverride = {
  suiteTitle: string
  page: number
  note: string
}

/**
 * Suites where NO row carries a UAT id, yet the rows are real runsheet coverage. Without this
 * table `assignPages` files every one of their rows under HARNESS_PAGE — "Harness rows (setup /
 * teardown / smoke)" — which is a lie about five real lender tests.
 *
 * This table does NOT invent UAT ids: the rows keep `uatId: null` and stay unpaired in the
 * overlay. Giving them runsheet ids is an owner decision, recorded as a follow-up in this plan's
 * Self-review. `fork.smoke.spec.ts` is deliberately NOT here — it really is a smoke suite and
 * belongs under the harness page.
 *
 * Match is on any segment of the reporter's `suite` string (`"<file> › <describe> › …"`), so the
 * key is the describe title exactly as the spec file writes it.
 */
export const SUITE_PAGE_OVERRIDES: SuitePageOverride[] = [
  {
    suiteTitle: "lender withdrawal: queue → expiry → claim",
    page: 5,
    note: "(unnumbered lifecycle suite, predates the runsheet ids)",
  },
]

export const suitePageOverride = (
  suite: string,
): SuitePageOverride | undefined =>
  SUITE_PAGE_OVERRIDES.find((o) => suite.split(" › ").includes(o.suiteTitle))

export const runsheetPageOf = (uatId: string | null): number | null => {
  if (!uatId) return null
  if (/^M\d+$/.test(uatId)) return MAIN_ONLY_PROBE_PAGE
  if (/^[A-Z][A-Z0-9]{1,3}-M\d/.test(uatId)) return MAIN_ONLY_PROTOCOL_PAGE
  const prefix = uatId.slice(0, uatId.indexOf("-"))
  return (
    RUNSHEET_PAGES.find((p) => p.prefixes.includes(prefix))?.page ??
    UNCLASSIFIED_PAGE
  )
}

export const pageLabel = (page: number): string =>
  RUNSHEET_PAGES.find((p) => p.page === page)?.label ?? `page ${page}`

/**
 * Playwright reports `status` (what happened) and `expectedStatus` (what the annotations said
 * should happen) separately; neither alone distinguishes a documented blocker from a board
 * failure, nor a fixed defect from an ordinary green.
 */
export const deriveOutcome = (r: {
  status: string
  expectedStatus: string
  retry?: number
}): Outcome => {
  // `status` is "passed"|"failed"|"timedOut"|"skipped"|"interrupted"
  // (playwright/types/testReporter.d.ts:669). "interrupted" — a Ctrl-C, or a worker the runner
  // tore down — falls through to "failed" and paints the row red. That is deliberate: an
  // interrupted row is NOT evidence the behaviour works, and a board with red in it is not a run
  // of record. The board check (Task 8) refuses the run on either count, so the colour never
  // decides anything on its own.
  if (r.status === "skipped") return "skipped"
  if (r.expectedStatus === "failed")
    return r.status === "passed" ? "unexpected-pass" : "expected-failure"
  if (r.status === "passed") return (r.retry ?? 0) > 0 ? "flaky" : "passed"
  return "failed"
}

/** The reason a row was skipped/fixmed/failed on purpose, as the test author wrote it. */
export const annotationReason = (
  annotations: UatAnnotation[],
): string | undefined =>
  annotations.find(
    (a) => ["skip", "fixme", "fail"].includes(a.type) && a.description,
  )?.description

/**
 * True for a DECLARED `test.skip(...)`/`test.fixme(...)` row, with or without a reason string.
 * `test.fixme("WAL-01: …", fn)` / `test.skip("WAL-01: …", fn)` annotate the row (`{ type: "fixme"
 * }`, no `description`) but never execute it — Playwright reports `status: "skipped"`, `duration:
 * 0`, exactly like the mass-skipped tail of a stopped serial suite. `annotationReason` alone
 * cannot tell the two apart because it requires a description; this checks the annotation TYPE
 * instead, so a bare declared skip/fixme is never mistaken for run fallout.
 */
export const hasDeclaredSkip = (annotations: UatAnnotation[]): boolean =>
  annotations.some((a) => a.type === "skip" || a.type === "fixme")

/**
 * A serial suite stops at its first failure and Playwright reports the tail as `skipped` with no
 * annotation and zero duration — indistinguishable from a deliberate skip on the page. Re-label
 * those rows and name the failure that stopped them. Mutates `tests` in place (run order).
 *
 * INVARIANT this keys on: `suite` is `test.titlePath().slice(2)` minus the title, i.e.
 * `"<file> › <describe> › …"`, whereas Playwright computes serial fallout on the OUTERMOST serial
 * ancestor (playwright/lib/runner/dispatcher.js:438-443). The two agree only because every
 * `test.describe.serial` in both worktrees is TOP-LEVEL and there is exactly one per file —
 * verified 2026-09-11: 19 such files and 19 declarations on v2.5, 14 and 14 on main, zero indented.
 * Count it with a newline-tolerant pattern (`/test\s*\.\s*describe\s*\.\s*serial\s*\(/`): the
 * codebase also writes it as `test.describe\n  .serial(`, which a flat grep for the dotted form
 * misses. If a nested serial describe is ever added, the suite string stops being the serial group
 * and this attribution goes wrong.
 *
 * The two cases the invariant does NOT cover are a worker crash and a fatal error, which mass-skip
 * the tail of the ENTIRE run across suite boundaries (dispatcher.js:412, :422). The run-wide
 * fallback below catches those: if a candidate row's own suite never failed, but the last failure
 * anywhere in the run was the LAST row its own suite reported, the stop crossed the suite boundary
 * and that failure is the blocker. `blockedAcrossSuites` records which case applied so the report
 * can word the reason honestly.
 *
 * A DECLARED skip/fixme row (see `hasDeclaredSkip`) is excluded from both branches: its outcome is
 * `skipped` no matter what failed around it, annotated or not.
 */
export const attributeDidNotRun = (tests: UatTest[]): void => {
  const lastIndexOfSuite = new Map<string, number>()
  tests.forEach((t, i) => lastIndexOfSuite.set(t.suite, i))

  const blocker = new Map<string, string>()
  let runBlocker: { id: string; suite: string; index: number } | undefined
  tests.forEach((t, i) => {
    if (
      t.outcome === "skipped" &&
      t.durationMs === 0 &&
      !annotationReason(t.annotations) &&
      !hasDeclaredSkip(t.annotations)
    ) {
      const by = blocker.get(t.suite)
      if (by) {
        t.outcome = "did-not-run"
        t.blockedBy = by
      } else if (
        runBlocker &&
        runBlocker.index === lastIndexOfSuite.get(runBlocker.suite)
      ) {
        t.outcome = "did-not-run"
        t.blockedBy = runBlocker.id
        t.blockedAcrossSuites = true
      }
    }
    if (t.outcome === "failed") {
      if (!blocker.has(t.suite)) blocker.set(t.suite, t.uatId ?? t.title)
      runBlocker = { id: t.uatId ?? t.title, suite: t.suite, index: i }
    }
  })
}

/**
 * Rows with no UAT id (setup:/teardown:/smoke) are filed under their own suite's page, taken from
 * a sibling row that HAS an id. A suite where no row has an id falls back to SUITE_PAGE_OVERRIDES,
 * then to HARNESS_PAGE.
 */
export const assignPages = (tests: UatTest[]): void => {
  const bySuite = new Map<string, number>()
  for (const t of tests)
    if (t.page !== null && !bySuite.has(t.suite)) bySuite.set(t.suite, t.page)
  for (const t of tests)
    if (t.page === null)
      t.page =
        bySuite.get(t.suite) ?? suitePageOverride(t.suite)?.page ?? HARNESS_PAGE
}

/** Report order: the things that need a decision first. */
export const OUTCOME_ORDER: Outcome[] = [
  "failed",
  "unexpected-pass",
  "did-not-run",
  "expected-failure",
  "flaky",
  "skipped",
  "passed",
]

export const countByOutcome = (tests: UatTest[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const t of tests) counts[t.outcome] = (counts[t.outcome] ?? 0) + 1
  return counts
}

export type PageGroup = {
  page: number
  label: string
  counts: Record<string, number>
  suites: { suite: string; tests: UatTest[] }[]
}

/** Sections by runsheet page (runsheet order), then by suite (first-appearance order). */
export const groupByPage = (tests: UatTest[]): PageGroup[] => {
  const pages = new Map<number, Map<string, UatTest[]>>()
  for (const t of tests) {
    const page = t.page ?? HARNESS_PAGE
    if (!pages.has(page)) pages.set(page, new Map())
    const suites = pages.get(page)!
    if (!suites.has(t.suite)) suites.set(t.suite, [])
    suites.get(t.suite)!.push(t)
  }
  return [...pages.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([page, suites]) => {
      const flat = [...suites.values()].flat()
      return {
        page,
        label: pageLabel(page),
        counts: countByOutcome(flat),
        suites: [...suites.entries()].map(([suite, ts]) => ({
          suite,
          tests: ts,
        })),
      }
    })
}
