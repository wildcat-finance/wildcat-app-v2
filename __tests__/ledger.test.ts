/* eslint-disable import/no-extraneous-dependencies, no-restricted-syntax, no-empty-pattern */
/**
 * The capability ledger, applied to a Playwright row (`e2e/lib/ledger.ts`).
 *
 * Two layers, the same split as `observations.test.ts`:
 *
 *  - `effectiveApplicability` / `expectationsFor` / `matchesSignature` are pure, so every branch of
 *    SCHEMA.md §5.2, §5.4 and the row-level decision runs against an INLINE ledger rather than a
 *    fixture that has to be kept in step with the draft;
 *  - and then the decision is APPLIED to a fake `TestInfo` that reproduces Playwright's own
 *    `_modifier` (`playwright/lib/worker/testInfo.js`) exactly — annotation pushed, `expectedStatus`
 *    moved, `skip` thrown. No runner is loaded and no browser is started, so the thing that decides
 *    whether a row is skipped, excused or run is unit-tested rather than observed on a board.
 *
 * It lives here (repo root `__tests__/`), not beside the module: jest.config.ts's
 * testPathIgnorePatterns excludes `<rootDir>/e2e/` wholesale.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { test as base } from "@playwright/test"

import {
  annotationFor,
  applyDecision,
  attachSpec,
  BLOCKED_PREFIX,
  checkSignature,
  checkSignatureAndRecord,
  EXPECT_FAILURE_PREFIX,
  effectiveApplicability,
  errorHeadOf,
  expectationsFor,
  failingStepOf,
  LEDGER_ANNOTATION,
  LEDGER_JOURNAL_NAME,
  LEDGER_SIGNATURE_ANNOTATION,
  LEDGER_SIGNATURE_JOURNAL_NAME,
  ledgerContext,
  ledgerFixture,
  ledgerVersionFrom,
  loadLedger,
  matchesSignature,
  NOT_APPLICABLE_PREFIX,
  requirementIndex,
  resetLedgerContext,
  type AppliedDecision,
  type KnownIssueSignature,
  type Ledger,
  type LedgerRequirement,
  type LedgerTestInfo,
  type LedgerVersionEntry,
  type LedgerVersionId,
} from "../e2e/lib/ledger"
import { buildRowSpec, runsheetIndex, runsheetRowFor } from "../e2e/lib/rowSpec"
import {
  parseSpec,
  SPEC_ANNOTATION,
  type UatAnnotation,
  type UatJournalEntry,
} from "../e2e/lib/uatModel"

const FIXTURES = resolve(__dirname, "../e2e/lib/__fixtures__")
const AT = "2026-01-03T00:00:00.000Z"

/* --------------------------------------------------------------- inline ledger builders ----- */

type EntrySpec = {
  applicability?: LedgerVersionEntry["applicability"]
  implementation?: LedgerVersionEntry["implementation"]
  coverage?: LedgerVersionEntry["coverage"]
}

const entry = (spec: EntrySpec = {}): LedgerVersionEntry => ({
  applicability: spec.applicability ?? { class: "required" },
  implementation: spec.implementation ?? { class: "conforming" },
  coverage: spec.coverage ?? { class: "automated" },
})

const requirement = (
  id: string,
  versions: Partial<Record<LedgerVersionId, LedgerVersionEntry>>,
  desiredStatus: "candidate" | "approved" = "approved",
): LedgerRequirement => ({
  id,
  statement: `${id} does what it says`,
  desired: { status: desiredStatus },
  versions,
})

/** One area, one capability — the ledger is a three-deep container and nothing else. */
const ledgerOf = (...requirements: LedgerRequirement[]): Ledger => ({
  schema: "capability-ledger/2",
  areas: [{ id: "TST", capabilities: [{ id: "CAP-TST", requirements }] }],
})

const signature = (
  over: Partial<KnownIssueSignature> & { requirementId: string },
): KnownIssueSignature => ({ maxLength: 400, ...over })

const defect = (sig: KnownIssueSignature, id = "1") =>
  entry({
    implementation: {
      class: "known-defect",
      knownIssue: { register: "v25", id, signature: sig },
    },
  })

const blocked = (detail: string) =>
  entry({
    coverage: {
      class: "blocked",
      blockedBy: { kind: "environment", detail },
    },
  })

/* ------------------------------------------------------------------- a fake Playwright ----- */

class FakeSkipError extends Error {}

/**
 * Playwright's `TestInfoImpl._modifier`, reproduced: push the annotation, then move
 * `expectedStatus` — and `skip`/`fixme` THROW, which is how a skip aborts the row. Reproducing it
 * rather than stubbing it is the point: `applyDecision` has to write its record BEFORE it skips,
 * and a stub that returns quietly would never prove that.
 */
const fakeTestInfo = (
  over: Partial<Pick<LedgerTestInfo, "annotations" | "expectedStatus">> = {},
): LedgerTestInfo & { annotations: UatAnnotation[] } => ({
  annotations: over.annotations ?? [],
  expectedStatus: over.expectedStatus ?? "passed",
  fail(condition: boolean, description?: string) {
    if (!condition) return
    this.annotations.push({ type: "fail", description })
    if (this.expectedStatus !== "skipped") this.expectedStatus = "failed"
  },
  skip(condition: boolean, description?: string) {
    if (!condition) return
    this.annotations.push({ type: "skip", description })
    this.expectedStatus = "skipped"
    throw new FakeSkipError(`Test is skipped: ${description ?? ""}`)
  },
})

type Recorded = { kind: "data"; name: string; data: unknown }
const recorder = () => {
  const entries: Recorded[] = []
  return {
    entries,
    record: (e: { kind: "data"; name: string; data: unknown }) => {
      entries.push(e)
      return e
    },
  }
}

const jstep = (
  name: string,
  over: Partial<UatJournalEntry> = {},
): UatJournalEntry => ({ at: AT, kind: "step", name, ...over })

/* ================================================================ §5.2 effective class ===== */

