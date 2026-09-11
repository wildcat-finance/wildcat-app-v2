import type { Manifest } from "../e2e/lib/manifest"
import {
  assignPages,
  attributeDidNotRun,
  type UatRun,
  type UatTest,
} from "../e2e/lib/uatModel"
import { renderUatReport } from "../e2e/lib/uatReport"

const t = (
  p: Partial<UatTest> & { title: string; suite: string },
): UatTest => ({
  uatId:
    p.title.includes(":") && /^[A-Z]/.test(p.title)
      ? p.title.split(":")[0]
      : null,
  page: null,
  file: "e2e/x.spec.ts",
  status: "passed",
  expectedStatus: "passed",
  outcome: "passed",
  annotations: [],
  durationMs: 1_234,
  journal: [],
  stepShots: [],
  agreements: [],
  ...p,
})

const run = (): UatRun => {
  const tests = [
    t({ title: "setup: fixtures", suite: "market creation" }),
    t({
      title: "MKT-01: new policy created",
      suite: "market creation",
      page: 3,
    }),
    t({
      title: "BOP-17b: the permissionless APR reduction path",
      suite: "borrower ops",
      page: 4,
      status: "passed",
      expectedStatus: "failed",
      outcome: "unexpected-pass",
      annotations: [
        {
          type: "fail",
          description: "KNOWN-ISSUES #20: SphereX blocks the path",
        },
      ],
    }),
    t({
      title: "queue a withdrawal through the UI",
      suite:
        "e2e/withdrawal.spec.ts › lender withdrawal: queue → expiry → claim",
    }),
    // A genuine harness row, so page 99 exists at all — every other row in this fixture is filed
    // on a runsheet page, and groupByPage emits no section for a page with no tests.
    t({
      title: "stack is healthy and the pinned market exists",
      suite: "e2e/fork.smoke.spec.ts › local fork harness smoke",
    }),
    t({
      title: "MKT-18: Safe + MLA deployment",
      suite: "market creation",
      page: 3,
      status: "skipped",
      expectedStatus: "skipped",
      outcome: "skipped",
      annotations: [
        { type: "fixme", description: "no Safe infrastructure on the fork" },
      ],
      durationMs: 0,
    }),
    t({ title: "LEN-01: discovery", suite: "lender discovery", page: 5 }),
  ]
  assignPages(tests)
  attributeDidNotRun(tests)
  return {
    schema: "uat-run/2",
    status: "passed",
    startedAt: "2026-09-11T02:00:00.000Z",
    durationMs: 60_000,
    meta: {
      appCommit: "abc1234",
      appDirty: false,
      appDirtyFiles: 0,
      // Build kind is only ever set when derived from an app-side signal — none exists yet, so
      // the default fixture leaves it unset, same as a real run.
      build: undefined,
      sdk: "3.2.7-beta",
      subgraphName: "wildcat-sepolia-v2511",
      subgraphDeployment: "QmULCY",
      forkBlock: 11584253,
      pinsSha256: "a".repeat(64),
      testMode: true,
      argv: ["test", "--grep-invert", "BOP-14"],
      mode: "full",
    },
    tests,
  }
}

