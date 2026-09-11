import {
  headerDefects,
  parseCoverage,
  parseKnownIssues,
  releaseBlockers,
} from "../e2e/lib/knownIssues"

const MD = `# Known app issues

| # | Finding | Status | Tests |
|---|---|---|---|
| 1 | Deep links bounce during wallet reconnect | open | suites connect first <!-- ki: id=1 severity=medium status=open tests=- blocks=no --> |
| 20 | Periodic APR reduction cannot be applied | open | BOP-17 journals the revert <!-- ki: id=20 severity=blocker status=open tests=BOP-17,BOP-17b blocks=2.5 --> |
| 9 | HARNESS: fork subgraph could not serve the query | closed | — <!-- ki: id=9 severity=low status=closed tests=LEN-10 blocks=no --> |
| 21 | Borrower MLA bundle | product decision | BOP-27 <!-- ki: id=21 severity=medium status=owner-call tests=BOP-27 blocks=2.5 decision=pending --> |
`

describe("parseKnownIssues", () => {
  it("reads every machine header and its human title", () => {
    const issues = parseKnownIssues(MD)
    expect(issues.map((i) => i.id)).toEqual(["1", "20", "9", "21"])
    expect(issues[1]).toMatchObject({
      severity: "blocker",
      status: "open",
      tests: ["BOP-17", "BOP-17b"],
      blocks: "2.5",
      decisionPending: false,
    })
    expect(issues[1].title).toBe("Periodic APR reduction cannot be applied")
    expect(issues[0].tests).toEqual([])
    expect(issues[3].decisionPending).toBe(true)
  })

  it("release blockers exclude settled entries", () => {
    expect(releaseBlockers(parseKnownIssues(MD)).map((i) => i.id)).toEqual([
      "20",
      "21",
    ])
  })

  it("ignores rows with no header", () => {
    expect(parseKnownIssues("| 4 | something | open | — |")).toEqual([])
  })

  it("reports a well-formed file as defect-free", () => {
    expect(headerDefects(parseKnownIssues(MD))).toEqual([])
  })

  it("names every misspelled field instead of silently defaulting it", () => {
    const bad = parseKnownIssues(
      "| 7 | typo row | open | — <!-- ki: id=7 severty=blocker stauts=open tets=BOP-01 blcoks=2.5 --> |",
    )
    expect(bad).toHaveLength(1)
    // The silent-default behaviour is still what the report renders…
    expect(bad[0].severity).toBe("medium")
    expect(bad[0].status).toBe("open")
    expect(bad[0].blocks).toBeNull()
    // …but the defect list makes the typo impossible to ship.
    const defects = headerDefects(bad).join(" ")
    expect(defects).toMatch(/#7/)
    expect(defects).toMatch(/unknown field "severty"/)
    expect(defects).toMatch(/unknown field "stauts"/)
    expect(defects).toMatch(/unknown field "tets"/)
    expect(defects).toMatch(/unknown field "blcoks"/)
    expect(defects).toMatch(/no blocks= field/)
  })
})

describe("parseCoverage", () => {
  it("reads the untested-rows table and skips the header", () => {
    const rows = parseCoverage(`# Coverage notes

| UAT id | class | reason |
|---|---|---|
| ADM-06 | not yet tested here | no /profile/borrower route on main |
| LEN-23 | feature absent on main | periodic-term markets do not exist on main |
`)
    expect(rows).toEqual([
      {
        uatId: "ADM-06",
        klass: "not yet tested here",
        reason: "no /profile/borrower route on main",
      },
      {
        uatId: "LEN-23",
        klass: "feature absent on main",
        reason: "periodic-term markets do not exist on main",
      },
    ])
  })

  it("does not read a DIFFERENT (2-column) pipe table further down the file — those rows DO have a running test", () => {
    // main's COVERAGE.md shape: the untested-rows table, then a second, differently-shaped table
    // ("| UAT id | why it skips |") under its own heading, listing ids that skip at RUN TIME but
    // do have a real test. Before the fix a 2-column row's own cells were misread as
    // [uatId, klass, reason] with an empty reason, inflating the untested count and listing rows
    // that are not actually untested.
    const rows = parseCoverage(`# Coverage notes

| UAT id | class | reason |
|---|---|---|
| ADM-06 | not yet tested here | no /profile/borrower route on main |

## Present but skips at run time until a fixture exists

| UAT id | why it skips |
|---|---|
| BOP-02 | \`test.skip\` when the ops borrower's primary policy is self-onboarding |
| BOP-03 | \`test.skip\` when BOP-02 skipped (same policy fixture) |
`)
    expect(rows).toEqual([
      {
        uatId: "ADM-06",
        klass: "not yet tested here",
        reason: "no /profile/borrower route on main",
      },
    ])
    expect(rows.map((r) => r.uatId)).not.toContain("BOP-02")
    expect(rows.map((r) => r.uatId)).not.toContain("BOP-03")
  })
})
