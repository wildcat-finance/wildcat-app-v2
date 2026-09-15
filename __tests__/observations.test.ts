/* eslint-disable import/no-extraneous-dependencies, global-require, no-restricted-syntax, @typescript-eslint/no-var-requires */
/**
 * The uat-run/3 observation contract (capability-ledger SCHEMA.md §5.1) — the emission algorithm
 * and the archive it produces.
 *
 * Two layers, deliberately:
 *
 *  - `emitObservations` is pure, so every rule of §5.1 is exercised on an inline row rather than
 *    on a fixture that has to be kept in step with a runner;
 *  - and then the SAME rows go through the real reporter's `onEnd`, and the run.json it writes is
 *    validated against `run.schema.json` with ajv and handed to the ledger tool. Unit-testing the
 *    emitter alone would prove the algorithm and say nothing about the artefact, which is the only
 *    thing the validator ever sees.
 *
 * It lives here (repo root `__tests__/`), not beside the module, because jest.config.ts's
 * testPathIgnorePatterns excludes `<rootDir>/e2e/` wholesale — a `*.test.ts` under `e2e/lib/` is
 * silently never discovered. Fixtures that must NOT be collected as tests live under
 * `e2e/lib/__fixtures__/` for the same reason.
 */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { infra, requirements } from "../e2e/lib/step"
import SummaryReporter from "../e2e/lib/summaryReporter"
import {
  declareAndObserve,
  failedAssertionOf,
  infraKindOf,
  journalStepIndexOf,
  parseRequirements,
  parseUatId,
  runsheetPageOf,
  type UatJournalEntry,
  type UatObservation,
  type UatTest,
} from "../e2e/lib/uatModel"

const FIXTURES = resolve(__dirname, "../e2e/lib/__fixtures__")
const VENDORED_SCHEMA = join(FIXTURES, "run.schema.json")
const RUN_SCHEMA = process.env.UAT_RUN_SCHEMA_PATH ?? VENDORED_SCHEMA
const SPEC = "e2e/fixture/minimal.spec.ts"
const AT = "2026-01-03T00:00:00.000Z"

/** A journal `step` entry, with or without the §5.1 rule 1 declaration. */
const jstep = (name: string, req?: string[]): UatJournalEntry => ({
  at: AT,
  kind: "step",
  name,
  ...(req ? { req } : {}),
})

const requirementsAnnotation = (...ids: string[]) => ({
  type: "requirements",
  description: ids.join(","),
})

const row = (over: Partial<UatTest> & Pick<UatTest, "title">): UatTest => ({
  uatId: parseUatId(over.title),
  page: runsheetPageOf(parseUatId(over.title)),
  file: SPEC,
  suite: "admin fixture",
  status: "passed",
  expectedStatus: "passed",
  outcome: "passed",
  annotations: [],
  durationMs: 1,
  journal: [],
  stepShots: [],
  agreements: [],
  ...over,
})

/** The row exactly as the reporter would have completed it: declaration, then observations. */
const observed = (t: UatTest): UatObservation[] =>
  declareAndObserve(t).observations ?? []

/* ---------------------------------------------------------------- the eight fixture rows ---- */
/**
 * One row per shape of §5.1, declared ONCE and used by both layers below. Their requirement ids
 * and files are the ones `e2e/lib/__fixtures__/ledger.minimal.json` maps to them, so the archive
 * they produce satisfies L053's both-directions declaration agreement.
 */