describe("effectiveApplicability (SCHEMA.md §5.2)", () => {
  const approved = requirement("REQ-TST-001", {}, "approved")
  const candidate = requirement("REQ-TST-001", {}, "candidate")

  it("rule 1: a stored `required` is required, whatever else is set", () => {
    expect(
      effectiveApplicability(
        candidate,
        entry({ applicability: { class: "required" } }),
      ),
    ).toBe("required")
  })

  it("rule 2: a PROPOSED ruling still derives required — the version keeps owing it", () => {
    expect(
      effectiveApplicability(
        approved,
        entry({
          applicability: {
            class: "intentionally-absent",
            status: "proposed",
            reason: "main proposes this is absent",
          },
        }),
      ),
    ).toBe("required")
  })

  it("rule 3: an approved ruling on a CANDIDATE behaviour still derives required", () => {
    expect(
      effectiveApplicability(
        candidate,
        entry({
          applicability: { class: "intentionally-absent", status: "approved" },
        }),
      ),
    ).toBe("required")
  })

  it("rule 4: an approved ruling on an approved behaviour is the only way to intentionally-absent", () => {
    expect(
      effectiveApplicability(
        approved,
        entry({
          applicability: { class: "intentionally-absent", status: "approved" },
        }),
      ),
    ).toBe("intentionally-absent")
  })

  it("rule 4: and the only way to intentionally-different", () => {
    expect(
      effectiveApplicability(
        approved,
        entry({
          applicability: {
            class: "intentionally-different",
            status: "approved",
          },
        }),
      ),
    ).toBe("intentionally-different")
  })
})

/* ============================================================== the row-level decision ===== */

describe("expectationsFor — the row decision", () => {
  it("runs a required, conforming, automated row", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", { v25: entry(), main: entry() }),
    )
    const d = expectationsFor(l, "v25", ["REQ-TST-001"])
    expect(d.decision).toBe("run")
    expect(d.version).toBe("v25")
    expect(d.requirements).toEqual([
      {
        requirementId: "REQ-TST-001",
        known: true,
        storedApplicability: "required",
        applicabilityStatus: undefined,
        effectiveApplicability: "required",
        implementation: "conforming",
        coverage: "automated",
      },
    ])
  })

  it("runs a row whose ruling is only PROPOSED — proposed derives as required", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: entry({
          applicability: {
            class: "intentionally-absent",
            status: "proposed",
            reason: "v2.5 proposes this is absent",
          },
        }),
      }),
    )
    const d = expectationsFor(l, "v25", ["REQ-TST-001"])
    expect(d.decision).toBe("run")
    // The report prints the stored class beside the effective one (§5.2).
    expect(d.requirements[0].storedApplicability).toBe("intentionally-absent")
    expect(d.requirements[0].effectiveApplicability).toBe("required")
  })

  it("runs a row whose behaviour is only a CANDIDATE, even with the ruling approved", () => {
    const l = ledgerOf(
      requirement(
        "REQ-TST-001",
        {
          v25: entry({
            applicability: {
              class: "intentionally-absent",
              status: "approved",
            },
          }),
        },
        "candidate",
      ),
    )
    expect(expectationsFor(l, "v25", ["REQ-TST-001"]).decision).toBe("run")
  })

  it("skips a row as not-applicable when EVERY requirement is approved intentionally-absent", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: entry({
          applicability: { class: "intentionally-absent", status: "approved" },
        }),
      }),
      requirement("REQ-TST-002", {
        v25: entry({
          applicability: { class: "intentionally-absent", status: "approved" },
        }),
      }),
    )
    const d = expectationsFor(l, "v25", ["REQ-TST-001", "REQ-TST-002"])
    expect(d.decision).toBe("not-applicable")
    expect(d.reason.startsWith(NOT_APPLICABLE_PREFIX)).toBe(true)
  })

  it("does NOT skip an intentionally-different row: §5.2 derives it identically to required", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: entry({
          applicability: {
            class: "intentionally-different",
            status: "approved",
          },
        }),
      }),
    )
    const d = expectationsFor(l, "v25", ["REQ-TST-001"])
    expect(d.decision).toBe("run")
    expect(d.requirements[0].effectiveApplicability).toBe(
      "intentionally-different",
    )
  })

  it("runs a row where only SOME requirements are intentionally-absent", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: entry({
          applicability: { class: "intentionally-absent", status: "approved" },
        }),
      }),
      requirement("REQ-TST-002", { v25: entry() }),
    )
    expect(
      expectationsFor(l, "v25", ["REQ-TST-001", "REQ-TST-002"]).decision,
    ).toBe("run")
  })

  it("expects failure when ANY requirement is a known-defect, and carries the signature", () => {
    const sig = signature({
      requirementId: "REQ-TST-002",
      errorPattern: "SphereX error: disallowed tx pattern",
    })
    const l = ledgerOf(
      requirement("REQ-TST-001", { v25: entry() }),
      requirement("REQ-TST-002", { v25: defect(sig, "20") }),
    )
    const d = expectationsFor(l, "v25", ["REQ-TST-001", "REQ-TST-002"])
    expect(d.decision).toBe("expect-failure")
    expect(d.reason.startsWith(EXPECT_FAILURE_PREFIX)).toBe(true)
    expect(d.reason).toContain("v25#20")
    expect(d.knownIssues).toEqual([
      { register: "v25", id: "20", signature: sig },
    ])
  })

  it("blocks a row only when EVERY requirement is blocked, and names the blocker", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: blocked("no Safe signer on the fork"),
      }),
      requirement("REQ-TST-002", {
        v25: blocked("no Safe signer on the fork"),
      }),
    )
    const d = expectationsFor(l, "v25", ["REQ-TST-001", "REQ-TST-002"])
    expect(d.decision).toBe("blocked")
    expect(d.reason.startsWith(BLOCKED_PREFIX)).toBe(true)
    expect(d.reason).toContain("environment: no Safe signer on the fork")
    expect(d.requirements[0].blockedBy).toBe(
      "environment: no Safe signer on the fork",
    )
  })

  it("runs a row where only SOME requirements are blocked", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", { v25: blocked("no Safe signer") }),
      requirement("REQ-TST-002", { v25: entry() }),
    )
    expect(
      expectationsFor(l, "v25", ["REQ-TST-001", "REQ-TST-002"]).decision,
    ).toBe("run")
  })

  it("expect-failure wins over blocked on a mixed row", () => {
    const sig = signature({
      requirementId: "REQ-TST-001",
      errorPattern: "boom",
    })
    const l = ledgerOf(
      requirement("REQ-TST-001", { v25: defect(sig) }),
      requirement("REQ-TST-002", { v25: blocked("no Safe signer") }),
    )
    // Not "blocked": ALL are not blocked. Not "run" either — a documented defect is a statement
    // about the app and it outranks a statement about the harness.
    expect(
      expectationsFor(l, "v25", ["REQ-TST-001", "REQ-TST-002"]).decision,
    ).toBe("expect-failure")
  })

  it("not-applicable outranks expect-failure: §5.5 puts R1a/R1b above R2a", () => {
    // A version that does not owe the behaviour cannot have the failure in it "documented": were
    // the row to run and fail, R1b would call that UNEXPECTED, so marking it test.fail would have
    // asserted the opposite.
    const sig = signature({
      requirementId: "REQ-TST-001",
      errorPattern: "boom",
    })
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: {
          applicability: { class: "intentionally-absent", status: "approved" },
          implementation: {
            class: "known-defect",
            knownIssue: { register: "v25", id: "9", signature: sig },
          },
          coverage: { class: "automated" },
        },
      }),
    )
    expect(expectationsFor(l, "v25", ["REQ-TST-001"]).decision).toBe(
      "not-applicable",
    )
  })

  it("decides per version off ONE ledger: approved-absent on main, required on v25", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: entry(),
        main: entry({
          applicability: { class: "intentionally-absent", status: "approved" },
        }),
      }),
    )
    expect(expectationsFor(l, "v25", ["REQ-TST-001"]).decision).toBe("run")
    expect(expectationsFor(l, "main", ["REQ-TST-001"]).decision).toBe(
      "not-applicable",
    )
  })

  it("decides per version: known-defect on v25, conforming on main", () => {
    const sig = signature({
      requirementId: "REQ-TST-001",
      errorPattern: "boom",
    })
    const l = ledgerOf(
      requirement("REQ-TST-001", { v25: defect(sig), main: entry() }),
    )
    expect(expectationsFor(l, "v25", ["REQ-TST-001"]).decision).toBe(
      "expect-failure",
    )
    expect(expectationsFor(l, "main", ["REQ-TST-001"]).decision).toBe("run")
  })

  it("runs an id the ledger does not know, and says it does not know it", () => {
    const l = ledgerOf(requirement("REQ-TST-001", { v25: entry() }))
    const d = expectationsFor(l, "v25", ["REQ-XXX-999"])
    expect(d.decision).toBe("run")
    expect(d.requirements).toEqual([
      { requirementId: "REQ-XXX-999", known: false },
    ])
  })

  it("runs a requirement the ledger knows but does not map to THIS version", () => {
    const l = ledgerOf(requirement("REQ-TST-001", { main: blocked("n/a") }))
    const d = expectationsFor(l, "v25", ["REQ-TST-001"])
    expect(d.decision).toBe("run")
    expect(d.requirements[0].known).toBe(false)
  })

  it("never skips or excuses a row that declared nothing", () => {
    const l = ledgerOf(requirement("REQ-TST-001", { v25: blocked("n/a") }))
    expect(expectationsFor(l, "v25", []).decision).toBe("run")
  })

  it("only reports a knownIssue when the implementation class is known-defect", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: entry({
          implementation: {
            class: "conforming",
            knownIssue: {
              id: "1",
              signature: signature({
                requirementId: "REQ-TST-001",
                errorPattern: "x",
              }),
            },
          },
        }),
      }),
    )
    const d = expectationsFor(l, "v25", ["REQ-TST-001"])
    expect(d.decision).toBe("run")
    expect(d.requirements[0].knownIssue).toBeUndefined()
  })

  it("treats `unknown` implementation like conforming — it makes no claim, so it excuses nothing", () => {
    const l = ledgerOf(
      requirement("REQ-TST-001", {
        v25: entry({ implementation: { class: "unknown" } }),
      }),
    )
    expect(expectationsFor(l, "v25", ["REQ-TST-001"]).decision).toBe("run")
  })
})

