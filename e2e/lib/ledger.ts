/* eslint-disable no-restricted-syntax, import/no-extraneous-dependencies, no-empty-pattern */
/**
 * The capability ledger, applied to a Playwright row.
 *
 * The owner's rule is that a spec asserts the DESIRED behaviour, identically on both versions, and
 * never carries `test.fail` / `test.skip` "because this version is broken / cannot run this / does
 * not owe this". Those three sentences are ledger facts, they differ per version, and a spec that
 * hard-codes one of them is a spec that has to be edited every time the ledger moves. So the
 * harness reads them out of the ledger at run time and applies them with Playwright's own
 * mechanisms:
 *
 *   expect-failure   `testInfo.fail(true, reason)`  — a documented defect on THIS version
 *   blocked          `testInfo.skip(true, reason)`  — coverage the ledger says cannot run here
 *   not-applicable   `testInfo.skip(true, reason)`  — this version does not owe the behaviour
 *   run              nothing                        — the ordinary case
 *
 * Everything above `applyDecision` is pure — no fs, no `@playwright/test` value import, no
 * `TestInfo` — so both branches' jest suites exercise every branch of every derivation without a
 * runner. `loadLedger` is the one loader; the fixture at the bottom is the one wiring.
 *
 * SHARED AND BRANCH-AGNOSTIC. This file is identical on `main` and on v2.5; the only thing that
 * differs is the value of `UAT_LEDGER_VERSION`, which the `board` script sets per branch. The
 * harness has no variant plumbing and learns its variant from nothing else.
 */
import { readFileSync } from "node:fs"

import type { Fixtures, TestInfo } from "@playwright/test"

import * as journal from "./journal"
import {
  failedAssertionOf,
  INFRA_ANNOTATION,
  OBSERVATION_ERROR_CAP,
  parseRequirements,
  type UatAnnotation,
  type UatJournalEntry,
} from "./uatModel"

/* ------------------------------------------------------------------ the ledger, as read ----- */

/** SCHEMA.md §2: what the version owes. */
export type ApplicabilityClass =
  | "required"
  | "intentionally-absent"
  | "intentionally-different"
/** SCHEMA.md §2: what the app actually does today. */
export type ImplementationClass = "conforming" | "known-defect" | "unknown"
/** SCHEMA.md §2: how we would find out. */
export type CoverageClass = "automated" | "manual" | "missing" | "blocked"
/** SCHEMA.md §2: has a named person signed off the RULING that a version does not owe this? */
export type ApplicabilityStatus = "proposed" | "approved"
/** SCHEMA.md §2: has a named person signed off the BEHAVIOUR itself? */
export type DesiredStatus = "candidate" | "approved"

/** SCHEMA.md §5.4. Every clause the signature states must match; an absent clause is not asserted. */
export type KnownIssueSignature = {
  requirementId: string
  step?: string
  assertion?: string
  errorPattern?: string
  /** 1..2000. The matcher never sees more than this many characters of the error. */
  maxLength: number
  verification?: {
    state: string
    run?: string
    matchedOn?: string
    reason?: string
  }
}

export type KnownIssueRef = {
  register?: string
  id: string
  signature: KnownIssueSignature
}

export type LedgerVersionEntry = {
  applicability: {
    class: ApplicabilityClass
    status?: ApplicabilityStatus
    reason?: string
  }
  implementation: {
    class: ImplementationClass
    knownIssue?: KnownIssueRef
    note?: string
  }
  coverage: {
    class: CoverageClass
    blockedBy?: { kind?: string; detail?: string }
    reason?: string
  }
}

export type LedgerRequirement = {
  id: string
  statement?: string
  desired?: { status?: DesiredStatus }
  versions?: Record<string, LedgerVersionEntry | undefined>
}

export type Ledger = {
  schema?: string
  areas?: Array<{
    id?: string
    capabilities?: Array<{ id?: string; requirements?: LedgerRequirement[] }>
  }>
}

/** The two versions the board compares. The harness knows its own only from `UAT_LEDGER_VERSION`. */
export type LedgerVersionId = "v25" | "main"

