import {
  HARNESS_PAGE,
  MAIN_ONLY_PROBE_PAGE,
  MAIN_ONLY_PROTOCOL_PAGE,
  annotationReason,
  assignPages,
  attributeDidNotRun,
  deriveOutcome,
  groupByPage,
  parseUatId,
  runsheetPageOf,
  suitePageOverride,
  type UatTest,
} from "../e2e/lib/uatModel"

const row = (
  p: Partial<UatTest> & { title: string; suite: string },
): UatTest => ({
  uatId: parseUatId(p.title),
  page: runsheetPageOf(parseUatId(p.title)),
  file: "e2e/x.spec.ts",
  status: "passed",
  expectedStatus: "passed",
  outcome: "passed",
  annotations: [],
  durationMs: 1,
  journal: [],
  stepShots: [],
  agreements: [],
  ...p,
})

describe("parseUatId", () => {
  it.each([
    [
      "LEN-07b: back from a borrower profile returns to the lender area",
      "LEN-07b",
    ],
    ["V2P-01: deploy a fixed-term market on the protocol", "V2P-01"],
    ["MKT-M01: the create-market template latch", "MKT-M01"],
    [
      "M5: an undefined fixedTermEndTime reproduces `invalid BigNumber value`",
      "M5",
    ],
    ["BOP-06-UI: borrow through the Borrow modal", "BOP-06-UI"],
    ["BON-03: the invited borrower accepts and is registered", "BON-03"],
    [
      "BOP-14b: 2-week jump — lock expires, borrower resets the ratio",
      "BOP-14b",
    ],
    ["LEN-23c: the market re-locks on schedule", "LEN-23c"],
  ])("parses %s", (title, id) => expect(parseUatId(title)).toBe(id))

  it.each([
    "setup: fixtures — chain time, funds, borrower profile row, registration",
    "teardown: suite left the shared fixtures intact",
    "stack is healthy and the pinned market exists",
  ])("returns null for harness row %s", (title) =>
    expect(parseUatId(title)).toBeNull(),
  )
})

describe("runsheetPageOf", () => {
  it("maps prefixes to runsheet pages", () => {
    expect(runsheetPageOf("ADM-01")).toBe(1)
    expect(runsheetPageOf("BON-03")).toBe(2)
    expect(runsheetPageOf("MKT-04")).toBe(3)
    expect(runsheetPageOf("BOP-17b")).toBe(4)
    expect(runsheetPageOf("LEN-35")).toBe(5)
    expect(runsheetPageOf("WRP-01")).toBe(6)
    expect(runsheetPageOf("WAL-05")).toBe(7)
    expect(runsheetPageOf("EDG-12")).toBe(10)
  })
  it("files the main-only suites separately", () => {
    expect(runsheetPageOf("V2P-09")).toBe(MAIN_ONLY_PROTOCOL_PAGE)
    expect(runsheetPageOf("MKT-M01")).toBe(MAIN_ONLY_PROTOCOL_PAGE)
    expect(runsheetPageOf("M5")).toBe(MAIN_ONLY_PROBE_PAGE)
  })
  it("returns null for an unprefixed row", () =>
    expect(runsheetPageOf(null)).toBeNull())
})

describe("deriveOutcome", () => {
  it.each([
    [{ status: "passed", expectedStatus: "passed" }, "passed"],
    [{ status: "passed", expectedStatus: "passed", retry: 1 }, "flaky"],
    [{ status: "failed", expectedStatus: "passed" }, "failed"],
    [{ status: "timedOut", expectedStatus: "passed" }, "failed"],
    [{ status: "interrupted", expectedStatus: "passed" }, "failed"],
    [{ status: "failed", expectedStatus: "failed" }, "expected-failure"],
    [{ status: "timedOut", expectedStatus: "failed" }, "expected-failure"],
    [{ status: "passed", expectedStatus: "failed" }, "unexpected-pass"],
    [{ status: "skipped", expectedStatus: "skipped" }, "skipped"],
  ])("%j -> %s", (input, expected) =>
    expect(deriveOutcome(input)).toBe(expected),
  )
})