describe("renderUatReport", () => {
  it("renders provenance, page sections in runsheet order and a reason under a skipped row", () => {
    const html = renderUatReport(run(), {
      knownIssuesMd:
        "| 20 | SphereX blocks the permissionless path | open | BOP-17b <!-- ki: id=20 severity=blocker status=open tests=BOP-17b blocks=2.5 --> |",
      coverageMd:
        "| UAT id | class | reason |\n| LEN-23 | feature absent on main | no periodic markets |",
    })
    expect(html).toContain("3 Market Creation")
    expect(html).toContain("5 Lender Flows")
    expect(html).toContain("Harness rows")
    expect(html.indexOf("3 Market Creation")).toBeLessThan(
      html.indexOf("5 Lender Flows"),
    )
    expect(html).toContain("abc1234")
    expect(html).toContain("wildcat-sepolia-v2511")
    expect(html).toContain("sha256:aaaaaaaaaaaaaaaa")
    expect(html).toContain("release blocker(s)")
    expect(html).toContain("no Safe infrastructure on the fork")
    expect(html).toContain('id="uat-MKT-18"')
    expect(html).toMatch(/<span class="badge skip">skipped<\/span>/)
    expect(html).toContain("LEN-23")
    expect(html).not.toContain("<script src")
    expect(html).not.toContain("http://cdn")
  })

  it("renders an unexpected pass as its own card, never as a failure card", () => {
    const html = renderUatReport(run())
    expect(html).toContain('id="uat-BOP-17b"')
    expect(html).toContain("and it PASSED")
    expect(html).toContain("KNOWN-ISSUES #20: SphereX blocks the path")
    // The two strings renderFailedCard would have produced for a row with no failure media.
    expect(html).not.toContain(
      "No failure screenshot (page was already closed).",
    )
    expect(html).not.toContain("Test failed (no error message)")
  })

  it("files an id-less suite under its SUITE_PAGE_OVERRIDES page, with the display note", () => {
    const html = renderUatReport(run())
    expect(html).toContain(
      "(unnumbered lifecycle suite, predates the runsheet ids)",
    )
    // The withdrawal row sits inside the page-5 section, not the harness section.
    const page5 = html.indexOf('id="page-5"')
    const harness = html.indexOf('id="page-99"')
    const row = html.indexOf("queue a withdrawal through the UI")
    expect(page5).toBeGreaterThan(-1)
    expect(row).toBeGreaterThan(page5)
    expect(row).toBeLessThan(harness)
  })

  it("renders the main-comparison overlay when a comparison run and manifest are given", () => {
    const other: UatRun = {
      ...run(),
      // LEN-01 is deliberately NOT here: the manifest below marks it "v25-only", i.e. main does
      // NOT exercise it — including it in "other" too would contradict the manifest row
      // (checkCompleteness would call that an error) and teach the wrong fixture shape.
      tests: [
        t({
          title: "V2P-01: protocol invariant",
          suite: "protocol suite",
          page: 90,
        }),
      ],
    }
    const manifest: Manifest = {
      $schema: "comparison-manifest/1",
      variants: { a: "v2.5", b: "main" },
      rows: {
        "LEN-01": {
          relation: "v25-only",
          reason: "no periodic markets on main",
        },
        "V2P-01": {
          relation: "main-only",
          reason: "chain-level protocol suite",
        },
      },
    }
    const html = renderUatReport(run(), { other, manifest })
    expect(html).toContain("main:")
    expect(html).toMatch(/<span class="rel">v25-only<\/span>/)
    expect(html).toContain("Rows main ran that this branch does not have")
  })

  it("labels a declared fixme/skip with no reason string distinctly from a runtime skip, and cites the KNOWN-ISSUES entry that names it", () => {
    const withFixmes: UatRun = {
      ...run(),
      tests: [
        ...run().tests,
        // Cited by a KNOWN-ISSUES tests= header below.
        t({
          title: "LEN-28: wrapper lifecycle, legacy generation",
          suite: "wrappers-transfers",
          page: 5,
          status: "skipped",
          expectedStatus: "skipped",
          outcome: "skipped",
          annotations: [{ type: "fixme" }],
          durationMs: 0,
        }),
        // NOT cited by any KNOWN-ISSUES entry.
        t({
          title: "LEN-29: wrapper lifecycle, legacy generation (unwrap)",
          suite: "wrappers-transfers",
          page: 5,
          status: "skipped",
          expectedStatus: "skipped",
          outcome: "skipped",
          annotations: [{ type: "fixme" }],
          durationMs: 0,
        }),
        // A genuine runtime skip with no annotation at all — the old wording still applies here.
        t({
          title: "LEN-30: wrapper lifecycle, legacy generation (closure)",
          suite: "wrappers-transfers",
          page: 5,
          status: "skipped",
          expectedStatus: "skipped",
          outcome: "skipped",
          annotations: [],
          durationMs: 0,
        }),
      ],
    }
    const html = renderUatReport(withFixmes, {
      knownIssuesMd:
        "| 30 | Wrapper lifecycle not yet ported | open | LEN-28 <!-- ki: id=30 severity=low status=open tests=LEN-28 blocks=no --> |",
    })
    expect(html).toContain(
      "fixme declared in the spec (no reason string) — see KNOWN-ISSUES #30 Wrapper lifecycle not yet ported",
    )
    // LEN-29 gets the same base wording but with no citation appended (bounded to its own row so
    // an earlier LEN-28 citation elsewhere in the document can't leak into this assertion).
    const len29Start = html.indexOf('id="uat-LEN-29"')
    const len30Start = html.indexOf('id="uat-LEN-30"')
    expect(len29Start).toBeGreaterThan(-1)
    expect(len30Start).toBeGreaterThan(len29Start)
    const len29Section = html.slice(len29Start, len30Start)
    expect(len29Section).toContain(
      "fixme declared in the spec (no reason string)",
    )
    expect(len29Section).not.toContain("see KNOWN-ISSUES")
    // A real runtime skip (no annotation) keeps the old wording.
    expect(html).toContain("skipped — no reason recorded by the test")
  })

  it("never claims an unobserved provenance value: absent buildId, unobserved build kind, and testMode only when the env was applied", () => {
    const base = run()

    // Neither worktree's reporter process has a .next/BUILD_ID, and (before this fix) nothing
    // loaded harness/fork/.env.fork into it either — buildId absent, envApplied not set. `build`
    // is also unset on `base.meta`, matching the reporter: it has no app-side signal to derive
    // dev/prod from, so it must not assert either one.
    const unobserved = renderUatReport({
      ...base,
      meta: {
        ...base.meta,
        buildId: undefined,
        envApplied: undefined,
        testMode: true,
      },
    })
    expect(unobserved).toContain("not observed from the app")
    expect(unobserved).toContain("kind not observed from the app")
    expect(unobserved).not.toContain("no BUILD_ID (dev server)")
    expect(unobserved).not.toMatch(/badge (ok|warn)">(prod|dev)/)
    expect(unobserved).not.toMatch(/badge bad">off/)
    expect(unobserved).not.toMatch(/<dt>Test mode<\/dt><dd>on/)
    expect(unobserved.match(/not observed/g)?.length).toBeGreaterThanOrEqual(2)

    // Once an app-side signal for build kind does exist, it renders as an observed badge next
    // to the buildId — this is the shape a future week's honest signal would produce.
    const buildObserved = renderUatReport({
      ...base,
      meta: { ...base.meta, buildId: "abcd1234", build: "prod" },
    })
    expect(buildObserved).toContain('<span class="badge ok">prod</span>')
    expect(buildObserved).not.toContain("kind not observed from the app")

    // envApplied: true — the board script confirmed .env.fork was loaded, so the observed value
    // is trustworthy and renders as on/off, same as buildId renders as the real string once
    // observed.
    const appliedOff = renderUatReport({
      ...base,
      meta: {
        ...base.meta,
        buildId: "abcd1234",
        envApplied: true,
        testMode: false,
      },
    })
    expect(appliedOff).toContain('<span class="mono">abcd1234</span>')
    expect(appliedOff).toContain('<span class="badge bad">off</span>')

    const appliedOn = renderUatReport({
      ...base,
      meta: {
        ...base.meta,
        buildId: "abcd1234",
        build: "prod",
        envApplied: true,
        testMode: true,
      },
    })
    expect(appliedOn).toMatch(/<dt>Test mode<\/dt><dd>on/)
    expect(appliedOn).not.toMatch(/badge bad">off/)
    expect(appliedOn).not.toContain("not observed")
  })
})

/**
 * Row detail: the expanded row must read top to bottom as a narrative — what the test did, what
 * it verified, the transactions, then the artefacts — with nothing from the recorded JSON lost.
 */
describe("renderUatReport row detail", () => {
  const runOf = (tests: UatTest[]): UatRun => {
    assignPages(tests)
    return { ...run(), tests }
  }

  /** The HTML of one row, from its anchor to the start of the next row/section. */
  const sectionOf = (html: string, anchor: string): string => {
    const start = html.indexOf(`id="${anchor}"`)
    expect(start).toBeGreaterThan(-1)
    const rest = html.slice(start + 1)
    const next = rest.search(/id="(uat-|row-|page-)/)
    return next >= 0 ? rest.slice(0, next) : rest
  }

  const APR_ROW = (): UatTest =>
    t({
      title: "LEN-07: parameters name the UTILISATION APR",
      suite: "lender flows",
      page: 5,
      startedAt: "2026-09-11T02:00:00.000Z",
      durationMs: 9_000,
      journal: [
        {
          at: "2026-09-11T02:00:00.500Z",
          kind: "nav",
          url: "http://localhost:3001/lender",
        },
        {
          at: "2026-09-11T02:00:01.000Z",
          kind: "step",
          name: "the lender opens the market page",
        },
        {
          at: "2026-09-11T02:00:02.000Z",
          kind: "nav",
          url: "http://localhost:3001/lender/market/0x1234567890abcdef1234567890abcdef12345678",
        },
        // The client router fires framenavigated twice for the same route; the note collapses.
        {
          at: "2026-09-11T02:00:02.100Z",
          kind: "nav",
          url: "http://localhost:3001/lender/market/0x1234567890abcdef1234567890abcdef12345678",
        },
        {
          at: "2026-09-11T02:00:04.000Z",
          kind: "step",
          name: "parameters name the UTILISATION APR",
        },
        {
          at: "2026-09-11T02:00:05.000Z",
          kind: "tx",
          hash: "0xfeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface",
          status: "success",
          block: "11584301",
          gasUsed: "84213",
          fn: "setAnnualInterestBips",
        },
      ],
      agreements: [
        {
          name: "agreement: parameters name the UTILISATION APR",
          json: {
            note: "the APR the page shows is the utilisation APR, not the base APR",
            marketAddress: "0x1234567890abcdef1234567890abcdef12345678",
            annualInterestBips: 1000,
            totalSupply: "1000000000000000000000",
            isClosed: false,
            blocksObserved: 12500,
            chainId: 11155111,
            onChain: { baseApr: "10.00%", utilisationApr: "12.34%" },
            rows: [
              { label: "Base APR", ui: "10.00%", chain: "10.00%" },
              { label: "Utilisation APR", ui: "12.34%", chain: "12.34%" },
            ],
          },
        },
      ],
    })

  it("narrates a green row's steps with durations, and notes the navigations and transactions inside each step", () => {
    const html = renderUatReport(runOf([APR_ROW()]))
    const row = sectionOf(html, "uat-LEN-07")

    expect(row).toContain("What happened")
    expect(row).toContain("the lender opens the market page")
    expect(row).toContain("parameters name the UTILISATION APR")
    // Step 1 spans 02:00:01 → 02:00:04; the last step runs to startedAt + durationMs (02:00:09).
    expect(row).toContain("3.0s")
    expect(row).toContain("5.0s")
    // A navigation inside a step reads as a route, with the long hex shortened.
    expect(row).toContain("→ /lender/market/0x1234…5678")
    // …and the full URL stays reachable on hover.
    expect(row).toContain(
      'title="http://localhost:3001/lender/market/0x1234567890abcdef1234567890abcdef12345678"',
    )
    // A transaction inside a step reads as one short note.
    expect(row).toContain("tx setAnnualInterestBips · success · block 11584301")
    // The navigation before the first step is attributed, not silently dropped.
    expect(row).toContain("Before the first checkpoint:")
    // A repeated navigation to the same route is collapsed to one note.
    expect(row.match(/→ \/lender\/market\/0x1234…5678/g)?.length).toBe(1)
    // Sections in narrative order.
    expect(row.indexOf("What happened")).toBeLessThan(
      row.indexOf("What was verified"),
    )
    expect(row.indexOf("What was verified")).toBeLessThan(
      row.indexOf("Transactions"),
    )
    // The old dump is gone.
    expect(row).not.toContain("Reproduction timeline")
  })

  it("renders an agreement as an evidence card: note first, readable keys, nested objects indented, object arrays as a table, raw JSON still reachable", () => {
    const html = renderUatReport(runOf([APR_ROW()]))
    const row = sectionOf(html, "uat-LEN-07")

    // The heading drops the "agreement:" prefix.
    expect(row).toContain(
      '<h4 class="ev-head">parameters name the UTILISATION APR</h4>',
    )
    expect(row).not.toContain("agreement: parameters name")
    // The note leads, as a sentence.
    expect(row).toContain(
      '<p class="ev-note">the APR the page shows is the utilisation APR, not the base APR</p>',
    )
    // camelCase keys spaced into words; known acronyms kept.
    expect(row).toContain("<dt>Market address</dt>")
    expect(row).toContain("<dt>Annual interest bips</dt>")
    expect(row).toContain("<dt>Is closed</dt>")
    expect(row).toContain("<dt>Utilisation APR</dt>")
    // Booleans as yes/no.
    expect(row).toMatch(/<dt>Is closed<\/dt><dd>no<\/dd>/)
    // Addresses shortened, full value on hover.
    expect(row).toContain(
      '<span class="mono" title="0x1234567890abcdef1234567890abcdef12345678">0x1234…5678</span>',
    )
    // Plain counts get separators; a bips value, an identifier and a bigint-like string do not.
    expect(row).toContain("12,500")
    expect(row).toMatch(/<dt>Chain ID<\/dt><dd>11155111<\/dd>/)
    expect(row).not.toContain("11,155,111")
    expect(row).toMatch(/<dt>Annual interest bips<\/dt><dd>1000<\/dd>/)
    expect(row).toContain("1000000000000000000000")
    expect(row).not.toContain("1,000,000,000,000,000,000,000")
    // Nested object as an indented sub-list, array of objects as a table with the union of keys.
    expect(row).toContain('<div class="ev-nest">')
    expect(row).toContain('<table class="ev-table">')
    expect(row).toContain("<th>Label</th>")
    expect(row).toContain("<th>UI</th>")
    expect(row).toContain("<th>Chain</th>")
    // Nothing is lost: the exact JSON is one click away.
    expect(row).toContain('<details class="raw"><summary>raw</summary>')
    expect(row).toContain("&quot;totalSupply&quot;")
  })

  it("renders a string agreement as prose and an empty or unparsable one as 'no data recorded'", () => {
    const row = t({
      title: "V2P-02: the market reports its own generation",
      suite: "live v2 protocol",
      page: 90,
      agreements: [
        {
          name: "agreement: why the row is amber",
          json: "the subgraph lagged the chain by two blocks; the UI caught up on the next poll",
        },
        { name: "agreement: nothing to compare", json: {} },
        { name: "agreement: unparsable attachment", json: undefined },
      ],
    })
    const html = renderUatReport(runOf([row]))
    const section = sectionOf(html, "uat-V2P-02")

    expect(section).toContain(
      '<p class="ev-prose">the subgraph lagged the chain by two blocks; the UI caught up on the next poll</p>',
    )
    // Both the empty object and the attachment that would not parse SAY so, rather than
    // rendering a heading with nothing under it (what V2P-02/V2P-03 showed on the 09-08 board).
    expect(section).toContain('<h4 class="ev-head">nothing to compare</h4>')
    expect(section).toContain('<h4 class="ev-head">unparsable attachment</h4>')
    expect(section.match(/no data recorded/g)?.length).toBe(2)
  })

  it("marks the checkpoint a failed row died at, and keeps the narrative above the evidence", () => {
    const row = t({
      title: "BOP-09: the borrower reduces the APR",
      suite: "borrower ops",
      page: 4,
      status: "failed",
      outcome: "failed",
      startedAt: "2026-09-11T02:00:00.000Z",
      durationMs: 12_000,
      errorHead: "expect(locator).toContainText(expected)",
      failedDuring: {
        kind: "step",
        name: "the new APR appears on the market page",
        index: 2,
      },
      failureShot: "assets/t9-failure.png",
      journal: [
        {
          at: "2026-09-11T02:00:01.000Z",
          kind: "step",
          name: "the borrower submits the APR reduction",
        },
        {
          at: "2026-09-11T02:00:03.000Z",
          kind: "tx",
          hash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
          status: "reverted",
          block: "11584310",
          gasUsed: "21000",
          fn: "setAnnualInterestBips",
        },
        {
          at: "2026-09-11T02:00:06.000Z",
          kind: "step",
          name: "the new APR appears on the market page",
        },
      ],
      agreements: [
        {
          name: "agreement: APR on the page after the reduction",
          json: { expected: "8.00%", observed: "10.00%" },
        },
      ],
    })
    const html = renderUatReport(runOf([row]))
    const section = sectionOf(html, "uat-BOP-09")

    expect(section).toContain('<span class="badge bad">failed here</span>')
    expect(section).toContain('class="step step-failed"')
    // Inside the narrative (the hero's "Failed during checkpoint …" line names the step too),
    // the step that PASSED comes first and is not marked.
    const narrative = section.slice(
      section.indexOf("What happened"),
      section.indexOf("What was verified"),
    )
    const submitted = narrative.indexOf(
      "the borrower submits the APR reduction",
    )
    const appeared = narrative.indexOf("the new APR appears on the market page")
    expect(submitted).toBeGreaterThan(-1)
    expect(submitted).toBeLessThan(appeared)
    expect(narrative.slice(submitted, appeared)).not.toContain("failed here")
    // A reverted tx inside the step is flagged.
    expect(section).toContain(
      "tx setAnnualInterestBips · reverted · block 11584310",
    )
    // Narrative first, then the evidence, then the transactions, then the artefacts.
    expect(section.indexOf("What happened")).toBeLessThan(
      section.indexOf("What was verified"),
    )
    expect(section.indexOf("What was verified")).toBeLessThan(
      section.indexOf("Transactions"),
    )
    expect(section.indexOf("Transactions")).toBeLessThan(
      section.indexOf("Artefacts"),
    )
    // The film strip must not claim the row ran without checkpoints — it just listed two.
    expect(section).toContain("the checkpoints above did run")
    expect(section).not.toContain("ran without <code>step()</code> checkpoints")
    // The failure screenshot still leads the card.
    expect(section).toContain("assets/t9-failure.png")
    expect(section.indexOf("assets/t9-failure.png")).toBeLessThan(
      section.indexOf("What happened"),
    )
  })

  it("says so plainly when a row carries no journal, and never emits unescaped agreement content", () => {
    const bare = t({
      title: "LEN-11: links and copy on Status & Details",
      suite: "lender discovery",
      page: 5,
    })
    const nasty = t({
      title: "EDG-04: hostile copy round-trips",
      suite: "edge & regression",
      page: 10,
      agreements: [
        {
          name: 'agreement: <img src=x onerror="alert(1)">',
          json: {
            "<b>key</b>": '<script>alert("x")</script>',
            quote: 'he said "no" & left',
          },
        },
      ],
    })
    const html = renderUatReport(runOf([bare, nasty]))

    expect(sectionOf(html, "uat-LEN-11")).toContain(
      "No steps were journalled for this row",
    )
    // Neither the label, the keys, nor the values may reach the document as markup.
    expect(html).not.toContain("<img src=x")
    expect(html).not.toContain("<script>alert")
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
    expect(html).toContain("he said &quot;no&quot; &amp; left")
  })
})