const fixtureRows = (): UatTest[] => [
  // Infra: asserts no product behaviour, so it declares nothing and observes nothing.
  row({
    title: "smoke: the stack is up",
    annotations: [{ type: "infra", description: "smoke" }],
  }),
  // Rule 7: a single-requirement row may account for its one requirement at row level.
  row({
    title: "ADM-01: single-requirement row with no steps",
    annotations: [requirementsAnnotation("REQ-ADM-001")],
  }),
  // Rule 4: every declared id named by a step; the row passed, so every observation is a pass.
  row({
    title: "ADM-02: multi-step row, all passing",
    annotations: [requirementsAnnotation("REQ-ADM-002", "REQ-ADM-003")],
    journal: [
      jstep("open the invitations table", ["REQ-ADM-002"]),
      jstep("register the borrower", ["REQ-ADM-003"]),
    ],
  }),
  // Rule 4 + the failure site: pass before the failing step, fail on it, not-run after it.
  row({
    title: "ADM-04: failure inside a step that declares requirements",
    annotations: [
      requirementsAnnotation("REQ-ADM-004", "REQ-ADM-005", "REQ-ADM-006"),
    ],
    status: "failed",
    outcome: "failed",
    journal: [
      jstep("open the market controls", ["REQ-ADM-004"]),
      jstep("apply the override", ["REQ-ADM-005"]),
      jstep("read the market history", ["REQ-ADM-006"]),
    ],
    failedDuring: { kind: "step", name: "apply the override", index: 2 },
    errorHead: "Error: the override is applied to the market",
  }),
  // Rule 6, second case: the row fell over in a checkpoint that asserts nothing the ledger names.
  row({
    title: "ADM-05: failure in a step that declares nothing",
    annotations: [requirementsAnnotation("REQ-ADM-007")],
    status: "failed",
    outcome: "failed",
    journal: [
      jstep("refuse the panel to a non-admin wallet", ["REQ-ADM-007"]),
      jstep("tidy up the fixture", undefined),
    ],
    failedDuring: { kind: "step", name: "tidy up the fixture", index: 2 },
    errorHead: "Error: the fixture teardown never completed",
  }),
  // Rule 6, first case: the row fell over before it reached its first checkpoint.
  row({
    title: "ADM-06: failure before the first checkpoint",
    annotations: [requirementsAnnotation("REQ-ADM-008")],
    status: "failed",
    outcome: "failed",
    failedDuring: { kind: "arrange" },
    errorHead: "Error: the cold session never loaded",
  }),
  // Rule 5: a row that never executed accounts for each declared id once, at row level.
  row({
    title: "ADM-07: a skipped row",
    annotations: [
      requirementsAnnotation("REQ-ADM-009"),
      {
        type: "skip",
        description: "no revoked administrator on the fixture chain",
      },
    ],
    status: "skipped",
    outcome: "skipped",
    durationMs: 0,
  }),
  // An expected failure (test.fail) that failed on the step its defect signature names.
  row({
    title: "ADM-08: an expected failure on its signature step",
    annotations: [
      requirementsAnnotation("REQ-ADM-010"),
      { type: "fail", description: "KNOWN-ISSUES #1 — the registrar reverts" },
    ],
    status: "failed",
    expectedStatus: "failed",
    outcome: "expected-failure",
    journal: [jstep("register the borrower", ["REQ-ADM-010"])],
    failedDuring: { kind: "step", name: "register the borrower", index: 1 },
    errorHead: "Error: boom happened while registering the borrower",
  }),
]

/* ------------------------------------------------------------------------- schema drift ----- */

describe("the vendored run.schema.json", () => {
  const sha = (path: string) =>
    createHash("sha256").update(readFileSync(path)).digest("hex")

  it("matches the sha checked in beside it", () => {
    // The copy is the contract this suite is held to. Pinning its digest turns "someone edited
    // the fixture to make a test pass" into a failing test rather than a silent divergence.
    expect(sha(VENDORED_SCHEMA)).toBe(
      readFileSync(join(FIXTURES, "run.schema.sha256"), "utf8").trim(),
    )
  })

  it("matches the authoritative copy, when one is named", () => {
    // UAT_RUN_SCHEMA_PATH is how CI points at the capability-ledger's own file. Without it there
    // is nothing to compare against and the case reports as skipped rather than as passing.
    if (!process.env.UAT_RUN_SCHEMA_PATH) {
      // eslint-disable-next-line no-console
      console.log(
        "skipped: set UAT_RUN_SCHEMA_PATH to the authoritative run.schema.json to check for drift",
      )
      return
    }
    expect(sha(process.env.UAT_RUN_SCHEMA_PATH)).toBe(sha(VENDORED_SCHEMA))
  })
})