/** The env var naming the ledger file. Unset ⇒ the fixture is inert. */
export const LEDGER_PATH_ENV = "UAT_LEDGER"
/** The env var naming WHICH version this checkout is. Set by `board` / `board:one` per branch. */
export const LEDGER_VERSION_ENV = "UAT_LEDGER_VERSION"

export const ledgerVersionFrom = (
  raw: string | undefined,
): LedgerVersionId | undefined => {
  const v = raw?.trim()
  return v === "v25" || v === "main" ? v : undefined
}

/* --------------------------------------------------------------------------- the loader ----- */

/**
 * Read and shape-check a ledger. Throws on anything it cannot read: a board pointed at a ledger
 * it cannot parse has not been given a ledger, and saying so beats deriving `run` for every row
 * off an empty index. The FIXTURE catches and goes inert (nothing is ever excused by a ledger
 * that failed to load) — see `ledgerContext`.
 */
export const loadLedger = (path: string): Ledger => {
  let raw: string
  try {
    raw = readFileSync(path, "utf8")
  } catch (e) {
    throw new Error(
      `${LEDGER_PATH_ENV}=${path} could not be read: ${(e as Error).message}`,
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(
      `${LEDGER_PATH_ENV}=${path} is not JSON: ${(e as Error).message}`,
    )
  }
  if (typeof parsed !== "object" || parsed === null)
    throw new Error(`${LEDGER_PATH_ENV}=${path} is not a ledger object`)
  const ledger = parsed as Ledger
  if (!Array.isArray(ledger.areas))
    throw new Error(
      `${LEDGER_PATH_ENV}=${path} has no \`areas\` array — it is not a capability ledger`,
    )
  return ledger
}

const indexes = new WeakMap<Ledger, Map<string, LedgerRequirement>>()

/** `id -> requirement`, memoised per ledger object: a board indexes 704 requirements once. */
export const requirementIndex = (
  ledger: Ledger,
): Map<string, LedgerRequirement> => {
  const cached = indexes.get(ledger)
  if (cached) return cached
  const index = new Map<string, LedgerRequirement>()
  for (const area of ledger.areas ?? [])
    for (const capability of area.capabilities ?? [])
      for (const requirement of capability.requirements ?? [])
        if (requirement?.id && !index.has(requirement.id))
          index.set(requirement.id, requirement)
  indexes.set(ledger, index)
  return index
}

/* ------------------------------------------------------------- effectiveApplicability ----- */

/**
 * SCHEMA.md §5.2 — ONE function, called by every derivation, so a `proposed` ruling can never
 * behave like an approved one in one place and like `required` in another.
 *
 *   1. stored class is `required`                 -> required
 *   2. the ruling is `proposed` (unsigned)        -> required   (the version keeps owing it)
 *   3. the BEHAVIOUR is only a `candidate`        -> required   (an exemption from an unapproved
 *                                                                requirement is not yet a ruling)
 *   4. otherwise                                  -> the stored class
 *
 * In the current draft that returns `required` for all 704 entries, because every ruling is
 * `proposed` and every requirement is `candidate`. That is the correct, loud state for an
 * unapproved ledger, and it means this fixture changes nothing until somebody signs something.
 */
export const effectiveApplicability = (
  requirement: LedgerRequirement | undefined,
  entry: LedgerVersionEntry,
): ApplicabilityClass => {
  if (entry.applicability.class === "required") return "required"
  if (entry.applicability.status === "proposed") return "required"
  if (requirement?.desired?.status === "candidate") return "required"
  return entry.applicability.class
}

/* ---------------------------------------------------------------------- the derivation ----- */

export type RequirementExpectation = {
  requirementId: string
  /** False when the ledger names no such requirement, or names it with no entry for this version. */
  known: boolean
  /** What the ledger STORES — printed beside the effective class, per §5.2. */
  storedApplicability?: ApplicabilityClass
  applicabilityStatus?: ApplicabilityStatus
  /** What every derivation must use (§5.2). */
  effectiveApplicability?: ApplicabilityClass
  implementation?: ImplementationClass
  coverage?: CoverageClass
  /** Present exactly when `implementation` is `known-defect` and the entry resolves one. */
  knownIssue?: KnownIssueRef
  /** The blocker text, when `coverage` is `blocked`. */
  blockedBy?: string
}

export type LedgerDecisionKind =
  | "run"
  | "expect-failure"
  | "blocked"
  | "not-applicable"

export type LedgerDecision = {
  version: LedgerVersionId
  decision: LedgerDecisionKind
  reason: string
  requirements: RequirementExpectation[]
  /** Only on `expect-failure`: what a failure has to look like to be excused (§5.4). */
  knownIssues?: KnownIssueRef[]
}

/** The prefix every skip/fail reason carries, so a ledger decision is never mistaken for an author's. */
export const LEDGER_REASON_PREFIX = "ledger"
/** `not-applicable` and `blocked` are BOTH skips; the prefix is what tells them apart in a report. */
export const NOT_APPLICABLE_PREFIX = `${LEDGER_REASON_PREFIX}: not applicable`
export const BLOCKED_PREFIX = `${LEDGER_REASON_PREFIX}: blocked`
export const EXPECT_FAILURE_PREFIX = `${LEDGER_REASON_PREFIX}: known defect`

const blockerText = (entry: LedgerVersionEntry): string | undefined => {
  const by = entry.coverage.blockedBy
  if (!by) return entry.coverage.reason
  return [by.kind, by.detail].filter(Boolean).join(": ") || undefined
}

const expectationFor = (
  index: Map<string, LedgerRequirement>,
  version: LedgerVersionId,
  id: string,
): RequirementExpectation => {
  const requirement = index.get(id)
  const entry = requirement?.versions?.[version]
  if (!entry) return { requirementId: id, known: false }
  const knownIssue =
    entry.implementation.class === "known-defect"
      ? entry.implementation.knownIssue
      : undefined
  return {
    requirementId: id,
    known: true,
    storedApplicability: entry.applicability.class,
    applicabilityStatus: entry.applicability.status,
    effectiveApplicability: effectiveApplicability(requirement, entry),
    implementation: entry.implementation.class,
    coverage: entry.coverage.class,
    ...(knownIssue ? { knownIssue } : {}),
    ...(entry.coverage.class === "blocked"
      ? { blockedBy: blockerText(entry) }
      : {}),
  }
}

/**
 * The row-level decision, from the row's declared requirements and this version's entries.
 *
 * ORDER IS NORMATIVE, and it is §5.5's order, not a convenience:
 *
 *  1. `not-applicable` — EVERY declared requirement derives `intentionally-absent`. §5.5 puts
 *     R1a/R1b ABOVE R2a, so "this version does not owe the behaviour" outranks "this version has a
 *     defect in it": were the row to run and fail, R1b would call that an UNEXPECTED failure, and a
 *     harness that had marked it `test.fail` would have been asserting the opposite. Note that only
 *     §5.2 rule 4 can produce `intentionally-absent`, so this branch already requires an APPROVED
 *     ruling on an APPROVED requirement — a `proposed` ruling and a `candidate` behaviour both
 *     derive `required` and the row keeps running, which is the whole point of §5.2.
 *
 *     `intentionally-different` is deliberately NOT here. §5.2: "required and
 *     intentionally-different derive identically … it is the same obligation against a
 *     version-specific desired behaviour". The difference surfaces in what the test asserts, never
 *     in whether the version owes it, so skipping such a row would manufacture coverage debt
 *     against an obligation the ledger says stands.
 *
 *  2. `expect-failure` — ANY declared requirement is a `known-defect` here. Any, not all: a row
 *     that exercises one broken behaviour among five working ones still fails, and the failure is
 *     documented. The known issue's id and SIGNATURE travel with the decision, because a defect
 *     only excuses the failure it actually describes (§5.4) — see `checkSignature`.
 *
 *  3. `blocked` — EVERY declared requirement has `coverage: blocked` here. All, not any: if one
 *     declared behaviour can still be exercised the row has something to prove. Expect-failure
 *     wins over blocked, above: a documented defect is a statement about the app, a blocker is a
 *     statement about the harness, and the app's is the one worth recording.
 *
 *  4. `run` — everything else, including every id the ledger does not know. An unknown id is never
 *     grounds to skip or to excuse: deciding that `REQ-XXX-999` is nobody's requirement is the
 *     validator's job (L019/L050), and until it rules, the row runs and asserts.
 */
export const expectationsFor = (
  ledger: Ledger,
  version: LedgerVersionId,
  requirementIds: string[],
): LedgerDecision => {
  const index = requirementIndex(ledger)
  const requirements = requirementIds.map((id) =>
    expectationFor(index, version, id),
  )
  const base = { version, requirements }

  if (
    requirements.length > 0 &&
    requirements.every(
      (r) => r.effectiveApplicability === "intentionally-absent",
    )
  )
    return {
      ...base,
      decision: "not-applicable",
      reason: `${NOT_APPLICABLE_PREFIX} on ${version} — ${requirements
        .map((r) => `${r.requirementId} is intentionally-absent (approved)`)
        .join("; ")}`,
    }

  const defects = requirements.flatMap((r) =>
    r.implementation === "known-defect" ? [r] : [],
  )
  if (defects.length > 0) {
    const knownIssues = defects.flatMap((r) =>
      r.knownIssue ? [r.knownIssue] : [],
    )
    return {
      ...base,
      decision: "expect-failure",
      reason: `${EXPECT_FAILURE_PREFIX} on ${version} — ${defects
        .map(
          (r) =>
            `${r.requirementId}${
              r.knownIssue
                ? ` (${r.knownIssue.register ?? version}#${r.knownIssue.id})`
                : " (no known issue resolved)"
            }`,
        )
        .join("; ")}. A failure is only excused if it matches the signature.`,
      ...(knownIssues.length > 0 ? { knownIssues } : {}),
    }
  }

  if (
    requirements.length > 0 &&
    requirements.every((r) => r.coverage === "blocked")
  )
    return {
      ...base,
      decision: "blocked",
      reason: `${BLOCKED_PREFIX} on ${version} — ${requirements
        .map(
          (r) => `${r.requirementId}: ${r.blockedBy ?? "no blocker recorded"}`,
        )
        .join("; ")}`,
    }

  return {
    ...base,
    decision: "run",
    reason: `${LEDGER_REASON_PREFIX}: ${version} owes these behaviours and can exercise them`,
  }
}

/* ------------------------------------------------------------------------- §5.4 matching ----- */

export type ObservedFailure = {
  /** The requirement the failure is credited to — half of §5.4's first clause. */
  requirementId?: string
  /** The name of the `step()` the row fell over in, when the journal can identify one. */
  step?: string
  /** The `expect(…, "<message>")` message, when the assertion carried one. */
  failedAssertion?: string
  /** The failure's first line, capped. */
  error?: string
}

/**
 * SCHEMA.md §5.4, verbatim: every clause the signature states must match, ANDed, and an absent
 * clause is not a wildcard that forgives the others — it is simply not asserted. There is no
 * "close enough" path: a timeout, a strict-mode violation or a revert the signature does not name
 * does NOT match, which is exactly what stops a broken locator being filed as a known defect.
 *
 * A signature whose `errorPattern` will not compile matches nothing. That is the safe direction:
 * an unusable signature can never excuse a failure.
 */
export const matchesSignature = (
  observed: ObservedFailure,
  signature: KnownIssueSignature,
): boolean => {
  if (observed.requirementId !== signature.requirementId) return false
  if (signature.step !== undefined && observed.step !== signature.step)
    return false
  if (
    signature.assertion !== undefined &&
    observed.failedAssertion !== signature.assertion
  )
    return false
  if (signature.errorPattern !== undefined) {
    let re: RegExp
    try {
      re = new RegExp(signature.errorPattern)
    } catch {
      return false
    }
    if (!re.test((observed.error ?? "").slice(0, signature.maxLength)))
      return false
  }
  return true
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, "")

/** The reporter's `errorHead`, computed in the worker: first non-empty line, ANSI-stripped. */
export const errorHeadOf = (
  message: string | undefined,
): string | undefined => {
  const lines = (message ? stripAnsi(message) : "").split("\n")
  const head = lines.find((l) => l.trim() !== "")
  return head ? head.trim().slice(0, OBSERVATION_ERROR_CAP) : undefined
}

/**
 * WHICH `step()` the row fell over in, read off the journal — the only record the worker has of
 * what actually ran. `step()` stamps the chain head on entry (`blockStart`) and again on exit
 * (`blockEnd`), so an entry with a start and no end is a checkpoint that was entered and never
 * left: the failure happened inside it.
 *
 * The three cases, and why the last one answers `undefined` rather than guessing:
 *
 *  - some step carries `blockStart` and no `blockEnd`  -> that step (the last such)
 *  - NO step carries `blockStart` at all               -> the chain was unreachable for the whole
 *                                                         row, so no step could be bracketed; the
 *                                                         last step entry is the best evidence
 *                                                         there is
 *  - every bracketed step closed                       -> the row fell over BETWEEN or AFTER
 *                                                         checkpoints (the reporter's `between`
 *                                                         site), so no step owns the failure
 *
 * `undefined` makes any signature that names a `step` fail to match, which sends the row back to a
 * normal failure. Unattributable always loses here; that is the direction this whole module errs in.
 */
export const failingStepOf = (
  entries: readonly UatJournalEntry[],
): { name?: string; req?: string[] } => {
  const steps = entries.filter((e) => e.kind === "step")
  if (steps.length === 0) return {}
  const open = steps.filter(
    (e) => e.blockStart !== undefined && e.blockEnd === undefined,
  )
  if (open.length > 0) {
    const last = open[open.length - 1]
    return { name: last.name, req: last.req }
  }
  if (steps.some((e) => e.blockStart !== undefined)) return {}
  const last = steps[steps.length - 1]
  return { name: last.name, req: last.req }
}

export type SignatureVerdict = {
  result: "match" | "no-match" | "no-failure"
  /** The observed failure the signatures were tested against (absent when the row did not fail). */
  observed?: ObservedFailure
  /** The requirement ids the failure was credited to. */
  credited?: string[]
  /** `register#id` of the known issue that matched, when one did. */
  matched?: string
}

/**
 * Did the failure the row actually produced match a known issue's signature?
 *
 * The failure is credited to the requirements the FAILING STEP declared (`step(…, { req })`) when
 * the journal identifies one, and to the row's declaration otherwise. A signature is then tried
 * only against the requirement it hangs on (§5.4's first clause), so a defect documented on
 * `REQ-A` can never excuse a failure credited to `REQ-B`.
 */
export const checkSignature = (
  decision: LedgerDecision,
  input: {
    failed: boolean
    errorMessage?: string
    journal: readonly UatJournalEntry[]
  },
): SignatureVerdict => {
  if (!input.failed) return { result: "no-failure" }
  const site = failingStepOf(input.journal)
  const error = errorHeadOf(input.errorMessage)
  const observed: ObservedFailure = {
    ...(site.name !== undefined ? { step: site.name } : {}),
    ...(failedAssertionOf(error) !== undefined
      ? { failedAssertion: failedAssertionOf(error) }
      : {}),
    ...(error !== undefined ? { error } : {}),
  }
  const credited =
    site.req && site.req.length > 0
      ? site.req
      : decision.requirements.map((r) => r.requirementId)
  const byId = new Map(
    decision.requirements.flatMap((r) =>
      r.knownIssue ? [[r.requirementId, r.knownIssue] as const] : [],
    ),
  )
  for (const id of credited) {
    const issue = byId.get(id)
    if (
      issue &&
      matchesSignature({ ...observed, requirementId: id }, issue.signature)
    )
      return {
        result: "match",
        observed,
        credited,
        matched: `${issue.register ?? decision.version}#${issue.id}`,
      }
  }
  return { result: "no-match", observed, credited }
}

/* ---------------------------------------------------------------- applying the decision ----- */

/** The annotation type the decision travels to `uat-run/3` on. */
export const LEDGER_ANNOTATION = "ledger"
/** The annotation type a signature MISS travels on (§5.4). */
export const LEDGER_SIGNATURE_ANNOTATION = "ledger-signature"
/** The journal entry name the decision is recorded under. */
export const LEDGER_JOURNAL_NAME = "ledger decision"
/** The journal entry name the signature check is recorded under. */
export const LEDGER_SIGNATURE_JOURNAL_NAME = "ledger signature"

/**
 * The slice of `TestInfo` this module touches. Structural, so the jest suite drives every branch
 * with a plain object and never loads a runner. `expectedStatus` is writable on Playwright's own
 * `TestInfo` and is what `deriveOutcome` reads — see `checkSignatureAndRecord`.
 */
export type LedgerTestInfo = {
  annotations: UatAnnotation[]
  expectedStatus: TestInfo["expectedStatus"]
  fail(condition: boolean, description?: string): void
  skip(condition: boolean, description?: string): void
}

type Recorder = (entry: {
  kind: "data"
  name: string
  data: unknown
}) => unknown

const defaultRecorder: Recorder = (entry) => journal.record(entry)

export const annotationFor = (decision: LedgerDecision): UatAnnotation => ({
  type: LEDGER_ANNOTATION,
  description: JSON.stringify(decision),
})

export type AppliedDecision = {
  decision: LedgerDecision
  /** What `expectedStatus` was before the fixture touched it — restored on a signature miss. */
  priorExpectedStatus: TestInfo["expectedStatus"]
}

/**
 * Record the decision, then apply it.
 *
 * ORDER MATTERS: `skip()` throws (that is how Playwright skips), so the annotation and the journal
 * entry are written FIRST. A skipped row that carried no record of WHY would be indistinguishable
 * from a row somebody forgot to write.
 *
 * `not-applicable` and `blocked` are both `skip()`; the reason prefix is what tells a report which
 * one it was, and it is the reason string Playwright itself surfaces.
 */
export const applyDecision = (
  testInfo: LedgerTestInfo,
  decision: LedgerDecision,
  record: Recorder = defaultRecorder,
): AppliedDecision => {
  const priorExpectedStatus = testInfo.expectedStatus
  testInfo.annotations.push(annotationFor(decision))
  record({ kind: "data", name: LEDGER_JOURNAL_NAME, data: decision })
  if (decision.decision === "expect-failure")
    testInfo.fail(true, decision.reason)
  else if (
    decision.decision === "blocked" ||
    decision.decision === "not-applicable"
  )
    testInfo.skip(true, decision.reason)
  return { decision, priorExpectedStatus }
}

/**
 * After an `expect-failure` row has ended: was the failure the one the ledger documented?
 *
 * On a MISS the fixture undoes its own `fail()` — `expectedStatus` goes back to what the row had
 * before, so `deriveOutcome` (status `failed`, expectedStatus `passed`) reports an ordinary
 * `failed` row and the validator derives `unexpected-failure` (§5.5 R2b). The
 * `ledger-signature: no-match` annotation says why, beside the `fail` annotation Playwright pushed.
 * This is the rule the whole module exists for: a timeout, a broken locator or a different revert
 * on a known-defect requirement is NOT the documented defect, and the harness must never file it
 * as one.
 *
 * On `no-failure` the `fail()` stands, so Playwright reports `unexpected-pass` — §5.5 R3a, the
 * documented defect is gone or the test stopped exercising it. Also loud, also correct.
 */
export const checkSignatureAndRecord = (
  testInfo: LedgerTestInfo,
  applied: AppliedDecision,
  input: {
    failed: boolean
    errorMessage?: string
    journal: readonly UatJournalEntry[]
  },
  record: Recorder = defaultRecorder,
): SignatureVerdict => {
  const verdict = checkSignature(applied.decision, input)
  record({
    kind: "data",
    name: LEDGER_SIGNATURE_JOURNAL_NAME,
    data: verdict,
  })
  if (verdict.result === "no-match") {
    testInfo.annotations.push({
      type: LEDGER_SIGNATURE_ANNOTATION,
      description: "no-match",
    })
    testInfo.expectedStatus = applied.priorExpectedStatus
  }
  return verdict
}

/* ---------------------------------------------------------------------------- the wiring ----- */

export type LedgerContext = { ledger: Ledger; version: LedgerVersionId }

let context: LedgerContext | undefined
let resolved = false

/** One line per worker process, never per row. */
const sayOnce = (message: string) => {
  // eslint-disable-next-line no-console
  console.log(message)
}

/**
 * The ledger this worker applies, or `undefined` — in which case the fixture is INERT and every
 * row runs exactly as it does today. Inert is the default and the safe state: no `UAT_LEDGER`, no
 * `UAT_LEDGER_VERSION`, or a ledger that would not load, and nothing is skipped and nothing is
 * excused. Resolved once per worker process and announced once.
 */
export const ledgerContext = (
  env: Readonly<Record<string, string | undefined>> = process.env,
): LedgerContext | undefined => {
  if (resolved) return context
  resolved = true
  const path = env[LEDGER_PATH_ENV]?.trim()
  if (!path) {
    sayOnce(
      `ledger: ${LEDGER_PATH_ENV} is not set — no ledger expectations are applied to any row.`,
    )
    return undefined
  }
  const version = ledgerVersionFrom(env[LEDGER_VERSION_ENV])
  if (!version) {
    sayOnce(
      `ledger: ${LEDGER_PATH_ENV} is set but ${LEDGER_VERSION_ENV} is not "v25" or "main" — the harness cannot tell which version it is, so no expectations are applied.`,
    )
    return undefined
  }
  try {
    context = { ledger: loadLedger(path), version }
    sayOnce(`ledger: applying ${path} as ${version}.`)
  } catch (e) {
    sayOnce(`ledger: ${(e as Error).message} — no expectations are applied.`)
    context = undefined
  }
  return context
}

/** Test-only: forget the memoised context so a suite can drive `ledgerContext` more than once. */
export const resetLedgerContext = () => {
  context = undefined
  resolved = false
}

const isInfraRow = (annotations: UatAnnotation[]): boolean =>
  annotations.some((a) => a.type === INFRA_ANNOTATION)

/**
 * THE AUTO FIXTURE. Wired into `e2e/lib/test.ts` with one line — `.extend(ledgerFixture)` — and
 * registered on the test type itself, so it brackets EVERY row of every spec that imports that
 * `test`, whether or not the row asked for a fixture (the same reason `uatJournal` is a fixture
 * and not a `test.beforeEach`: a hook written at a helper module's top level attaches only to the
 * first spec file that pulls the module into a worker).
 *
 * Setup reads the row's own `requirements` annotation and applies the decision before the body
 * runs. Teardown checks the signature of an `expect-failure` row against what actually broke.
 * Infra rows (`infra()`) declare no behaviour and are exempt, exactly as §5.1 says.
 */
export const ledgerFixture: Fixtures<{ uatLedger: void }> = {
  uatLedger: [
    async ({}, use, testInfo) => {
      const ctx = ledgerContext()
      let applied: AppliedDecision | undefined
      if (ctx && !isInfraRow(testInfo.annotations)) {
        const ids = parseRequirements(testInfo.annotations)
        // `applyDecision` THROWS on a skip — nothing after it runs, which is what a skip means.
        if (ids.length > 0)
          applied = applyDecision(
            testInfo,
            expectationsFor(ctx.ledger, ctx.version, ids),
          )
      }
      await use()
      if (applied?.decision.decision === "expect-failure")
        checkSignatureAndRecord(testInfo, applied, {
          // `interrupted` is in here deliberately: an interrupted row is not evidence the
          // behaviour works, so it must not be allowed to stand as an `unexpected-pass`. It will
          // match no signature, which restores the row to an ordinary failure — the same answer
          // `deriveOutcome` gives it today.
          failed: testInfo.status !== "passed" && testInfo.status !== "skipped",
          errorMessage: testInfo.error?.message,
          journal: journal.journalOf(testInfo) as readonly UatJournalEntry[],
        })
    },
    { auto: true },
  ],
}