/* ================================================================== §5.4 the signature ===== */

describe("matchesSignature (SCHEMA.md §5.4)", () => {
  const sig = signature({
    requirementId: "REQ-TST-001",
    step: "register the borrower",
    errorPattern: "SphereX error: disallowed tx pattern",
  })

  it("matches when every clause the signature states matches", () => {
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-001",
          step: "register the borrower",
          error: "Error: SphereX error: disallowed tx pattern",
        },
        sig,
      ),
    ).toBe(true)
  })

  it("refuses a failure credited to a different requirement", () => {
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-002",
          step: "register the borrower",
          error: "SphereX error: disallowed tx pattern",
        },
        sig,
      ),
    ).toBe(false)
  })

  it("refuses a TIMEOUT on a known-defect requirement", () => {
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-001",
          step: "register the borrower",
          error: "locator.click: Timeout 15000ms exceeded",
        },
        sig,
      ),
    ).toBe(false)
  })

  it("refuses the documented error raised in a DIFFERENT step", () => {
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-001",
          step: "open the market",
          error: "SphereX error: disallowed tx pattern",
        },
        sig,
      ),
    ).toBe(false)
  })

  it("refuses a row-level failure (no step) against a signature that names one", () => {
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-001",
          error: "SphereX error: disallowed tx pattern",
        },
        sig,
      ),
    ).toBe(false)
  })

  it("an ABSENT clause is not a wildcard that forgives the others", () => {
    const stepOnly = signature({
      requirementId: "REQ-TST-001",
      step: "register the borrower",
    })
    // No errorPattern: the error is simply not asserted, and the step still has to match.
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-001",
          step: "register the borrower",
          error: "anything",
        },
        stepOnly,
      ),
    ).toBe(true)
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-001",
          step: "somewhere else",
          error: "anything",
        },
        stepOnly,
      ),
    ).toBe(false)
  })

  it("compares the assertion message for equality", () => {
    const assertionSig = signature({
      requirementId: "REQ-TST-001",
      assertion: "the copy control copies the bare address for every row",
    })
    expect(
      matchesSignature(
        {
          requirementId: "REQ-TST-001",
          failedAssertion:
            "the copy control copies the bare address for every row",
        },
        assertionSig,
      ),
    ).toBe(true)
    expect(
      matchesSignature(
        { requirementId: "REQ-TST-001", failedAssertion: "something else" },
        assertionSig,
      ),
    ).toBe(false)
  })

  it("never looks past maxLength", () => {
    const late = signature({
      requirementId: "REQ-TST-001",
      errorPattern: "needle",
      maxLength: 10,
    })
    expect(
      matchesSignature(
        { requirementId: "REQ-TST-001", error: `${"x".repeat(40)}needle` },
        late,
      ),
    ).toBe(false)
    expect(
      matchesSignature(
        { requirementId: "REQ-TST-001", error: "needle here" },
        late,
      ),
    ).toBe(true)
  })

  it("matches nothing when the pattern will not compile", () => {
    expect(
      matchesSignature(
        { requirementId: "REQ-TST-001", error: "anything at all" },
        signature({ requirementId: "REQ-TST-001", errorPattern: "([" }),
      ),
    ).toBe(false)
  })
})