/* ---------------------------------------------------------------------- the declaration ----- */

describe("the declaration a row and a step carry", () => {
  it("parses the row-level annotation, keeping unknown ids verbatim", () => {
    expect(
      parseRequirements([
        { type: "requirements", description: " REQ-LEN-136 ,REQ-MKT-020" },
        { type: "requirements", description: "REQ-LEN-136,REQ-XXX-999" },
        { type: "skip", description: "REQ-NOT-001" },
      ]),
      // Duplicates collapse, order is the declaration's, and deciding REQ-XXX-999 is nobody's
      // requirement is the validator's job — a reporter that dropped it would turn a typo into
      // "this row declared nothing".
    ).toEqual(["REQ-LEN-136", "REQ-MKT-020", "REQ-XXX-999"])
    expect(parseRequirements([])).toEqual([])
    expect(parseRequirements([{ type: "requirements" }])).toEqual([])
  })

  it("reads the infra marker only in its closed vocabulary", () => {
    expect(infraKindOf([{ type: "infra", description: "smoke" }])).toBe("smoke")
    expect(infraKindOf([{ type: "infra", description: " teardown " }])).toBe(
      "teardown",
    )
    // The exemption is what lets a row declare nothing; a row that claims it with a word the
    // schema does not contain has not said which kind of infra it is.
    expect(
      infraKindOf([{ type: "infra", description: "fixture" }]),
    ).toBeUndefined()
    expect(infraKindOf([{ type: "infra" }])).toBeUndefined()
  })

  it("pairs a step name and ordinal with its journal position", () => {
    const journal: UatJournalEntry[] = [
      jstep("open"),
      { at: AT, kind: "nav", url: "/lender" },
      jstep("retry"),
      jstep("retry"),
    ]
    expect(journalStepIndexOf(journal, "open", 1)).toBe(1)
    expect(journalStepIndexOf(journal, "retry", 1)).toBe(2)
    expect(journalStepIndexOf(journal, "retry", 2)).toBe(3)
    expect(journalStepIndexOf(journal, "retry", 3)).toBe(0)
    expect(journalStepIndexOf(journal, "never happened", 1)).toBe(0)
  })

  it("takes the failed assertion's message off the error's first line", () => {
    expect(failedAssertionOf("Error: the override is applied")).toBe(
      "the override is applied",
    )
    expect(
      failedAssertionOf("TimeoutError: locator.click timed out"),
    ).toBeUndefined()
    expect(failedAssertionOf(undefined)).toBeUndefined()
    expect(failedAssertionOf("Error:")).toBeUndefined()
  })

  it("refuses Playwright's own matcher and timeout text — that is not an author's message", () => {
    // Real heads off the archived boards. failedAssertion is what a defect signature's
    // `assertion` is matched against, so admitting these would let one signature be satisfied by
    // text that dozens of unrelated failures share.
    for (const head of [
      "Error: Timed out 90000ms waiting for expect(locator).toBeVisible()",
      "Error: expect(received).toEqual(expected) // deep equality",
      "Error: expect(received).toBe(expected) // Object.is equality",
      "Error: expect.poll(received).toBe(expected)",
      "Error: Timed out 5000ms from expect(locator).toHaveText()",
      "Error: Test timeout of 240000ms exceeded.",
      "Error: Timeout 10000ms exceeded.",
      "Error: locator.click: Timeout 10000ms exceeded.",
      "Error: page.goto: net::ERR_CONNECTION_REFUSED",
      "Error: strict mode violation: getByRole('button') resolved to 3 elements",
    ])
      expect([head, failedAssertionOf(head)]).toEqual([head, undefined])

    // An author's message that merely CONTAINS one of those words is still an author's message.
    expect(
      failedAssertionOf("Error: the deposit button is visible after approval"),
    ).toBe("the deposit button is visible after approval")
  })

  it("caps the failed assertion at the same length as the error", () => {
    const head = `Error: ${"x".repeat(3_000)}`
    expect(failedAssertionOf(head)).toHaveLength(2_000)
  })
})

