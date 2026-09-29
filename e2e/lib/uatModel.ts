/* eslint-disable no-nested-ternary, no-restricted-syntax */
/**
 * run.json ("uat-run/2", and "uat-run/3" under UAT_RUN_SCHEMA=3): the shape summaryReporter
 * writes and uatReport/compare read.
 *
 * `uat-run/3` adds exactly four things to `uat-run/2` (capability-ledger SCHEMA.md §5.1) and
 * changes nothing else, so every v2 consumer keeps working: per-row `requirements`, per-row
 * `observations`, the `infra` marker, and `req` on a journal `step` entry. `emitObservations`
 * below is the emission algorithm of §5.1 rules 1-7, and it is pure so the jest suite can
 * exercise every branch of it without a runner.
 *
 * Pure by contract — no fs, no network, no @playwright/test import — so both branches' jest
 * suites can exercise every derivation without a runner. The one import is type-only and is
 * erased at compile time.
 */
import type { EnrichedTx } from "./txDecode"

export type UatJournalEntry = {
  at: string
  kind: "step" | "nav" | "tx" | "data" | "chain-time"
  name?: string
  /** uat-run/3: the requirement ids this step() checkpoint asserts (SCHEMA.md §5.1 rule 1).
   *  Only ever set on `kind: "step"`. A step with no `req` asserts nothing the ledger names —
   *  arrange, navigation, teardown — and produces no observation of its own. */
  req?: string[]
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
  /** uat-run/3 `chain-time`: the jump requested, and the chain timestamps either side of it. */
  seconds?: number
  fromTs?: number
  toTs?: number
}

/**
 * uat-run/3: a chain-time change the run applied (`advanceTime` in lib/env.ts). `block` is the head
 * after the mine, so the entry can be ordered against the transactions around it.
 */
export type ChainTimeEntry = {
  at: string
  kind: "chain-time"
  seconds: number
  fromTs?: number
  toTs?: number
  block?: string
}

/** "chain time +3,600 s → 2026-09-26T07:02:02Z" — the one wording every artefact uses. */
export const chainTimeText = (e: {
  seconds?: number
  toTs?: number
}): string => {
  const s = Number(e.seconds ?? 0)
  const grouped = String(Math.abs(Math.trunc(s))).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  )
  const head = `chain time ${s < 0 ? "−" : "+"}${grouped} s`
  return typeof e.toTs === "number" && Number.isFinite(e.toTs)
    ? `${head} → ${new Date(e.toTs * 1000).toISOString().replace(".000Z", "Z")}`
    : head
}

/** One transaction (or chain-time change) in a market's history, in run order. */
export type MarketTx = {
  /** 1-based, run order; restarts per market. */
  seq: number
  /** uatId, or the title for a row without one. */
  row: string
  /** Exactly `anchorOf(test)` in uatReport.ts — the link target. */
  anchor: string
  /** Step name (enriched.during ?? duringStep). */
  during?: string
  block?: string
  /** Account label from the address book, else the address. */
  from?: string
  /** enriched.call, else `fn(args)`, else `selector 0x…`; chain-time rows carry their text here. */
  call: string
  status?: "success" | "reverted"
  hash?: string
  kind: "tx" | "chain-time"
}

/**
 * A market's type as the subgraph sees it, and ONLY the config relevant to that type:
 *   fixed-term    maturity (ISO), allowClosureBeforeTerm, allowTermReduction
 *   periodic-term periodDuration, withdrawalWindowDuration (seconds), firstWithdrawalWindowStart (ISO)
 *   revolving     commitmentFeeBips (when the subgraph returns it)
 *   every market  depositRequiresAccess, transfersDisabled
 * `term` is "unknown" when the facts carry no hooks kind; `kind` is absent on a subgraph without
 * `marketKind` (main's v2.1.x).
 */
export type MarketType = {
  term: "open-term" | "fixed-term" | "periodic-term" | "unknown"
  kind?: "standard" | "revolving"
  /** "<symbol> <address>" */
  asset?: string
  config: Record<string, string | number | boolean>
}