describe("errorHeadOf", () => {
  it("takes the first non-empty line and strips ANSI, as the reporter does", () => {
    expect(errorHeadOf("\n\n  [31mError: boom[39m\n  at foo\n")).toBe(
      "Error: boom",
    )
  })
  it("is undefined for no error", () => {
    expect(errorHeadOf(undefined)).toBeUndefined()
  })
})

describe("failingStepOf", () => {
  it("names the checkpoint that was entered and never left", () => {
    expect(
      failingStepOf([
        jstep("one", { blockStart: "1", blockEnd: "2" }),
        jstep("two", { blockStart: "2", req: ["REQ-TST-001"] }),
      ]),
    ).toEqual({ name: "two", req: ["REQ-TST-001"] })
  })

  it("names nobody when every bracketed checkpoint closed — the row fell over BETWEEN steps", () => {
    expect(
      failingStepOf([
        jstep("one", { blockStart: "1", blockEnd: "2" }),
        jstep("two", { blockStart: "2", blockEnd: "3" }),
      ]),
    ).toEqual({})
  })

  it("falls back to the last checkpoint when the chain was unreachable for the whole row", () => {
    expect(failingStepOf([jstep("one"), jstep("two")])).toEqual({ name: "two" })
  })

  it("names nobody when the row recorded no checkpoints at all", () => {
    expect(failingStepOf([{ at: AT, kind: "nav", url: "/" }])).toEqual({})
  })
})

describe("checkSignature", () => {
  const sig = signature({
    requirementId: "REQ-TST-001",
    step: "register the borrower",
    errorPattern: "boom happened while registering",
  })
  const decision = expectationsFor(
    ledgerOf(requirement("REQ-TST-001", { v25: defect(sig, "1") })),
    "v25",
    ["REQ-TST-001"],
  )

  it("matches the documented defect at the documented step", () => {
    expect(
      checkSignature(decision, {
        failed: true,
        errorMessage: "Error: boom happened while registering",
        journal: [
          jstep("register the borrower", {
            blockStart: "1",
            req: ["REQ-TST-001"],
          }),
        ],
      }),
    ).toMatchObject({
      result: "match",
      matched: "v25#1",
      credited: ["REQ-TST-001"],
    })
  })

  it("does NOT match a timeout in the same step", () => {
    expect(
      checkSignature(decision, {
        failed: true,
        errorMessage: "locator.click: Timeout 15000ms exceeded",
        journal: [
          jstep("register the borrower", {
            blockStart: "1",
            req: ["REQ-TST-001"],
          }),
        ],
      }).result,
    ).toBe("no-match")
  })

  it("credits the failure to the FAILING STEP's requirements, not the row's", () => {
    const two = expectationsFor(
      ledgerOf(
        requirement("REQ-TST-001", { v25: defect(sig, "1") }),
        requirement("REQ-TST-002", { v25: entry() }),
      ),
      "v25",
      ["REQ-TST-001", "REQ-TST-002"],
    )
    // The row fell over in a step that declares only REQ-TST-002, which has no known defect: the
    // defect documented on REQ-TST-001 cannot excuse it.
    expect(
      checkSignature(two, {
        failed: true,
        errorMessage: "Error: boom happened while registering",
        journal: [
          jstep("register the borrower", {
            blockStart: "1",
            blockEnd: "2",
            req: ["REQ-TST-001"],
          }),
          jstep("register the borrower", {
            blockStart: "2",
            req: ["REQ-TST-002"],
          }),
        ],
      }),
    ).toMatchObject({ result: "no-match", credited: ["REQ-TST-002"] })
  })

  it("reports no-failure when the row passed", () => {
    expect(
      checkSignature(decision, { failed: false, journal: [] }).result,
    ).toBe("no-failure")
  })
})

/* ========================================================= applying it to a Playwright row ===== */