describe("the declaration helpers refuse a malformed id at authoring time", () => {
  it("requirements() throws on anything that is not a requirement id", () => {
    expect(() => requirements(["REQ-LEN-136"])).not.toThrow()
    expect(() => requirements(["REQ-PROTO-009"])).not.toThrow()
    // A malformed id fails run.schema.json (L051), and once L051 fails for a version L052-L058,
    // L061 and L062 all report "skipped: schema invalid" for it. One typo costs the whole run, so
    // it is caught where it is written rather than where it is read.
    for (const bad of [
      "REQ-LEN-13",
      "REQ-LEN-1366",
      "req-len-136",
      "REQ-LENDERFLOWS-136",
      "LEN-136",
      "REQ-LEN-136 ",
      "",
    ])
      expect(() => requirements([bad])).toThrow(/not a requirement id/)
    expect(() => requirements([])).toThrow(/at least one requirement id/)
  })

  it("infra() throws outside its closed vocabulary", () => {
    for (const kind of ["setup", "teardown", "smoke"] as const)
      expect(() => infra(kind)).not.toThrow()
    expect(() => infra("fixture" as never)).toThrow(/not an infra kind/)
  })

  it("reading an archive still keeps an unknown id verbatim", () => {
    // The SHAPE is checked at declaration; whether REQ-XXX-999 is anybody's requirement is
    // L019/L050's question, and the reporter must not answer it by dropping the id.
    expect(
      parseRequirements([
        { type: "requirements", description: "REQ-XXX-999,not-an-id" },
      ]),
    ).toEqual(["REQ-XXX-999", "not-an-id"])
  })
})

/* ------------------------------------------------------------------- the emission algorithm -- */

