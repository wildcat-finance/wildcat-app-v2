/* eslint-disable no-nested-ternary */
import type { Inventory, InvKind } from "../e2e/lib/inventory"
import {
  checkCompleteness,
  validateManifest,
  type Manifest,
} from "../e2e/lib/manifest"
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

/** An inventory from a list of `"<id>"` or `"<id>:<kind>"` entries. */
const inv = (...entries: string[]): Inventory =>
  entries.map((e) => {
    const [id, kind] = e.split(":")
    return {
      id,
      file: "e2e/x.spec.ts",
      kind: (kind ?? "test") as InvKind,
      title: `${id}: x`,
    }
  })

const manifest = (rows: Manifest["rows"]): Manifest => ({
  $schema: "comparison-manifest/1",
  variants: { a: "v2.5", b: "main" },
  rows,
})

describe("validateManifest", () => {
  it("rejects a bad id, a bad relation and a reasonless non-identical row", () => {
    const errs = validateManifest(
      manifest({
        "LEN-01": { relation: "identical" },
        "len-02": { relation: "identical" },
        "LEN-03": { relation: "nonsense" as never },
        "LEN-04": { relation: "v25-only" },
      }),
    )
    // FOUR, not three: LEN-03 trips both rules in the loop — the relation is unknown AND, not
    // being "identical", it needs a reason it does not have. The rules are independent by design;
    // a row with a typo'd relation and no reason has two things wrong with it.
    expect(errs).toHaveLength(4)
    expect(errs.join("\n")).toMatch(/len-02: not a UAT id/)
    expect(errs.join("\n")).toMatch(/LEN-03: unknown relation "nonsense"/)
    expect(errs.join("\n")).toMatch(/LEN-03: relation nonsense needs a reason/)
    expect(errs.join("\n")).toMatch(/LEN-04: relation v25-only needs a reason/)
  })
})

describe("checkCompleteness", () => {
  const invV25 = inv("LEN-01", "LEN-02", "LEN-23", "BOP-14")
  const invMain = inv("LEN-01", "LEN-02", "V2P-01", "BOP-14", "LEN-28:fixme")
  const v25 = run([
    row("LEN-01", "passed"),
    row("LEN-02", "passed"),
    row("LEN-23", "passed"),
  ])
  const main = run([
    row("LEN-01", "passed"),
    row("LEN-02", "failed"),
    row("V2P-01", "passed"),
  ])
  const full = manifest({
    "LEN-01": { relation: "identical" },
    "LEN-02": { relation: "identical" },
    "LEN-23": { relation: "v25-only", reason: "no periodic markets on main" },
    "V2P-01": { relation: "main-only", reason: "protocol suite" },
    "BOP-14": { relation: "identical" },
    "LEN-28": {
      relation: "untested-on-main",
      reason: "wrapper lifecycle not yet ported",
    },
  })

  it("requires a row for every id either branch DECLARES", () => {
    const { errors } = checkCompleteness(
      manifest({ "LEN-01": { relation: "identical" } }),
      v25,
      main,
      { v25: invV25, main: invMain },
    )
    expect(errors.join("\n")).toMatch(
      /V2P-01: declared on a branch with no manifest row/,
    )
    expect(errors.join("\n")).toMatch(
      /BOP-14: declared on a branch with no manifest row/,
    )
  })

  it("does not fault an id the board's own --grep-invert removed; it records it", () => {
    // BOP-14 is declared on both branches and in NEITHER run — exactly what `npm run board` does.
    const { errors, notes } = checkCompleteness(
      full,
      v25,
      main,
      { v25: invV25, main: invMain },
      {
        exclude: /BOP-14/,
      },
    )
    expect(errors).toEqual([])
    expect(notes.join("\n")).toMatch(
      /BOP-14: not executed on the v2\.5 board \(excluded by --exclude BOP-14\)/,
    )
    expect(notes.join("\n")).toMatch(/BOP-14: not executed on the main board/)
  })

  it("warns — never errors — when a declared id is missing from a run and no filter explains it", () => {
    const { errors, warnings } = checkCompleteness(full, v25, main, {
      v25: invV25,
      main: invMain,
    })
    expect(errors).toEqual([])
    expect(warnings.join("\n")).toMatch(
      /BOP-14: not executed on the v2\.5 board \(filtered or did not run\)/,
    )
  })

  it("treats a fixme'd id as present-but-skipped, and says so", () => {
    const { errors, warnings } = checkCompleteness(
      full,
      v25,
      main,
      { v25: invV25, main: invMain },
      {
        exclude: /BOP-14/,
      },
    )
    expect(errors.join("\n")).not.toMatch(/LEN-28/)
    expect(warnings.join("\n")).toMatch(
      /LEN-28: untested-on-main, but main HAS a test for it that is skipped\/fixme/,
    )
  })

  it("fails a duplicate id in an inventory", () => {
    const { errors } = checkCompleteness(
      manifest({ "LEN-01": { relation: "identical" } }),
      null,
      null,
      { v25: inv("LEN-01", "LEN-01"), main: inv("LEN-01") },
    )
    expect(errors.join("\n")).toMatch(/v2\.5: duplicate UAT id LEN-01/)
  })

  it("fails a relation the branches contradict, and warns on a regression candidate", () => {
    const { errors, warnings } = checkCompleteness(
      manifest({
        "LEN-01": { relation: "identical" },
        "LEN-02": { relation: "identical" },
        "LEN-23": { relation: "identical" },
        "V2P-01": { relation: "main-only", reason: "protocol suite" },
        "BOP-14": { relation: "identical" },
        "LEN-28": {
          relation: "untested-on-main",
          reason: "wrapper lifecycle not yet ported",
        },
        "BOP-31": { relation: "identical", absent: "both" },
      }),
      v25,
      main,
      { v25: invV25, main: invMain },
      { exclude: /BOP-14/ },
    )
    expect(errors.join("\n")).toMatch(
      /LEN-23: relation identical but main has no such test/,
    )
    expect(errors.join("\n")).not.toMatch(/BOP-31/)
    expect(warnings.join("\n")).toMatch(/LEN-02: REGRESSION\?/)
  })

  it("fails a manifest row neither branch declares, unless it says absent:both", () => {
    const { errors } = checkCompleteness(
      manifest({ "LEN-99": { relation: "identical" } }),
      null,
      null,
      { v25: inv(), main: inv() },
    )
    expect(errors.join("\n")).toMatch(
      /LEN-99: manifest row with no test on either branch/,
    )
  })
})
