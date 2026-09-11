/* eslint-disable no-nested-ternary */
import { buildOverlay } from "../e2e/lib/compare"
import type { Manifest } from "../e2e/lib/manifest"
import type { UatRun, UatTest } from "../e2e/lib/uatModel"

const row = (uatId: string, outcome: UatTest["outcome"]): UatTest => ({
  uatId,
  page: 5,
  title: `${uatId}: x`,
  file: "e2e/x.spec.ts",
  suite: "s",
  status:
    outcome === "passed"
      ? "passed"
      : outcome === "skipped"
        ? "skipped"
        : "failed",
  expectedStatus: "passed",
  outcome,
  annotations: [],
  durationMs: 1,
  journal: [],
  stepShots: [],
  agreements: [],
})

const run = (tests: UatTest[]): UatRun => ({
  schema: "uat-run/2",
  status: "passed",
  meta: {
    appCommit: "x",
    appDirty: false,
    appDirtyFiles: 0,
    build: "dev",
    sdk: "x",
    subgraphName: "x",
    subgraphDeployment: "x",
    forkBlock: 1,
    pinsSha256: "a".repeat(64),
    testMode: true,
    argv: [],
    mode: "full",
  },
  tests,
})

const manifest = (rows: Manifest["rows"]): Manifest => ({
  $schema: "comparison-manifest/1",
  variants: { a: "v2.5", b: "main" },
  rows,
})

describe("buildOverlay", () => {
  const v25 = run([
    row("LEN-01", "passed"),
    row("LEN-02", "passed"),
    row("LEN-23", "passed"),
    row("MKT-04", "passed"),
  ])
  const main = run([
    row("LEN-01", "passed"),
    row("LEN-02", "failed"),
    row("MKT-04", "expected-failure"),
    row("V2P-01", "passed"),
  ])
  const m = manifest({
    "LEN-01": { relation: "identical" },
    "LEN-02": { relation: "identical" },
    "LEN-23": {
      relation: "v25-only",
      reason: "periodic-term markets do not exist on main",
    },
    "V2P-01": { relation: "main-only", reason: "chain-level protocol suite" },
  })

  it("pairs by uat id and carries main's outcome and the relation", () => {
    const ov = buildOverlay(v25, main, m)
    expect(ov.byId.get("LEN-01")).toMatchObject({
      otherOutcome: "passed",
      relation: "identical",
      flags: [],
    })
    expect(ov.byId.get("LEN-23")).toMatchObject({
      otherOutcome: null,
      relation: "v25-only",
      flags: ["not in main"],
    })
  })

  it("flags REGRESSION? only when the manifest expects sameness and the verdicts differ", () => {
    const ov = buildOverlay(v25, main, m)
    expect(ov.byId.get("LEN-02")!.flags).toContain("REGRESSION?")
    // an expected failure on main is neither green nor red — never a regression flag
    expect(ov.byId.get("MKT-04")!.flags).not.toContain("REGRESSION?")
  })

  it("flags MANIFEST-STALE for an unclassified row and lists main-only rows separately", () => {
    const ov = buildOverlay(v25, main, m)
    expect(ov.byId.get("MKT-04")!.flags).toContain("MANIFEST-STALE")
    expect(ov.onlyInOther.map((c) => c.uatId)).toEqual(["V2P-01"])
    expect(ov.onlyInOther[0].flags).toEqual(["not in v2.5"])
  })

  it("works with no manifest at all (main's inert case)", () => {
    const ov = buildOverlay(v25, main, null)
    expect(
      [...ov.byId.values()].every((c) => c.flags.includes("MANIFEST-STALE")),
    ).toBe(true)
  })
})