describe("emitObservations (SCHEMA.md §5.1 rules 1-7)", () => {
  it("an infra row declares nothing and observes nothing", () => {
    const t = fixtureRows()[0]
    expect(observed(t)).toEqual([])
    expect(t.infra).toBe("smoke")
    expect(t.requirements).toEqual([])
    expect(t.needsAnnotation).toBeUndefined()
  })

  it("a functional row with no declaration says so rather than reading as 'about no behaviour'", () => {
    const t = declareAndObserve(row({ title: "ADM-09: undeclared" }))
    expect(t.requirements).toEqual([])
    expect(t.needsAnnotation).toBe(true)
    expect(t.observations).toEqual([])
  })

  it("rule 7: a single-requirement row with no steps accounts for it at row level", () => {
    expect(observed(fixtureRows()[1])).toEqual([
      {
        requirementId: "REQ-ADM-001",
        status: "pass",
        attribution: "row",
      },
    ])
  })

  it("rule 4: a multi-step row that passed observes every step's declaration, at its index", () => {
    expect(observed(fixtureRows()[2])).toEqual([
      {
        requirementId: "REQ-ADM-002",
        status: "pass",
        attribution: "step",
        step: "open the invitations table",
        stepIndex: 1,
      },
      {
        requirementId: "REQ-ADM-003",
        status: "pass",
        attribution: "step",
        step: "register the borrower",
        stepIndex: 2,
      },
    ])
  })

  it("rule 4: a failure inside a declaring step is pass before, fail on, not-run after", () => {
    const t = fixtureRows()[3]
    expect(observed(t)).toEqual([
      {
        requirementId: "REQ-ADM-004",
        status: "pass",
        attribution: "step",
        step: "open the market controls",
        stepIndex: 1,
      },
      {
        requirementId: "REQ-ADM-005",
        status: "fail",
        attribution: "step",
        step: "apply the override",
        stepIndex: 2,
        // Rule 8: the message argument of the expect(…) that failed.
        failedAssertion: "the override is applied to the market",
        error: "Error: the override is applied to the market",
      },
      {
        requirementId: "REQ-ADM-006",
        status: "not-run",
        attribution: "step",
        step: "read the market history",
        stepIndex: 3,
      },
    ])
    // The failure site is the evidence the `fail` rests on, and it names the journal position.
    expect(t.failedDuring).toEqual({
      kind: "step",
      name: "apply the override",
      index: 2,
    })
  })

  it("rule 6: a failure in a step that declares nothing is ONE unattributed observation naming that step", () => {
    const observations = observed(fixtureRows()[4])
    // The step that DID declare a requirement still ran, and still reports.
    expect(observations).toEqual([
      {
        requirementId: "REQ-ADM-007",
        status: "pass",
        attribution: "step",
        step: "refuse the panel to a non-admin wallet",
        stepIndex: 1,
      },
      {
        requirementId: null,
        status: "unattributed",
        attribution: "row",
        step: "tidy up the fixture",
        error: "Error: the fixture teardown never completed",
      },
    ])
    // It never carries a stepIndex: it reports on no attributed assertion, so it indexes none.
    expect(observations[1].stepIndex).toBeUndefined()
    expect(observations.filter((o) => o.status === "fail")).toEqual([])
  })

  it("rule 6: an arrange failure is ONE unattributed observation naming no step — never one manufactured failure per declared id", () => {
    expect(observed(fixtureRows()[5])).toEqual([
      {
        requirementId: null,
        status: "unattributed",
        attribution: "row",
        error: "Error: the cold session never loaded",
      },
    ])
  })

  it("rule 5: a skipped row accounts for each declared id once, at row level, with its reason", () => {
    expect(observed(fixtureRows()[6])).toEqual([
      {
        requirementId: "REQ-ADM-009",
        status: "skipped",
        attribution: "row",
        reason: "no revoked administrator on the fixture chain",
      },
    ])
  })

  it("rule 5: a did-not-run row names the failure that stopped it, and never passes", () => {
    expect(
      observed(
        row({
          title: "ADM-10: serial fallout",
          annotations: [requirementsAnnotation("REQ-ADM-001")],
          status: "skipped",
          outcome: "did-not-run",
          durationMs: 0,
          blockedBy: "ADM-04",
        }),
      ),
    ).toEqual([
      {
        requirementId: "REQ-ADM-001",
        status: "not-run",
        attribution: "row",
        blockedBy: "ADM-04",
      },
    ])
  })

  it("an expected failure is attributed to its signature step exactly like any other failure", () => {
    expect(observed(fixtureRows()[7])).toEqual([
      {
        requirementId: "REQ-ADM-010",
        status: "fail",
        attribution: "step",
        step: "register the borrower",
        stepIndex: 1,
        failedAssertion: "boom happened while registering the borrower",
        error: "Error: boom happened while registering the borrower",
      },
    ])
  })

  it("a failure site the journal cannot account for owns no assertion", () => {
    // The row claims it fell over in journal step 2; the journal records one step. Nothing on the
    // row can be tied to what executed, so the failure is recorded as belonging to nobody rather
    // than credited to a requirement on the strength of a place that did not happen.
    expect(
      observed(
        row({
          title: "ADM-11: unreconcilable site",
          annotations: [requirementsAnnotation("REQ-ADM-001")],
          status: "failed",
          outcome: "failed",
          journal: [jstep("the only step", ["REQ-ADM-001"])],
          failedDuring: { kind: "step", name: "a step nobody ran", index: 2 },
          errorHead: "Error: nope",
        }),
      ),
    ).toEqual([
      {
        requirementId: null,
        status: "unattributed",
        attribution: "row",
        error: "Error: nope",
      },
    ])
  })

  it("a row that ran to the end and reported no failure carries only pass observations", () => {
    // The admissibility table's first row: passed, flaky and unexpected-pass alike. `not-run` is
    // not admissible there — a step that never started records no journal entry, so a not-run on
    // such a row would always describe a step the journal says ran.
    const cases: [string, Partial<UatTest>][] = [
      ["flaky", { status: "passed", outcome: "flaky", retry: 1 }],
      [
        "unexpected-pass",
        {
          status: "passed",
          expectedStatus: "failed",
          outcome: "unexpected-pass",
        },
      ],
    ]
    for (const [label, over] of cases) {
      const observations = observed(
        row({
          title: `ADM-13: ${label}`,
          annotations: [requirementsAnnotation("REQ-ADM-001", "REQ-ADM-002")],
          journal: [
            jstep("first", ["REQ-ADM-001"]),
            jstep("second", ["REQ-ADM-002"]),
          ],
          ...over,
        }),
      )
      expect([label, observations.map((o) => o.status)]).toEqual([
        label,
        ["pass", "pass"],
      ])
      expect([label, observations.map((o) => o.attribution)]).toEqual([
        label,
        ["step", "step"],
      ])
    }
  })

  it("a timedOut or interrupted row is a failure like any other, at its resolved step", () => {
    for (const status of ["timedOut", "interrupted"]) {
      const observations = observed(
        row({
          title: `ADM-14: ${status}`,
          annotations: [requirementsAnnotation("REQ-ADM-001")],
          status,
          // deriveOutcome folds both into `failed`; the reporter stores that, and the emitter
          // reads the outcome, so neither status needs a branch of its own.
          outcome: "failed",
          journal: [jstep("the checkpoint", ["REQ-ADM-001"])],
          failedDuring: { kind: "step", name: "the checkpoint", index: 1 },
          errorHead: "Error: Test timeout of 240000ms exceeded.",
        }),
      )
      expect([status, observations]).toEqual([
        status,
        [
          {
            requirementId: "REQ-ADM-001",
            status: "fail",
            attribution: "step",
            step: "the checkpoint",
            stepIndex: 1,
            // No failedAssertion: the head is Playwright's timeout text, not a message.
            error: "Error: Test timeout of 240000ms exceeded.",
          },
        ],
      ])
    }
  })

  it("a non-step site on a MULTI-requirement row is still exactly one unattributed observation", () => {
    // The shape the whole contract exists for: one setup failure on a row covering three
    // behaviours is one "we learned nothing here", not three broken capabilities. The row's own
    // steps report nothing either — nothing about them was resolved.
    for (const kind of [
      "arrange",
      "hook",
      "fixture",
      "teardown",
      "between",
      "unknown",
    ]) {
      const observations = observed(
        row({
          title: `ADM-15: ${kind}`,
          annotations: [
            requirementsAnnotation("REQ-ADM-001", "REQ-ADM-002", "REQ-ADM-003"),
          ],
          status: "failed",
          outcome: "failed",
          journal: [
            jstep("first", ["REQ-ADM-001"]),
            jstep("second", ["REQ-ADM-002"]),
          ],
          failedDuring: {
            kind,
            name: kind === "arrange" ? undefined : "somewhere",
          },
          errorHead: "Error: the fixture never came up",
        }),
      )
      expect([kind, observations]).toEqual([
        kind,
        [
          {
            requirementId: null,
            status: "unattributed",
            attribution: "row",
            error: "Error: the fixture never came up",
          },
        ],
      ])
    }
  })

  it("two steps declaring the same requirement are two observations, keyed by their indices", () => {
    expect(
      observed(
        row({
          title: "ADM-12: the same requirement twice",
          annotations: [requirementsAnnotation("REQ-ADM-001")],
          journal: [
            jstep("first pass", ["REQ-ADM-001"]),
            jstep("second pass", ["REQ-ADM-001"]),
          ],
        }),
      ).map((o) => [o.requirementId, o.stepIndex]),
      // Rule 7's row-level licence is for a requirement NO step named — these steps named it.
    ).toEqual([
      ["REQ-ADM-001", 1],
      ["REQ-ADM-001", 2],
    ])
  })
})