describe("applyDecision", () => {
  const l = ledgerOf(
    requirement("REQ-TST-001", {
      v25: defect(
        signature({ requirementId: "REQ-TST-001", errorPattern: "boom" }),
        "1",
      ),
    }),
    requirement("REQ-TST-002", { v25: blocked("no Safe signer on the fork") }),
    requirement("REQ-TST-003", {
      v25: entry({
        applicability: { class: "intentionally-absent", status: "approved" },
      }),
    }),
    requirement("REQ-TST-004", { v25: entry() }),
  )

  it("run: annotates and journals, and touches nothing else", () => {
    const info = fakeTestInfo()
    const r = recorder()
    const decision = expectationsFor(l, "v25", ["REQ-TST-004"])
    applyDecision(info, decision, r.record)
    expect(info.expectedStatus).toBe("passed")
    expect(info.annotations).toEqual([annotationFor(decision)])
    expect(JSON.parse(info.annotations[0].description as string).decision).toBe(
      "run",
    )
    expect(r.entries).toEqual([
      { kind: "data", name: LEDGER_JOURNAL_NAME, data: decision },
    ])
  })

  it("expect-failure: sets expectedStatus to failed, with the ledger's reason", () => {
    const info = fakeTestInfo()
    const r = recorder()
    const applied = applyDecision(
      info,
      expectationsFor(l, "v25", ["REQ-TST-001"]),
      r.record,
    )
    expect(info.expectedStatus).toBe("failed")
    expect(applied.priorExpectedStatus).toBe("passed")
    expect(info.annotations.map((a) => a.type)).toEqual([
      LEDGER_ANNOTATION,
      "fail",
    ])
    expect(info.annotations[1].description).toContain(EXPECT_FAILURE_PREFIX)
    expect(r.entries).toHaveLength(1)
  })

  it("blocked: skips with the blocked prefix, having written its record FIRST", () => {
    const info = fakeTestInfo()
    const r = recorder()
    expect(() =>
      applyDecision(info, expectationsFor(l, "v25", ["REQ-TST-002"]), r.record),
    ).toThrow(FakeSkipError)
    expect(info.expectedStatus).toBe("skipped")
    expect(info.annotations.map((a) => a.type)).toEqual([
      LEDGER_ANNOTATION,
      "skip",
    ])
    expect(info.annotations[1].description).toContain(BLOCKED_PREFIX)
    expect(info.annotations[1].description).toContain(
      "no Safe signer on the fork",
    )
    // The record is what makes a skipped row readable — it must survive the throw.
    expect(r.entries).toHaveLength(1)
    expect((r.entries[0].data as { decision: string }).decision).toBe("blocked")
  })

  it("not-applicable: skips with a DISTINCT prefix from blocked", () => {
    const info = fakeTestInfo()
    const r = recorder()
    expect(() =>
      applyDecision(info, expectationsFor(l, "v25", ["REQ-TST-003"]), r.record),
    ).toThrow(FakeSkipError)
    expect(info.annotations[1].description).toContain(NOT_APPLICABLE_PREFIX)
    expect(info.annotations[1].description).not.toContain(BLOCKED_PREFIX)
    expect((r.entries[0].data as { decision: string }).decision).toBe(
      "not-applicable",
    )
  })
})

describe("checkSignatureAndRecord", () => {
  const sig = signature({
    requirementId: "REQ-TST-001",
    step: "register the borrower",
    errorPattern: "boom happened while registering",
  })
  const l = ledgerOf(requirement("REQ-TST-001", { v25: defect(sig, "1") }))
  const failingJournal = [
    jstep("register the borrower", { blockStart: "1", req: ["REQ-TST-001"] }),
  ]

  const applied = (info: LedgerTestInfo, r: ReturnType<typeof recorder>) =>
    applyDecision(info, expectationsFor(l, "v25", ["REQ-TST-001"]), r.record)

  it("a MATCH leaves the expected failure standing", () => {
    const info = fakeTestInfo()
    const r = recorder()
    const a: AppliedDecision = applied(info, r)
    const verdict = checkSignatureAndRecord(
      info,
      a,
      {
        failed: true,
        errorMessage: "Error: boom happened while registering",
        journal: failingJournal,
      },
      r.record,
    )
    expect(verdict.result).toBe("match")
    expect(info.expectedStatus).toBe("failed")
    expect(info.annotations.map((a2) => a2.type)).not.toContain(
      LEDGER_SIGNATURE_ANNOTATION,
    )
    expect(r.entries[1]).toMatchObject({ name: LEDGER_SIGNATURE_JOURNAL_NAME })
  })

  it("a MISS un-does the fixture's own fail(), so the row reports as an ordinary failure", () => {
    const info = fakeTestInfo()
    const r = recorder()
    const a = applied(info, r)
    const verdict = checkSignatureAndRecord(
      info,
      a,
      {
        failed: true,
        errorMessage: "locator.click: Timeout 15000ms exceeded",
        journal: failingJournal,
      },
      r.record,
    )
    expect(verdict.result).toBe("no-match")
    // deriveOutcome(status "failed", expectedStatus "passed") === "failed" — the validator then
    // derives unexpected-failure (§5.5 R2b). The fixture must NEVER excuse this.
    expect(info.expectedStatus).toBe("passed")
    expect(
      info.annotations.find((x) => x.type === LEDGER_SIGNATURE_ANNOTATION),
    ).toEqual({ type: LEDGER_SIGNATURE_ANNOTATION, description: "no-match" })
  })

  it("a row that did NOT fail keeps the fail(), so Playwright reports unexpected-pass", () => {
    const info = fakeTestInfo()
    const r = recorder()
    const a = applied(info, r)
    expect(
      checkSignatureAndRecord(info, a, { failed: false, journal: [] }, r.record)
        .result,
    ).toBe("no-failure")
    expect(info.expectedStatus).toBe("failed")
  })

  it("restores whatever expectedStatus the row already had, not a hard-coded `passed`", () => {
    const info = fakeTestInfo({ expectedStatus: "failed" })
    const r = recorder()
    const a = applied(info, r)
    checkSignatureAndRecord(
      info,
      a,
      {
        failed: true,
        errorMessage: "something else entirely",
        journal: failingJournal,
      },
      r.record,
    )
    expect(info.expectedStatus).toBe("failed")
  })
})

/* ================================================================= loader and context ===== */

describe("loadLedger", () => {
  let dir: string
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "wildcat-ledger-"))
  })
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it("reads the minimal ledger fixture and indexes it", () => {
    const l = loadLedger(join(FIXTURES, "ledger.minimal.json"))
    const index = requirementIndex(l)
    expect(index.size).toBe(10)
    expect(index.get("REQ-ADM-010")?.versions?.v25?.implementation.class).toBe(
      "known-defect",
    )
    // …and the same object indexes to the same map (memoised per ledger).
    expect(requirementIndex(l)).toBe(index)
  })

  it("derives expect-failure on v25 and run on main from that fixture", () => {
    const l = loadLedger(join(FIXTURES, "ledger.minimal.json"))
    expect(expectationsFor(l, "v25", ["REQ-ADM-010"]).decision).toBe(
      "expect-failure",
    )
    expect(expectationsFor(l, "main", ["REQ-ADM-010"]).decision).toBe("run")
  })

  it("throws on a file that is not there, is not JSON, or is not a ledger", () => {
    expect(() => loadLedger(join(dir, "nope.json"))).toThrow(
      /could not be read/,
    )
    const bad = join(dir, "bad.json")
    writeFileSync(bad, "{ not json")
    expect(() => loadLedger(bad)).toThrow(/is not JSON/)
    const empty = join(dir, "empty.json")
    writeFileSync(empty, "{}")
    expect(() => loadLedger(empty)).toThrow(/has no `areas` array/)
  })
})

