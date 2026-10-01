/**
 * The per-test verdict: ONE plain sentence saying what a row's result means, and who acts next.
 *
 * Derived, never written by hand: the inputs are the row's status/expectedStatus/outcome, its
 * failure site (`failedDuring`), its `observations` (uat-run/3) and the two ledger annotations the
 * capability-ledger fixture writes (`ledger`, the decision; `ledger-signature`, a signature MISS).
 * The rules are first-match-wins, in the order the card redesign fixed (2026-10-01):
 *
 *   1. expected failure, signature matched   -> "Failed as known issue <id> predicts …"
 *   2. expected failure, signature no-match  -> "Failed, but not the way known issue <id> predicts …"
 *   3. unexpected pass                       -> "Passed where known issue <id> predicted a failure …"
 *   4. failed on a requirement whose ruling is a PROPOSED intentionally-* -> product ruling pending
 *   5. failed with an attributed observation -> "<failed assertion> did not hold (<req>)."
 *   6. no attributed observation: by failure site —
 *        teardown                         -> "Checkpoints held; failed while tearing down …"
 *        between                          -> "Checkpoint N held; failed between checkpoints …"
 *        a checkpoint carrying `req`      -> "Failed inside checkpoint … before its assertion …"
 *        arrange/fixture/hook, a checkpoint without `req`, or nothing attributed
 *                                         -> "Did not reach the behaviour under test …"
 *   7. anything else                         -> "Failed: <error head>."
 *
 * A uat-run/2 row carries no observations and no ledger annotations, so rules 1-5 cannot fire and
 * rule 6 fires only on a failure site that is itself outside a checkpoint; every other /2 failure
 * degrades to rule 7, the old wording.
 *
 * Pure: type-only imports from ledger.ts (which touches fs), one value import from uatModel.ts.
 */
import type { KnownIssueRef, LedgerDecision } from "./ledger"
import { annotationReason, type UatTest } from "./uatModel"

export type VerdictKind =
  | "passed"
  | "skipped"
  | "did-not-run"
  | "flaky"
  | "known-issue"
  | "known-issue-mismatch"
  | "unexpected-pass"
  | "ruling-pending"
  | "did-not-hold"
  | "did-not-reach"
  | "failed-in-teardown"
  | "failed-between"
  | "assertion-not-reached"
  | "failed"

export type VerdictFlag = {
  text: string
  tone: "bad" | "warn" | "known" | "ruling"
}

export type Verdict = {
  kind: VerdictKind
  /** The card opens by default and carries the sentence: every row but passed/skipped/setup. */
  open: boolean
  /** The run recorded a failure for this row (excused or not): the prior state opens with it. */
  failure: boolean
  sentence?: string
  /** Who acts next, when anyone has to. */
  next?: string
  /** The failure (or surprise) in plain words, for the card's second header line. */
  headline?: string
  flag?: VerdictFlag
}

const stripAnsi = (s: string): string =>
  // eslint-disable-next-line no-control-regex
  s.replace(/\u001b\[[0-9;]*m/g, "")

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

/**
 * The ledger decision a row ran under: the `ledger` annotation, else the `ledger decision` journal
 * entry carrying the same object. null when the row ran without the ledger fixture.
 */
export const ledgerOf = (t: UatTest): LedgerDecision | null => {
  const a = t.annotations.find((x) => x.type === "ledger")
  if (a?.description) {
    try {
      const parsed: unknown = JSON.parse(a.description)
      if (isRecord(parsed) && typeof parsed.decision === "string")
        return parsed as LedgerDecision
    } catch {
      // fall through to the journal copy
    }
  }
  const j = t.journal.find(
    (e) => e.kind === "data" && e.name === "ledger decision",
  )
  return isRecord(j?.data) && typeof j?.data.decision === "string"
    ? (j.data as unknown as LedgerDecision)
    : null
}

/** The journal's `ledger signature` entry: `{ result, observed?, matched? }`, when recorded. */
const signatureEntry = (t: UatTest): Record<string, unknown> | undefined => {
  const j = t.journal.find(
    (e) => e.kind === "data" && e.name === "ledger signature",
  )
  return isRecord(j?.data) ? j?.data : undefined
}

/**
 * The signature check's result: the `ledger-signature` annotation (written on a MISS only), else
 * the journal entry's `result` ("match" / "no-match" / "no-failure").
 */
export const signatureResultOf = (t: UatTest): string | undefined => {
  const a = t.annotations.find((x) => x.type === "ledger-signature")
  if (a?.description) return a.description
  const r = signatureEntry(t)?.result
  return typeof r === "string" ? r : undefined
}

const knownIssueOf = (
  ledger: LedgerDecision | null,
): KnownIssueRef | undefined =>
  ledger?.knownIssues?.[0] ??
  ledger?.requirements?.find((r) => r.knownIssue)?.knownIssue

const versionText = (v?: string): string =>
  v === "v25" ? "v2.5" : v ?? "this version"

const attributedFailures = (t: UatTest) =>
  (t.observations ?? []).filter(
    (o) => o.status === "fail" && o.requirementId !== null,
  )

/**
 * The failure in plain words: the author's own assertion message when the row recorded one, a
 * contract revert rewritten as "<fn>() reverted (<reason>)", else the error head without its class
 * prefix or a dangling colon.
 */
export const plainError = (t: UatTest): string => {
  const assertion = attributedFailures(t).find((o) => o.failedAssertion)
    ?.failedAssertion
  if (assertion) return assertion
  const head = stripAnsi(t.errorHead ?? "").trim()
  const fn = /contract function "([^"]+)" reverted/.exec(head)?.[1]
  if (fn) {
    const why = stripAnsi(t.errorDetail ?? "")
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean)
      ?.replace(/\.$/, "")
    return `${fn}() reverted${why ? ` (${why})` : ""}`
  }
  const plain = head
    .replace(/^[A-Za-z]*Error:\s*/, "")
    .replace(/[.:]\s*$/, "")
    .trim()
  return plain || "no error message was recorded"
}