describe("attributeDidNotRun", () => {
  it("names the failure that stopped the serial tail, and leaves real skips alone", () => {
    const tests = [
      row({ title: "BOP-01: a", suite: "S1", outcome: "passed" }),
      row({
        title: "BOP-02: b",
        suite: "S1",
        outcome: "failed",
        status: "failed",
        durationMs: 500,
      }),
      row({
        title: "BOP-03: c",
        suite: "S1",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
      }),
      row({
        title: "BOP-04: d",
        suite: "S1",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
        annotations: [
          { type: "fixme", description: "needs an allowlist fixture" },
        ],
      }),
      row({
        title: "LEN-01: e",
        suite: "S2",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
      }),
    ]
    attributeDidNotRun(tests)
    expect(tests[1].outcome).toBe("failed")
    expect(tests[2].outcome).toBe("did-not-run")
    expect(tests[2].blockedBy).toBe("BOP-02")
    expect(tests[3].outcome).toBe("skipped")
    expect(annotationReason(tests[3].annotations)).toBe(
      "needs an allowlist fixture",
    )
    expect(tests[4].outcome).toBe("skipped")
    expect(tests[4].blockedAcrossSuites).toBeUndefined()
  })

  it("falls back to a run-wide blocker when the failure was the last row of its own suite", () => {
    // The worker-crash / fatal-error case: S1's failure is the LAST row S1 reported, and the tail
    // of a DIFFERENT suite arrives zero-duration and unannotated.
    const tests = [
      row({ title: "BOP-01: a", suite: "S1", outcome: "passed" }),
      row({
        title: "BOP-02: b",
        suite: "S1",
        outcome: "failed",
        status: "failed",
        durationMs: 500,
      }),
      row({
        title: "LEN-01: c",
        suite: "S2",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
      }),
      row({
        title: "LEN-02: d",
        suite: "S2",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
      }),
    ]
    attributeDidNotRun(tests)
    expect(tests[2].outcome).toBe("did-not-run")
    expect(tests[2].blockedBy).toBe("BOP-02")
    expect(tests[2].blockedAcrossSuites).toBe(true)
    expect(tests[3].blockedAcrossSuites).toBe(true)
  })

  it("never relabels a declared skip/fixme row, in the same-suite branch, even though it is zero-duration and follows a failure", () => {
    const tests = [
      row({
        title: "WAL-05: a",
        suite: "S1",
        outcome: "failed",
        status: "failed",
        durationMs: 500,
      }),
      row({
        title: "WAL-06: b — unannotated mass-skip tail",
        suite: "S1",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
      }),
      row({
        title: "WAL-01: c — declared fixme, no reason string",
        suite: "S1",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
        annotations: [{ type: "fixme" }],
      }),
      row({
        title: "WAL-02: d — declared skip, with a reason string",
        suite: "S1",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
        annotations: [
          { type: "skip", description: "not supported on this wallet" },
        ],
      }),
    ]
    attributeDidNotRun(tests)

    // (a) unannotated skipped row -> did-not-run, blockedBy the earlier failure.
    expect(tests[1].outcome).toBe("did-not-run")
    expect(tests[1].blockedBy).toBe("WAL-05")

    // (b) declared fixme, no description -> stays skipped, no blockedBy.
    expect(tests[2].outcome).toBe("skipped")
    expect(tests[2].blockedBy).toBeUndefined()

    // (c) declared skip, with a reason -> stays skipped, no blockedBy.
    expect(tests[3].outcome).toBe("skipped")
    expect(tests[3].blockedBy).toBeUndefined()
  })

  it("never relabels a declared fixme row in the run-wide fallback branch", () => {
    // Same worker-crash / fatal-error shape as the test above, but the row that would otherwise
    // be caught by the cross-suite fallback carries a declared fixme annotation.
    const tests = [
      row({ title: "BOP-01: a", suite: "S1", outcome: "passed" }),
      row({
        title: "BOP-02: b",
        suite: "S1",
        outcome: "failed",
        status: "failed",
        durationMs: 500,
      }),
      row({
        title: "LEN-01: c — declared fixme after the run-wide stop",
        suite: "S2",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
        annotations: [{ type: "fixme" }],
      }),
    ]
    attributeDidNotRun(tests)
    expect(tests[2].outcome).toBe("skipped")
    expect(tests[2].blockedBy).toBeUndefined()
    expect(tests[2].blockedAcrossSuites).toBeUndefined()
  })

  it("does not reach across suites when the failing suite kept running afterwards", () => {
    const tests = [
      row({
        title: "BOP-02: b",
        suite: "S1",
        outcome: "failed",
        status: "failed",
        durationMs: 500,
      }),
      row({
        title: "BOP-03: c",
        suite: "S1",
        outcome: "passed",
        durationMs: 400,
      }),
      row({
        title: "LEN-01: d",
        suite: "S2",
        outcome: "skipped",
        status: "skipped",
        durationMs: 0,
      }),
    ]
    attributeDidNotRun(tests)
    expect(tests[2].outcome).toBe("skipped")
    expect(tests[2].blockedBy).toBeUndefined()
  })
})

describe("assignPages / groupByPage", () => {
  it("files unprefixed rows under their suite's page and orders sections by runsheet page", () => {
    const tests = [
      row({ title: "setup: fixtures", suite: "market-creation" }),
      row({ title: "MKT-01: policy", suite: "market-creation" }),
      row({ title: "teardown: intact", suite: "market-creation" }),
      row({ title: "LEN-01: discovery", suite: "discovery" }),
      row({ title: "stack is healthy", suite: "fork.smoke" }),
    ]
    assignPages(tests)
    expect(tests.map((t) => t.page)).toEqual([3, 3, 3, 5, HARNESS_PAGE])
    const groups = groupByPage(tests)
    expect(groups.map((g) => g.page)).toEqual([3, 5, HARNESS_PAGE])
    expect(groups[0].suites[0].tests).toHaveLength(3)
    expect(groups[0].counts.passed).toBe(3)
  })

  it("uses SUITE_PAGE_OVERRIDES for a suite where NO row has an id, and leaves the smoke suite on the harness page", () => {
    const withdrawal =
      "e2e/withdrawal.spec.ts › lender withdrawal: queue → expiry → claim"
    const smoke = "e2e/fork.smoke.spec.ts › local fork harness smoke"
    const tests = [
      row({
        title: "setup: fund and deposit through the chain",
        suite: withdrawal,
      }),
      row({ title: "queue a withdrawal through the UI", suite: withdrawal }),
      row({
        title: "claim through the UI; final state agrees everywhere",
        suite: withdrawal,
      }),
      row({
        title: "stack is healthy and the pinned market exists",
        suite: smoke,
      }),
    ]
    assignPages(tests)
    expect(tests.map((t) => t.page)).toEqual([5, 5, 5, HARNESS_PAGE])
    expect(tests.every((t) => t.uatId === null)).toBe(true)
    expect(suitePageOverride(withdrawal)?.note).toBe(
      "(unnumbered lifecycle suite, predates the runsheet ids)",
    )
    expect(suitePageOverride(smoke)).toBeUndefined()
  })
})