/** uat-run/3: where a market the run transacted with came from, and what the run did to it. */
export type MarketIndexEntry = {
  address: string
  name?: string
  origin: "forked" | "created" | "unknown"
  /** origin forked. */
  forkBlock?: number
  /** origin created AND the creating tx is in this run's journal; absent ⇒ created after the fork
   *  outside this run's journal. */
  createdBy?: { row: string; anchor: string; block: string; txHash: string }
  /** The market's type and the config relevant to it, from the subgraph; absent without facts. */
  type?: MarketType
  txs: MarketTx[]
  /** Reporter onEnd ("run") vs the render-report fallback ("render"). */
  derivedAt: "run" | "render"
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

/**
 * uat-run/3 (SCHEMA.md §5.1): ONE result for ONE requirement — or, for `unattributed`, one
 * result for a failure that belongs to no requirement the row attributed.
 *
 * An observation is identified by `(requirementId, stepIndex)`: the emission algorithm writes one
 * per (journal step carrying `req`, id in that `req`) pair, so two steps that both declare the
 * same id produce two observations and the ledger folds both.
 */
export type UatObservation = {
  /** null ONLY when status is "unattributed": the failure belongs to no requirement. */
  requirementId: string | null
  status: "pass" | "fail" | "skipped" | "not-run" | "unattributed"
  /** "step" whenever status is "fail"; "row" whenever it is "unattributed". */
  attribution: "step" | "row"
  /** Required when attribution is "step". On an "unattributed" observation it names the step the
   *  row FELL OVER in, and only when that step declared no requirement (rule 6, second case). */
  step?: string
  /** Required when attribution is "step" — with requirementId it is the observation's KEY.
   *  Never carried by an "unattributed" observation: it indexes no attributed assertion. */
  stepIndex?: number
  /** The expect(…, "<message>") message this observation reports on. */
  assertion?: string
  /** The expect(…, "<message>") message that FAILED; only ever on a `fail`. */
  failedAssertion?: string
  /** The error's first line, capped at OBSERVATION_ERROR_CAP characters. */
  error?: string
  /** Skip reason, from the row's own skip/fixme/fail annotation. */
  reason?: string
  /** The row that stopped this one (serial fallout). */
  blockedBy?: string
}

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
  /**
   * uat-run/3: the row-level declaration, parsed from the `requirements` annotation
   * (SCHEMA.md §5.1 rule 2). `[]` on an infra row, and `[]` beside `needsAnnotation` on a
   * functional row that carries no declaration at all. Absent on a uat-run/2 archive.
   */
  requirements?: string[]
  /**
   * uat-run/3: true when a FUNCTIONAL row (one with no `infra` marker) declared nothing. The
   * declaration is required, not optional — this is what makes an absent one visible instead of
   * reading as "this row is about no behaviour". run.schema.json puts no constraint on extra
   * row fields, so carrying it costs the archive nothing.
   */
  needsAnnotation?: boolean
  /** uat-run/3: the per-requirement results, from `emitObservations` (SCHEMA.md §5.1). */
  observations?: UatObservation[]
  /**
   * uat-run/3: set from the `infra` annotation. An infra row asserts no product behaviour, so it
   * declares nothing and observes nothing.
   */
  infra?: "setup" | "teardown" | "smoke"
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
  schema: "uat-run/2" | "uat-run/3"
  status: string
  startedAt?: string
  durationMs?: number
  meta: RunMeta
  tests: UatTest[]
  /** uat-run/3 only: the market provenance index (lib/marketIndex.ts). */
  markets?: MarketIndexEntry[]
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

// ---------------------------------------------------------------------------------------------
// uat-run/3: declaration and emission (capability-ledger SCHEMA.md §5.1)
// ---------------------------------------------------------------------------------------------

/**
 * The id shape `run.schema.json` enforces. It is checked at DECLARATION time (`requirements()` in
 * `e2e/lib/step.ts`) and never while reading an archive: `parseRequirements` keeps an unknown id
 * verbatim, because deciding that `REQ-XXX-999` is nobody's requirement is L019/L050's job. The
 * SHAPE is a different question — a malformed id fails L051, and once L051 fails for a version
 * L052-L058, L061 and L062 all report `skipped: schema invalid` for it, so one typo in a spec
 * costs the whole run rather than producing one finding.
 */
export const REQUIREMENT_ID_RE = /^REQ-[A-Z]{3,5}-[0-9]{3}$/

/** The annotation type a row declares its requirements with. */
export const REQUIREMENTS_ANNOTATION = "requirements"
/** The annotation type an infrastructure row marks itself with. */
export const INFRA_ANNOTATION = "infra"
/** `error` on an observation is the failure's first line, capped. */
export const OBSERVATION_ERROR_CAP = 2_000

/**
 * The row-level declaration (SCHEMA.md §5.1 rule 2): the ids of the `requirements` annotation,
 * split on "," and trimmed, in declaration order with duplicates collapsed.
 *
 * Unknown ids are kept VERBATIM. Deciding that `REQ-XXX-999` is not a requirement anybody wrote
 * is the validator's job (L019/L050), not the reporter's: a reporter that silently drops what it
 * does not recognise turns a typo into "this row declared nothing".
 */
export const parseRequirements = (annotations: UatAnnotation[]): string[] => {
  const ids: string[] = []
  for (const a of annotations)
    if (a.type === REQUIREMENTS_ANNOTATION)
      for (const raw of (a.description ?? "").split(",")) {
        const id = raw.trim()
        if (id && !ids.includes(id)) ids.push(id)
      }
  return ids
}

/**
 * The infra marker (SCHEMA.md §5.1 rule 2): `{ type: "infra", description: "setup" | "teardown" |
 * "smoke" }`. The vocabulary is closed — an `infra` annotation spelled any other way does NOT
 * exempt the row, because the exemption is what lets a row declare nothing, and a row that
 * exempts itself with a word the schema does not contain has not said which kind of infra it is.
 */
export const infraKindOf = (annotations: UatAnnotation[]): UatTest["infra"] => {
  for (const a of annotations)
    if (a.type === INFRA_ANNOTATION) {
      const kind = a.description?.trim()
      if (kind === "setup" || kind === "teardown" || kind === "smoke")
        return kind
    }
  return undefined
}

/**
 * The 1-based position, among a journal's `kind: "step"` entries, of the `ordinal`-th entry named
 * `name` (`ordinal` 1-based). 0 when the journal has no such entry.
 *
 * This is the pairing of SCHEMA.md §5.1 rule 2: a failure site Playwright reports is an index into
 * the flattened `test.step` list, but every rule the ledger checks indexes the JOURNAL, and the
 * two sequences differ as soon as a raw `test.step()` (one that records no journal entry) is used.
 * Pairing by (name, ordinal) turns the one into the other.
 */
export const journalStepIndexOf = (
  journal: UatJournalEntry[],
  name: string | undefined,
  ordinal: number,
): number => {
  const steps = journal.filter((e) => e.kind === "step")
  let seen = 0
  const position = steps.findIndex((e) => {
    if (e.name !== name) return false
    seen += 1
    return seen === ordinal
  })
  return position + 1
}

/**
 * Text that Playwright, not a test author, wrote. `failedAssertion` is what a defect signature's
 * `assertion` is matched against (SCHEMA.md §5.4), so admitting matcher or timeout boilerplate
 * would let one signature be satisfied by text that dozens of unrelated failures share — the
 * error's first line is very often the matcher's own rendering, not a message anybody chose.
 *
 * These are the shapes seen on the archived boards, plus the API-call and strict-mode renderings
 * from the same family:
 *
 *   Error: Timed out 90000ms waiting for expect(locator).toBeVisible()
 *   Error: expect(received).toEqual(expected) // deep equality
 *   Test timeout of 240000ms exceeded.
 *   Error: locator.click: Timeout 10000ms exceeded.
 *   Error: strict mode violation: getByRole('button') resolved to 3 elements
 */
const PLAYWRIGHT_BOILERPLATE = [
  /^expect[.(]/,
  /^Timed out \d+\s*m?s (?:waiting for|from) /,
  /^Test timeout of /,
  /^Timeout \d+\s*m?s exceeded/,
  /^strict mode violation\b/,
  // "locator.click: …", "page.goto: …", "apiRequestContext.fetch: …" — an API call, not a message.
  /^(?:page|locator|frame|frameLocator|browser|browserContext|browserType|elementHandle|request|apiRequest|apiRequestContext|route|worker|download|fileChooser|keyboard|mouse|touchscreen|selectors|electron|android)\.[A-Za-z]+:/,
]

/**
 * SCHEMA.md §5.1 rule 8: the message argument of the failing `expect(…, "<message>")`, taken from
 * the error's first line when it is of the form `Error: <message>`; **absent when the assertion
 * carried no message**, which is the half that matters. A head with no `Error:` prefix carried no
 * message, and neither did one whose text is Playwright's own matcher or timeout rendering — that
 * is the string the matcher prints when `expect()` was called WITHOUT a message argument.
 *
 * Capped like `error`: the cap is what keeps one runaway head out of every consumer that prints an
 * observation, and a signature matching on 2 000 characters of it is already matching on too much.
 */
export const failedAssertionOf = (
  errorHead: string | undefined,
): string | undefined => {
  const m = /^Error:\s*(.+)$/.exec(errorHead?.trim() ?? "")
  const message = m?.[1].trim()
  if (!message) return undefined
  if (PLAYWRIGHT_BOILERPLATE.some((re) => re.test(message))) return undefined
  return message.slice(0, OBSERVATION_ERROR_CAP)
}

const cappedError = (errorHead: string | undefined) =>
  errorHead ? errorHead.slice(0, OBSERVATION_ERROR_CAP) : undefined

/**
 * The emission algorithm of SCHEMA.md §5.1, rules 1-7 — pure, so every branch is unit-testable.
 *
 * It reads only what the archive itself carries: the row's declaration, its `journal` (whose
 * `kind: "step"` entries ARE the sequence `stepIndex` indexes into), its RESOLVED failure site and
 * its execution `outcome`. Nothing is inferred and nothing is spread: a failure that no attributed
 * assertion owns is recorded as itself, once, under `unattributed` — never as one manufactured
 * failure per declared id, which is the shape that turned one setup failure into eight broken
 * capabilities.
 *
 * CALLED IN onEnd, not onTestEnd, although §5.1 describes it as the latter. Rule 5 needs the
 * row's FINAL outcome, and `did-not-run` (with the `blockedBy` it carries) is only settled by
 * `attributeDidNotRun`, which cannot run until the whole run has been seen. Every input it reads
 * is already on the UatTest by then, so the result is the same algorithm on the same data.
 */
export const emitObservations = (t: UatTest): UatObservation[] => {
  // An infra row asserts no product behaviour, so it declares nothing and observes nothing.
  if (t.infra) return []

  const declared = t.requirements ?? []
  const steps = t.journal.filter((e) => e.kind === "step")

  // Rule 5 — a row that never executed. One observation per DECLARED id, at row level. "This row
  // did not run" is the same fact for every behaviour it would have exercised, and it is never a
  // pass.
  if (t.outcome === "skipped" || t.outcome === "did-not-run") {
    const reason = annotationReason(t.annotations)
    return declared.map((requirementId) =>
      t.outcome === "skipped"
        ? {
            requirementId,
            status: "skipped" as const,
            attribution: "row" as const,
            ...(reason ? { reason } : {}),
          }
        : {
            requirementId,
            status: "not-run" as const,
            attribution: "row" as const,
            ...(t.blockedBy ? { blockedBy: t.blockedBy } : {}),
          },
    )
  }

  const rowFailed = t.outcome === "failed" || t.outcome === "expected-failure"
  /** The row's capped error head — computed once; every observation that carries one carries it. */
  const error = cappedError(t.errorHead)

  // Resolve the failure site against the journal BEFORE reading anything out of it: a `kind:
  // "step"` site must name a `kind: "step"` journal entry at its own 1-based index, or there is
  // no executed checkpoint for the failure to be attributed to.
  const site = rowFailed ? t.failedDuring : undefined
  let failing: number | undefined
  if (site?.kind === "step" && typeof site.index === "number") {
    const entry = steps[site.index - 1]
    if (entry && entry.name === site.name) failing = site.index
  }

  // Rule 6, FIRST case — the row failed outside every step(): `arrange`, `hook`, `fixture`,
  // `between`, `teardown`, `unknown`, or a `step` site the journal cannot account for. Nothing
  // about the row's steps was resolved, so they owe nothing and the whole row is exactly one
  // ownerless failure. It names no requirement and no step.
  if (rowFailed && failing === undefined)
    return [
      {
        requirementId: null,
        status: "unattributed",
        attribution: "row",
        ...(error ? { error } : {}),
      },
    ]

  // Rule 4 — one observation per (step carrying `req`, id in that `req`) pair.
  const observations: UatObservation[] = []
  steps.forEach((entry, i) => {
    const stepIndex = i + 1
    for (const requirementId of entry.req ?? []) {
      const status =
        failing === undefined || stepIndex < failing
          ? ("pass" as const)
          : stepIndex === failing
            ? ("fail" as const)
            : ("not-run" as const)
      const observation: UatObservation = {
        requirementId,
        status,
        attribution: "step",
        step: entry.name ?? "",
        stepIndex,
      }
      if (status === "fail") {
        const assertion = failedAssertionOf(t.errorHead)
        if (assertion) observation.failedAssertion = assertion
        if (error) observation.error = error
      }
      observations.push(observation)
    }
  })

  // Rule 6, SECOND case — the row fell over inside a named checkpoint that asserts nothing the
  // ledger names. The place is known even though the requirement is not, so the row carries
  // exactly one `unattributed` observation NAMING that step (and, per rule 4 above, the steps that
  // did declare `req` still report: `pass` before it, `not-run` after it).
  if (failing !== undefined && (steps[failing - 1].req ?? []).length === 0)
    observations.push({
      requirementId: null,
      status: "unattributed",
      attribution: "row",
      step: steps[failing - 1].name ?? "",
      ...(error ? { error } : {}),
    })

  // Rule 7 — the SINGLE-requirement row's row-level account, for a requirement no journal step
  // named. "Instead", not "as well": a row-level observation for a requirement some step already
  // declares is a second account of one result. It is a `pass` and never a `fail` — a row-level
  // observation reports on no attributed assertion, and only an attributed assertion owns a
  // failure — so a row that failed gets none at all. A MULTI-requirement row with an unnamed id is
  // an attribution error the validator reports (L058); emitting a row-level result for it here
  // would be the reporter papering over exactly what the check exists to find.
  if (!rowFailed && declared.length === 1) {
    const named = new Set(steps.flatMap((e) => e.req ?? []))
    if (!named.has(declared[0]))
      observations.push({
        requirementId: declared[0],
        status: "pass",
        attribution: "row",
      })
  }

  return observations
}

/**
 * Fill a row's uat-run/3 fields IN PLACE and return it: the infra marker and the row-level
 * declaration read off the row's own annotations, and the observations the emission algorithm
 * above derives from them.
 *
 * One function so the reporter and the jest suite exercise the same path — a declaration parsed
 * one way in the reporter and another in a test proves nothing about the archive either produces.
 */
export const declareAndObserve = (t: UatTest): UatTest => {
  const infra = infraKindOf(t.annotations)
  if (infra) t.infra = infra
  t.requirements = infra ? [] : parseRequirements(t.annotations)
  if (!infra && t.requirements.length === 0) t.needsAnnotation = true
  t.observations = emitObservations(t)
  return t
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