describe("ledgerVersionFrom", () => {
  it("accepts exactly the two version ids", () => {
    expect(ledgerVersionFrom("v25")).toBe("v25")
    expect(ledgerVersionFrom(" main ")).toBe("main")
    expect(ledgerVersionFrom("v2.5")).toBeUndefined()
    expect(ledgerVersionFrom(undefined)).toBeUndefined()
    expect(ledgerVersionFrom("")).toBeUndefined()
  })
})

describe("ledgerContext", () => {
  let log: jest.SpyInstance
  beforeEach(() => {
    resetLedgerContext()
    log = jest.spyOn(console, "log").mockImplementation(() => {})
  })
  afterEach(() => {
    log.mockRestore()
    resetLedgerContext()
  })

  it("is inert, and says so ONCE, when UAT_LEDGER is unset", () => {
    expect(ledgerContext({})).toBeUndefined()
    expect(ledgerContext({})).toBeUndefined()
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain("UAT_LEDGER is not set")
  })

  it("is inert when UAT_LEDGER_VERSION does not name a version", () => {
    expect(
      ledgerContext({
        UAT_LEDGER: join(FIXTURES, "ledger.minimal.json"),
        UAT_LEDGER_VERSION: "2.5",
      }),
    ).toBeUndefined()
    expect(log.mock.calls[0][0]).toContain("UAT_LEDGER_VERSION")
  })

  it("is inert when the ledger will not load — nothing is ever excused by a broken ledger", () => {
    expect(
      ledgerContext({
        UAT_LEDGER: join(FIXTURES, "does-not-exist.json"),
        UAT_LEDGER_VERSION: "v25",
      }),
    ).toBeUndefined()
    expect(log.mock.calls[0][0]).toContain("no expectations are applied")
  })

  it("loads the ledger and the version when both are set", () => {
    const ctx = ledgerContext({
      UAT_LEDGER: join(FIXTURES, "ledger.minimal.json"),
      UAT_LEDGER_VERSION: "v25",
    })
    expect(ctx?.version).toBe("v25")
    expect(requirementIndex(ctx!.ledger).size).toBe(10)
  })
})

describe("the fixture", () => {
  it("is registered as an AUTO fixture, so it brackets every row", () => {
    // A hook would attach only to the first spec file that pulled this module into a worker; the
    // whole reason `uatJournal` is a fixture is the same reason this one is.
    expect(Array.isArray(ledgerFixture.uatLedger)).toBe(true)
    expect(
      (ledgerFixture.uatLedger as [unknown, { auto: boolean }])[1],
    ).toEqual({ auto: true })
  })

  it("registers through Playwright's real extend(), spread exactly as e2e/lib/test.ts spreads it", () => {
    // The wiring line in `e2e/lib/test.ts` is `...ledgerFixture,` inside the existing
    // `base.extend<{ uatJournal: void }>({ … })` object. A spread is invisible to the explicit
    // type argument, so this asserts the thing that actually decides whether the fixture runs:
    // the KEY Playwright registered, and the `auto` flag on it.
    const extended = base.extend<{ uatJournal: void }>({
      uatJournal: [async ({}, use) => use(), { auto: true }],
      ...ledgerFixture,
    })
    const impl = (
      extended as unknown as Record<
        symbol,
        { fixtures: { fixtures: Record<string, unknown> }[] }
      >
    )[Object.getOwnPropertySymbols(extended)[0]]
    const registered = impl.fixtures[impl.fixtures.length - 1].fixtures
    expect(Object.keys(registered)).toEqual(["uatJournal", "uatLedger"])
    expect((registered.uatLedger as [unknown, { auto: boolean }])[1]).toEqual({
      auto: true,
    })
  })
})

/* ============================================ the spec annotation: what a row is testing ===== */

/**
 * Display-only text for the report's "What it tests" tab: the runsheet row the test implements and
 * the ledger's statement of every requirement it proves. Nothing here may decide an outcome — the
 * fixture writes it next to the decision, never instead of one.
 */