/* --------------------------------------------------------------------- the archive it writes -- */

/** ajv 8 with draft-2020, borrowed from the copy @commitlint/config-validator vendors. */
const ajvValidator = (schema: unknown) => {
  const Ajv =
    require("@commitlint/config-validator/node_modules/ajv/dist/2020") as {
      default?: new (o: unknown) => never
    }
  const Ctor = (Ajv.default ?? Ajv) as unknown as new (o: unknown) => {
    addFormat: (n: string, f: unknown) => void
    compile: (s: unknown) => {
      (d: unknown): boolean
      errors?: unknown[] | null
    }
  }
  const ajv = new Ctor({ allErrors: true, strict: false })
  // There is no ajv-formats to borrow; register the ones run.schema.json asserts, as the
  // validator itself does.
  ajv.addFormat("date-time", {
    validate: (s: string) =>
      !Number.isNaN(Date.parse(s)) && /\d{4}-\d{2}-\d{2}T/.test(s),
  })
  return ajv.compile(schema)
}

describe("the uat-run/3 archive the reporter writes", () => {
  let originalCwd: string
  let dir: string
  let originalSchemaEnv: string | undefined
  let originalArgv: string[]

  const writeRun = async (schemaEnv: string | undefined) => {
    const reporter = new SummaryReporter()
    const rows = fixtureRows()
    // `tests` is index-aligned with `uatTests` (both are pushed once per test in onTestEnd), and
    // onEnd syncs the serial-fallout relabel back onto it.
    ;(reporter as unknown as { tests: unknown[] }).tests = rows.map((t) => ({
      title: t.title,
      status: t.status,
      expectedStatus: t.expectedStatus,
      outcome: t.outcome,
      durationMs: t.durationMs,
      journal: t.journal,
      screenshots: [],
      agreements: [],
    }))
    ;(reporter as unknown as { uatTests: UatTest[] }).uatTests = rows
    if (schemaEnv === undefined) delete process.env.UAT_RUN_SCHEMA
    else process.env.UAT_RUN_SCHEMA = schemaEnv
    process.argv = ["node", "playwright", "test"]
    await reporter.onEnd({
      status: "failed",
      startTime: new Date("2026-01-03T00:00:00.000Z"),
      duration: 10,
    })
    return JSON.parse(
      readFileSync(join(dir, "uat-report", "run.json"), "utf8"),
    ) as {
      schema: string
      meta: { appCommit: string }
      tests: (UatTest & { observations: UatObservation[] })[]
    }
  }

  beforeEach(() => {
    originalCwd = process.cwd()
    originalArgv = process.argv
    originalSchemaEnv = process.env.UAT_RUN_SCHEMA
    dir = mkdtempSync(join(tmpdir(), "uat-run-3-test-"))
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    process.argv = originalArgv
    if (originalSchemaEnv === undefined) delete process.env.UAT_RUN_SCHEMA
    else process.env.UAT_RUN_SCHEMA = originalSchemaEnv
    rmSync(dir, { recursive: true, force: true })
  })

  it("stays on uat-run/2, and emits no observations, until UAT_RUN_SCHEMA=3 asks for them", async () => {
    const run = await writeRun(undefined)
    expect(run.schema).toBe("uat-run/2")
    for (const t of run.tests) {
      expect(t.observations).toBeUndefined()
      expect(t.requirements).toBeUndefined()
    }
  })

  it("validates against run.schema.json under UAT_RUN_SCHEMA=3", async () => {
    const run = await writeRun("3")
    expect(run.schema).toBe("uat-run/3")

    const validate = ajvValidator(JSON.parse(readFileSync(RUN_SCHEMA, "utf8")))
    const ok = validate(run)
    // Print the schema's own message rather than a bare `false` when this ever breaks.
    expect(ok ? [] : validate.errors).toEqual([])
    expect(ok).toBe(true)

    // Every row carries all three of the additions the schema requires, whatever it observed.
    for (const t of run.tests) {
      expect(Array.isArray(t.requirements)).toBe(true)
      expect(Array.isArray(t.observations)).toBe(true)
      expect(Array.isArray(t.journal)).toBe(true)
    }
    // And the uat-run/2 fields are all still there.
    const adm04 = run.tests.find((t) => t.uatId === "ADM-04")!
    expect(adm04.failedDuring).toEqual({
      kind: "step",
      name: "apply the override",
      index: 2,
    })
    expect(adm04.errorHead).toBe("Error: the override is applied to the market")
    expect(adm04.page).toBe(1)
  })

  /**
   * The trust boundary itself, run by the validator that owns it. The tool lives in the
   * capability-ledger notes repo rather than in this one, so the check is opt-in: set
   * `WILDCAT_LEDGER_TOOL` to its `ledger.mjs` and it runs L051-L062 against the archive above and
   * the minimal ledger fixture beside this suite.
   */
  const ledgerTool = process.env.WILDCAT_LEDGER_TOOL
  const maybe = ledgerTool && existsSync(ledgerTool) ? it : it.skip
  maybe(
    "passes the ledger tool's L051-L062 on the minimal ledger fixture",
    async () => {
      const run = await writeRun("3")
      const runPath = join(dir, "run.json")
      writeFileSync(runPath, JSON.stringify(run))

      // The fixture ledger pins a placeholder suite commit; the archive states the commit it was
      // really taken on. Tie the two together so L059's snapshot check compares a snapshot rather
      // than a fixture constant — provenance is not a property of the emission, and leaving them
      // to disagree would fail the check for a reason this test is not about.
      const ledger = JSON.parse(
        readFileSync(join(FIXTURES, "ledger.minimal.json"), "utf8"),
      )
      ledger.versions.v25.suiteCommit = run.meta.appCommit
      const ledgerPath = join(dir, "ledger.json")
      writeFileSync(ledgerPath, JSON.stringify(ledger))

      // The tool's exit code follows the VERDICT, and this fixture board is deliberately red (it
      // carries a failure and an unattributed one). A non-zero exit is therefore expected and says
      // nothing about the trust boundary — read the report, not the code.
      let raw: string
      try {
        raw = execFileSync(
          process.execPath,
          [
            ledgerTool as string,
            "check",
            ledgerPath,
            "--run-v25",
            runPath,
            "--run-schema",
            RUN_SCHEMA,
            "--inventory-v25",
            join(FIXTURES, "inventory.minimal.json"),
            "--only",
            "L051,L052,L053,L054,L055,L056,L057,L058,L059,L060,L061,L062",
            "--allow-partial",
            "--json",
          ],
          { encoding: "utf8", cwd: dir },
        )
      } catch (e) {
        const { stdout, stderr } = e as { stdout?: string; stderr?: string }
        if (!stdout)
          throw new Error(`ledger tool produced no report: ${stderr ?? e}`)
        raw = stdout
      }
      const report = JSON.parse(raw) as {
        runValid: boolean
        checks: { id: string; state: string; findings: string[] }[]
      }
      const failed = report.checks.filter((c) => c.state === "failed")
      expect(
        failed.flatMap((c) => c.findings.map((f) => `${c.id}  ${f}`)),
      ).toEqual([])
      expect(failed).toEqual([])
      expect(report.runValid).toBe(true)
      // And they RAN. A check reported `skipped` because an input was missing is not evidence that
      // the archive satisfies it, so name the states rather than only counting failures. L059 is
      // the exception: the fixture inventory is supplied as a file, which the tool cannot tie to a
      // commit, so its provenance half warns by design.
      const state = Object.fromEntries(
        report.checks.map((c) => [c.id, c.state]),
      )
      expect(state).toEqual({
        L051: "passed",
        L052: "passed",
        L053: "passed",
        L054: "passed",
        L055: "passed",
        L056: "passed",
        L057: "passed",
        L058: "passed",
        L059: "warned",
        L060: "passed",
        L061: "passed",
        L062: "passed",
      })
    },
  )
})