/** Failure sites before the first checkpoint: the behaviour under test was never reached. */
const OUTSIDE_SITES: ReadonlySet<string> = new Set([
  "arrange",
  "hook",
  "fixture",
])

/** "broke while <…>" for each failure site. */
const whileDoing = (t: UatTest): string => {
  const f = t.failedDuring
  switch (f?.kind) {
    case "arrange":
      return "arranging"
    case "step":
      // Only a checkpoint WITHOUT `req` gets here: it asserts nothing the ledger names.
      return "arranging"
    case "hook":
      return "running a test hook"
    case "fixture":
      return "setting up a fixture"
    case "unknown":
      return "running code outside any checkpoint"
    default:
      return "running"
  }
}

/** The requirement ids the row failed on: attributed fail observations, else the failing step's `req`. */
const failingRequirements = (t: UatTest): string[] => {
  const f = t.failedDuring
  const step =
    f?.kind === "step"
      ? t.journal.find((e) => e.kind === "step" && e.name === f.name)
      : undefined
  return [
    ...new Set([
      ...attributedFailures(t).map((o) => o.requirementId as string),
      ...(step?.req ?? []),
    ]),
  ]
}

export const verdictOf = (
  t: UatTest,
  ledger: LedgerDecision | null = ledgerOf(t),
): Verdict => {
  const closed = (kind: VerdictKind): Verdict => ({
    kind,
    open: false,
    failure: false,
  })
  if (t.outcome === "passed") return closed("passed")
  if (t.outcome === "skipped") return closed("skipped")
  if (t.outcome === "did-not-run") return closed("did-not-run")
  if (t.outcome === "flaky")
    return {
      kind: "flaky",
      open: true,
      failure: false,
      sentence: "Passed on a retry after a failed attempt.",
      next: "engineering — find what made the first attempt fail",
      flag: { text: "flaky", tone: "warn" },
    }

  const ki = knownIssueOf(ledger)
  const sig = signatureResultOf(t)
  const failed = t.outcome === "failed" || t.outcome === "expected-failure"
  const headline = plainError(t)

  // 1 + 2: a known defect the ledger expected to see fail here.
  if (failed && ledger?.decision === "expect-failure" && ki) {
    const matched =
      sig === "match" || (sig === undefined && t.outcome === "expected-failure")
    if (matched)
      return {
        kind: "known-issue",
        open: true,
        failure: true,
        sentence: `Failed as known issue ${
          ki.id
        } predicts (expected on ${versionText(ledger.version)}).`,
        headline,
        flag: { text: `as ${ki.id} predicts`, tone: "known" },
      }
    const expects =
      ki.signature.assertion ??
      (ki.signature.errorPattern
        ? `an error matching /${ki.signature.errorPattern}/`
        : "its signature")
    const observed = signatureEntry(t)?.observed
    const got =
      (isRecord(observed) && typeof observed.failedAssertion === "string"
        ? observed.failedAssertion
        : undefined) ?? headline
    return {
      kind: "known-issue-mismatch",
      open: true,
      failure: true,
      sentence: `Failed, but not the way known issue ${ki.id} predicts. ${ki.id} expects "${expects}" to fail; this run failed on "${got}". Not attributed to ${ki.id}.`,
      next: "engineering — compare the two assertions",
      headline: got,
      flag: { text: `not the way ${ki.id} predicts`, tone: "bad" },
    }
  }

  // 3: the row was expected to fail and did not.
  if (t.outcome === "unexpected-pass") {
    const why = annotationReason(t.annotations)
    return {
      kind: "unexpected-pass",
      open: true,
      failure: false,
      sentence: ki
        ? `Passed where known issue ${ki.id} predicted a failure. Either the issue is fixed or the check no longer exercises it.`
        : `Passed where a failure was expected${
            why ? ` ("${why}")` : ""
          }. Either the issue is fixed or the check no longer exercises it.`,
      next: "register owner",
      headline: "Passed, but a failure was expected",
      flag: {
        text: ki ? `${ki.id} did not reproduce` : "expected to fail",
        tone: "warn",
      },
    }
  }

  // A uat-run/2 `test.fail()` row that failed as annotated: no ledger, no signature to cite.
  if (t.outcome === "expected-failure") {
    const why = annotationReason(t.annotations)
    return {
      kind: "known-issue",
      open: true,
      failure: true,
      sentence: `Failed as expected${why ? ` ("${why}")` : ""}.`,
      headline,
      flag: { text: "expected failure", tone: "known" },
    }
  }

  // 4: the failing requirement's ruling is a proposed intentional difference.
  const proposed = new Set(
    (ledger?.requirements ?? [])
      .filter(
        (r) =>
          r.applicabilityStatus === "proposed" &&
          /^intentionally-/.test(r.storedApplicability ?? ""),
      )
      .map((r) => r.requirementId),
  )
  const ruling = failingRequirements(t).filter((id) => proposed.has(id))
  if (ruling.length > 0)
    return {
      kind: "ruling-pending",
      open: true,
      failure: true,
      sentence: `Fails the proposed behaviour; product ruling pending (${ruling.join(
        ", ",
      )}).`,
      next: "product",
      headline,
      flag: { text: "product ruling pending", tone: "ruling" },
    }

  // 5: an attributed assertion failed.
  const attributed = attributedFailures(t)
  if (attributed.length > 0) {
    const ids = [...new Set(attributed.map((o) => o.requirementId as string))]
    return {
      kind: "did-not-hold",
      open: true,
      failure: true,
      sentence: `${headline} did not hold (${ids.join(", ")}).`,
      next: "engineering",
      headline,
      flag: { text: "did not hold", tone: "bad" },
    }
  }

  // 6: where the row broke decides what was and was not exercised.
  const f = t.failedDuring
  const failedStep =
    f?.kind === "step"
      ? t.journal.find((e) => e.kind === "step" && e.name === f.name)
      : undefined
  if (f?.kind === "teardown")
    return {
      kind: "failed-in-teardown",
      open: true,
      failure: true,
      sentence: `Checkpoints held; failed while tearing down — ${headline}. The behaviour under test was exercised; the failure is in cleanup.`,
      next: "engineering — triage teardown",
      headline,
      flag: { text: "failed in teardown", tone: "bad" },
    }
  if (f?.kind === "between") {
    const steps = t.journal.filter((e) => e.kind === "step")
    const at =
      f.index ?? (f.name ? steps.findIndex((e) => e.name === f.name) + 1 : 0)
    const held = at > 0 ? String(at) : `"${f.name ?? "?"}"`
    const nextOne = at > 0 ? String(at + 1) : "the next"
    return {
      kind: "failed-between",
      open: true,
      failure: true,
      sentence: `Checkpoint ${held} held; failed between checkpoints before ${nextOne} — ${headline}. Behaviour up to checkpoint ${held} is proven; later checkpoints were not reached.`,
      next: "engineering",
      headline,
      flag: { text: "failed between checkpoints", tone: "bad" },
    }
  }
  if (failedStep && (failedStep.req ?? []).length > 0)
    return {
      kind: "assertion-not-reached",
      open: true,
      failure: true,
      sentence: `Failed inside checkpoint "${
        failedStep.name ?? "?"
      }" before its assertion — ${headline}. The assertion for ${(
        failedStep.req ?? []
      ).join(", ")} was not reached.`,
      next: "engineering",
      headline,
      flag: { text: "assertion not reached", tone: "bad" },
    }
  // The row broke before the behaviour it checks: arrange, a fixture, a hook, a checkpoint that
  // asserts nothing the ledger names, or (uat-run/3) no attributed observation at all.
  if (OUTSIDE_SITES.has(f?.kind ?? "") || t.observations !== undefined) {
    const name = f?.name
    return {
      kind: "did-not-reach",
      open: true,
      failure: true,
      sentence: `Did not reach the behaviour under test: broke while ${whileDoing(
        t,
      )}${
        name ? ` (${name})` : ""
      } — ${headline}. Nothing proven or disproven.`,
      next: "engineering — triage fixture / app state",
      headline,
      flag: { text: "did not reach the check", tone: "warn" },
    }
  }

  // 7
  return {
    kind: "failed",
    open: true,
    failure: true,
    sentence: `Failed: ${headline}.`,
    headline,
  }
}