describe("the spec annotation (display only)", () => {
  const RUNSHEET = {
    rows: [
      {
        page: 1,
        pageTitle: "1 Admin",
        uatId: "ADM-03",
        title: "Invitation status",
        preconditions: null,
        steps:
          "After Borrower A accepts the invite in the app, refresh the admin panel.",
        expected:
          "Borrower status changes to 'Accepted' and shows acceptance timestamp.",
        notes: null,
        applicability: {},
        defectRefs: [],
      },
      {
        page: 3,
        pageTitle: "3 Market Creation",
        uatId: "MKT-23",
        title: "Escape closes the dialog",
        preconditions: "A borrower with a market",
        steps: "Press Escape on the completion dialog.",
        expected: "The dialog closes.",
        notes: "see M12",
      },
      { page: 0, pageTitle: "0 Setup", uatId: null, title: "Environment" },
    ],
    defects: [],
  }

  const specLedger = (): Ledger => ({
    schema: "capability-ledger/2",
    areas: [
      {
        id: "ADM",
        capabilities: [
          {
            id: "CAP-ADM",
            requirements: [
              {
                id: "REQ-ADM-006",
                statement: "Show when the invitee signed the Terms of Use.",
                desired: {
                  status: "candidate",
                  text: "Each row states the ToU timestamp.",
                },
                versions: {
                  v25: {
                    ...entry(),
                    coverage: {
                      class: "automated",
                      tests: [{ uatId: "ADM-03" }],
                    },
                  },
                  main: {
                    ...entry(),
                    coverage: {
                      class: "automated",
                      tests: [{ uatId: "ADM-09" }],
                    },
                  },
                },
              },
              {
                id: "REQ-MKT-140",
                statement: "Escape dismisses the completion dialog.",
                desired: { status: "candidate", text: "Escape closes it." },
                versions: {
                  v25: {
                    applicability: {
                      class: "intentionally-different",
                      status: "proposed",
                    },
                    implementation: {
                      class: "known-defect",
                      knownIssue: {
                        register: "main",
                        id: "M12",
                        signature: {
                          requirementId: "REQ-MKT-140",
                          maxLength: 400,
                        },
                      },
                    },
                    coverage: {
                      class: "automated",
                      tests: [{ uatId: "MKT-23b" }],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  })

  it("indexes the runsheet by uatId and falls back from a b-suffixed id to its base row", () => {
    const idx = runsheetIndex(RUNSHEET)
    expect(idx.size).toBe(2)
    expect(runsheetRowFor(idx, "ADM-03")?.uatId).toBe("ADM-03")
    expect(runsheetRowFor(idx, "MKT-23b")?.uatId).toBe("MKT-23")
    expect(runsheetRowFor(idx, "MKT-99")).toBeUndefined()
    expect(runsheetRowFor(idx, null)).toBeUndefined()
    // A bare array of rows is accepted too; garbage is an empty index, never a throw.
    expect(runsheetIndex(RUNSHEET.rows).size).toBe(2)
    expect(runsheetIndex("nonsense").size).toBe(0)
    expect(runsheetIndex(null).size).toBe(0)
  })

  it("a declared row: the runsheet text and every declared requirement's ledger text", () => {
    const spec = buildRowSpec({
      ledger: specLedger(),
      version: "v25",
      uatId: "ADM-03",
      declared: ["REQ-ADM-006", "REQ-XXX-999"],
      runsheet: runsheetIndex(RUNSHEET),
    })
    expect(spec).toEqual({
      source: "declared",
      runsheet: {
        uatId: "ADM-03",
        page: 1,
        pageTitle: "1 Admin",
        title: "Invitation status",
        preconditions: null,
        steps:
          "After Borrower A accepts the invite in the app, refresh the admin panel.",
        expected:
          "Borrower status changes to 'Accepted' and shows acceptance timestamp.",
        notes: null,
      },
      requirements: [
        {
          id: "REQ-ADM-006",
          statement: "Show when the invitee signed the Terms of Use.",
          desired: "Each row states the ToU timestamp.",
          applicability: "required",
          implementation: "conforming",
        },
        // An id the ledger does not know is kept, and said to be unknown — never dropped.
        { id: "REQ-XXX-999", known: false },
      ],
    })
  })

  it("a b-suffixed row reads its base runsheet row; tags carry the ruling status and the known issue", () => {
    const spec = buildRowSpec({
      ledger: specLedger(),
      version: "v25",
      uatId: "MKT-23b",
      declared: ["REQ-MKT-140"],
      runsheet: runsheetIndex(RUNSHEET),
    })
    expect(spec?.runsheet?.uatId).toBe("MKT-23")
    expect(spec?.runsheet?.title).toBe("Escape closes the dialog")
    expect(spec?.requirements).toEqual([
      {
        id: "REQ-MKT-140",
        statement: "Escape dismisses the completion dialog.",
        desired: "Escape closes it.",
        applicability: "intentionally-different",
        applicabilityStatus: "proposed",
        implementation: "known-defect",
        knownIssue: "main#M12",
      },
    ])
  })

  it("an UNDECLARED row: the ledger's coverage mapping for THIS version, marked as such", () => {
    const v25 = buildRowSpec({
      ledger: specLedger(),
      version: "v25",
      uatId: "ADM-03",
      declared: [],
      runsheet: runsheetIndex(RUNSHEET),
    })
    expect(v25?.source).toBe("ledger-mapping")
    expect(v25?.requirements.map((r) => r.id)).toEqual(["REQ-ADM-006"])
    // main maps REQ-ADM-006 to a different row: ADM-03 proves nothing there.
    const main = buildRowSpec({
      ledger: specLedger(),
      version: "main",
      uatId: "ADM-03",
      declared: [],
      runsheet: runsheetIndex(RUNSHEET),
    })
    expect(main?.source).toBe("ledger-mapping")
    expect(main?.requirements).toEqual([])
    expect(main?.runsheet?.title).toBe("Invitation status")
  })

  it("omits the runsheet when there is none, and returns nothing when there is nothing to say", () => {
    const spec = buildRowSpec({
      ledger: specLedger(),
      version: "v25",
      uatId: "ADM-03",
      declared: ["REQ-ADM-006"],
    })
    expect(spec).toBeDefined()
    expect("runsheet" in (spec as object)).toBe(false)
    expect(
      buildRowSpec({
        ledger: specLedger(),
        version: "v25",
        uatId: "ZZZ-01",
        declared: [],
        runsheet: runsheetIndex(RUNSHEET),
      }),
    ).toBeUndefined()
    expect(
      buildRowSpec({
        ledger: specLedger(),
        version: "v25",
        uatId: null,
        declared: [],
      }),
    ).toBeUndefined()
  })

  it("never throws on a malformed ledger", () => {
    const broken = {
      areas: [
        null,
        {
          capabilities: [
            { requirements: [null, { id: "REQ-ADM-006", versions: null }] },
          ],
        },
      ],
    } as unknown as Ledger
    expect(() =>
      buildRowSpec({
        ledger: broken,
        version: "v25",
        uatId: "ADM-03",
        declared: [],
      }),
    ).not.toThrow()
    expect(() =>
      buildRowSpec({
        ledger: broken,
        version: "v25",
        uatId: "ADM-03",
        declared: ["REQ-ADM-006"],
      }),
    ).not.toThrow()
  })

  it("attachSpec writes one `spec` annotation that parseSpec reads back; inert without a ledger or on an infra row", () => {
    const ctx = {
      ledger: specLedger(),
      version: "v25" as const,
      runsheet: runsheetIndex(RUNSHEET),
    }
    const info = {
      title: "ADM-03: invitation status",
      annotations: [] as UatAnnotation[],
    }
    attachSpec(info, ctx)
    expect(
      info.annotations.filter((a) => a.type === SPEC_ANNOTATION),
    ).toHaveLength(1)
    const spec = parseSpec(info.annotations)
    expect(spec?.source).toBe("ledger-mapping")
    expect(spec?.runsheet?.title).toBe("Invitation status")
    expect(spec?.requirements[0]?.id).toBe("REQ-ADM-006")

    const none = {
      title: "ADM-03: invitation status",
      annotations: [] as UatAnnotation[],
    }
    attachSpec(none, undefined)
    expect(none.annotations).toEqual([])

    const infra = {
      title: "setup: fixtures",
      annotations: [{ type: "infra", description: "setup" }] as UatAnnotation[],
    }
    attachSpec(infra, ctx)
    expect(infra.annotations).toHaveLength(1)

    // Never throws, whatever the context holds.
    const odd = { title: "ADM-03: x", annotations: [] as UatAnnotation[] }
    expect(() =>
      attachSpec(odd, { ledger: null, version: "v25" } as unknown as Parameters<
        typeof attachSpec
      >[1]),
    ).not.toThrow()
  })

  it("parseSpec ignores a malformed annotation", () => {
    expect(
      parseSpec([{ type: SPEC_ANNOTATION, description: "{not json" }]),
    ).toBeUndefined()
    expect(
      parseSpec([{ type: SPEC_ANNOTATION, description: "[]" }]),
    ).toBeUndefined()
    expect(parseSpec([])).toBeUndefined()
  })

  describe("through ledgerContext and the fixture", () => {
    let dir: string
    let log: jest.SpyInstance
    const saved: Record<string, string | undefined> = {}
    const ENV = ["UAT_LEDGER", "UAT_LEDGER_VERSION", "UAT_RUNSHEET"]
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "ledger-spec-"))
      writeFileSync(join(dir, "ledger.json"), JSON.stringify(specLedger()))
      writeFileSync(join(dir, "runsheet.json"), JSON.stringify(RUNSHEET))
      ENV.forEach((k) => {
        saved[k] = process.env[k]
      })
      log = jest.spyOn(console, "log").mockImplementation(() => {})
      resetLedgerContext()
    })
    afterEach(() => {
      ENV.forEach((k) => {
        if (saved[k] === undefined) delete process.env[k]
        else process.env[k] = saved[k]
      })
      log.mockRestore()
      resetLedgerContext()
      rmSync(dir, { recursive: true, force: true })
    })

    it("reads runsheet.json beside the ledger, or UAT_RUNSHEET", () => {
      const ctx = ledgerContext({
        UAT_LEDGER: join(dir, "ledger.json"),
        UAT_LEDGER_VERSION: "v25",
      })
      expect(ctx?.runsheet?.size).toBe(2)
      resetLedgerContext()
      writeFileSync(
        join(dir, "other.json"),
        JSON.stringify({ rows: [{ uatId: "ADM-99", title: "elsewhere" }] }),
      )
      const other = ledgerContext({
        UAT_LEDGER: join(dir, "ledger.json"),
        UAT_LEDGER_VERSION: "v25",
        UAT_RUNSHEET: join(dir, "other.json"),
      })
      expect([...(other?.runsheet?.keys() ?? [])]).toEqual(["ADM-99"])
      resetLedgerContext()
      // No runsheet anywhere: the ledger still applies, the spec just carries no runsheet text.
      rmSync(join(dir, "runsheet.json"))
      const bare = ledgerContext({
        UAT_LEDGER: join(dir, "ledger.json"),
        UAT_LEDGER_VERSION: "v25",
      })
      expect(bare?.version).toBe("v25")
      expect(bare?.runsheet).toBeUndefined()
    })

    const runFixture = async (info: {
      title: string
      annotations: UatAnnotation[]
    }) => {
      const fake = Object.assign(
        fakeTestInfo({ annotations: info.annotations }),
        { title: info.title, status: "passed" },
      )
      const fn = (
        ledgerFixture.uatLedger as unknown as [
          (
            deps: object,
            use: () => Promise<void>,
            ti: unknown,
          ) => Promise<void>,
        ]
      )[0]
      let thrown: unknown
      try {
        await fn({}, async () => {}, fake)
      } catch (e) {
        thrown = e
      }
      return { fake, thrown }
    }

    it("the fixture attaches the spec to an undeclared row, beside no decision", async () => {
      process.env.UAT_LEDGER = join(dir, "ledger.json")
      process.env.UAT_LEDGER_VERSION = "v25"
      delete process.env.UAT_RUNSHEET
      const { fake, thrown } = await runFixture({
        title: "ADM-03: invitation status",
        annotations: [],
      })
      expect(thrown).toBeUndefined()
      expect(fake.annotations.map((a) => a.type)).toEqual([SPEC_ANNOTATION])
      expect(parseSpec(fake.annotations)?.source).toBe("ledger-mapping")
    })

    it("the fixture writes the spec BEFORE a decision that skips the row", async () => {
      const ledger = specLedger()
      // REQ-ADM-006 as an APPROVED intentionally-absent ruling on v25: decision not-applicable.
      const req = ledger.areas![0].capabilities![0].requirements![0]
      req.desired = {
        status: "approved",
        text: "Each row states the ToU timestamp.",
      }
      req.versions!.v25!.applicability = {
        class: "intentionally-absent",
        status: "approved",
      }
      writeFileSync(join(dir, "ledger.json"), JSON.stringify(ledger))
      process.env.UAT_LEDGER = join(dir, "ledger.json")
      process.env.UAT_LEDGER_VERSION = "v25"
      delete process.env.UAT_RUNSHEET
      const { fake, thrown } = await runFixture({
        title: "ADM-03: invitation status",
        annotations: [{ type: "requirements", description: "REQ-ADM-006" }],
      })
      expect(thrown).toBeInstanceOf(FakeSkipError)
      expect(fake.annotations.map((a) => a.type)).toEqual([
        "requirements",
        SPEC_ANNOTATION,
        LEDGER_ANNOTATION,
        "skip",
      ])
      const spec = parseSpec(fake.annotations)
      expect(spec?.source).toBe("declared")
      expect(spec?.requirements[0]).toMatchObject({
        id: "REQ-ADM-006",
        applicability: "intentionally-absent",
        applicabilityStatus: "approved",
      })
    })
  })
})
