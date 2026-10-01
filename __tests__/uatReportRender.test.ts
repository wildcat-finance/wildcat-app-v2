import type { Manifest } from "../e2e/lib/manifest"
import {
  assignPages,
  attributeDidNotRun,
  type UatRun,
  type UatTest,
} from "../e2e/lib/uatModel"
import { anchorOf, renderUatReport } from "../e2e/lib/uatReport"
import { verdictOf } from "../e2e/lib/verdict"

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
  it("emits no empty line in the provenance header when a run carries no markets index", () => {
    const html = renderUatReport(run())
    const dl = html.slice(html.indexOf('<section class="prov">'), html.indexOf("</section>", html.indexOf('<section class="prov">')))
    expect(dl).not.toMatch(/\n\s*\n/)
    expect(dl).not.toContain("Markets")
  })
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
    // A uat-run/2 `test.fail()` row has no ledger known issue to name: the annotation stands in.
    expect(html).toContain(
      "Passed where a failure was expected (&quot;KNOWN-ISSUES #20: SphereX blocks the path&quot;). Either the issue is fixed or the check no longer exercises it.",
    )
    expect(html).toContain("<b>Next:</b> register owner")
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

    expect(row).not.toContain("What happened")
    expect(row).toContain(
      '<span class="step-name">the lender opens the market page</span>',
    )
    expect(row).toContain(
      '<span class="step-name">parameters name the UTILISATION APR</span>',
    )
    // Step 1 spans 02:00:01 → 02:00:04; the last step runs to startedAt + durationMs (02:00:09).
    expect(row).toContain("3.0s")
    expect(row).toContain("5.0s")
    // A navigation inside a step reads as a route, with the long hex shortened.
    expect(row).toContain("→ /lender/market/0x1234…5678")
    // …and the full URL stays reachable on hover.
    expect(row).toContain(
      'title="http://localhost:3001/lender/market/0x1234567890abcdef1234567890abcdef12345678"',
    )
    // A transaction sits inline in its checkpoint: call, status, block, short hash.
    const tx = row.slice(row.indexOf('class="ev tx'))
    expect(tx).toContain('<code class="tx-call">setAnnualInterestBips</code>')
    expect(tx).toContain('<span class="txmeta ok">success</span>')
    expect(tx).toContain("block 11584301")
    expect(tx).toContain("0xfeedface…")
    // …inside the second checkpoint, not the first.
    expect(row.indexOf('class="ev tx')).toBeGreaterThan(
      row.indexOf("parameters name the UTILISATION APR</span>"),
    )
    // The navigation before the first step is attributed, not silently dropped.
    expect(row).toContain("arrange — before the first checkpoint")
    // A repeated navigation to the same route is collapsed to one note.
    expect(row.match(/→ \/lender\/market\/0x1234…5678/g)?.length).toBe(1)
    // One timeline: the checkpoints, then the evidence; the separate tables are gone.
    expect(row.indexOf('<span class="step-name">')).toBeLessThan(
      row.indexOf('<h4 class="ev-head">'),
    )
    expect(row).not.toContain("What was verified")
    expect(row).not.toContain("<h3>Transactions</h3>")
    expect(row).not.toContain('<table class="txs">')
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

    expect(section).toContain('<span class="here">failed here</span>')
    expect(section).toContain('class="tl-node step failed"')
    // Inside the timeline (the verdict's "Failed during checkpoint …" line names the step too),
    // the step that PASSED comes first and is not marked.
    const narrative = section.slice(
      section.indexOf('<ol class="tl">'),
      section.indexOf('class="tl-node verdict'),
    )
    const submitted = narrative.indexOf(
      "the borrower submits the APR reduction",
    )
    const appeared = narrative.indexOf("the new APR appears on the market page")
    expect(submitted).toBeGreaterThan(-1)
    expect(submitted).toBeLessThan(appeared)
    expect(narrative.slice(submitted, appeared)).not.toContain("failed here")
    // A reverted tx inside the step is flagged.
    expect(section).toContain('class="ev tx bad"')
    expect(section).toContain('<span class="txmeta bad">reverted</span>')
    // Checkpoints, then the evidence, then the verdict block with the failure screenshot.
    expect(section.indexOf('<span class="step-name">')).toBeLessThan(
      section.indexOf('<h4 class="ev-head">'),
    )
    expect(section.indexOf('<h4 class="ev-head">')).toBeLessThan(
      section.indexOf('class="tl-node verdict'),
    )
    expect(section).toContain("assets/t9-failure.png")
    expect(section.indexOf('class="tl-node verdict')).toBeLessThan(
      section.indexOf("assets/t9-failure.png"),
    )
    // The verdict block: error head, then the page-state line and the stack toggle.
    expect(section).toContain(
      '<div class="headline">expect(locator).toContainText(expected)</div>',
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

  /**
   * A failed row whose ONLY variable is the failure site the reporter recorded for it, so the
   * prose under test is the only thing that can differ between the cases below.
   */
  const siteRow = (failedDuring: UatTest["failedDuring"]): UatTest =>
    t({
      title: "LEN-42: the lender claims a matured withdrawal",
      suite: "lender flows",
      page: 5,
      status: "failed",
      outcome: "failed",
      startedAt: "2026-09-11T02:00:00.000Z",
      durationMs: 7_000,
      errorHead: "expect(locator).toBeVisible()",
      failedDuring,
      journal: [
        {
          at: "2026-09-11T02:00:01.000Z",
          kind: "step",
          name: "the lender opens the claims tab",
        },
        {
          at: "2026-09-11T02:00:04.000Z",
          kind: "step",
          name: "the matured amount is claimable",
        },
      ],
    })

  const siteProse = (failedDuring: UatTest["failedDuring"]): string =>
    sectionOf(renderUatReport(runOf([siteRow(failedDuring)])), "uat-LEN-42")

  it("gives every uat-run/3 failure site its own wording, and never cites a position the site does not have", () => {
    // `uat-run/2` only ever wrote step / arrange / between. A native `uat-run/3` row can carry
    // hook, fixture, teardown and unknown as well, and none of those four has a journal index —
    // before this, all four fell through to "Failed after checkpoint ? (#undefined)".
    const cases: {
      site: NonNullable<UatTest["failedDuring"]>
      says: string
      alsoNames?: string
    }[] = [
      {
        site: { kind: "hook", name: "Before Hooks" },
        says: "Failed in a test hook before/after the body",
        alsoNames: "Before Hooks",
      },
      {
        site: { kind: "fixture", name: "fixture: page" },
        says: "Failed while a fixture was set up or torn down",
        alsoNames: "fixture: page",
      },
      {
        site: { kind: "teardown", name: "After Hooks" },
        says: "Failed during teardown, after the last checkpoint",
        alsoNames: "After Hooks",
      },
      {
        site: { kind: "unknown", name: "a raw test.step nobody journalled" },
        says: "Failed outside any journalled checkpoint (site not attributable)",
        alsoNames: "a raw test.step nobody journalled",
      },
    ]

    for (const { site, says, alsoNames } of cases) {
      const section = siteProse(site)
      expect(section).toContain(says)
      if (alsoNames) expect(section).toContain(alsoNames)
      // Neither the /2 wording nor a position it never had.
      expect(section).not.toContain("#undefined")
      expect(section).not.toContain("Failed <b>after</b> checkpoint")
      expect(section).not.toContain("Failed during checkpoint")
    }
  })

  it("keeps the uat-run/2 wording for step, arrange and between, and drops the index when a /3 between has none", () => {
    const step = siteProse({
      kind: "step",
      name: "the matured amount is claimable",
      index: 2,
    })
    expect(step).toContain(
      "Failed during checkpoint <b>the matured amount is claimable</b> (#2).",
    )

    expect(siteProse({ kind: "arrange" })).toContain(
      "<b>setup/arrange phase</b>",
    )

    const between = siteProse({
      kind: "between",
      name: "the matured amount is claimable",
      index: 2,
    })
    expect(between).toContain("Failed <b>after</b> checkpoint")
    expect(between).toContain("(#2)")

    // `/3` writes `between` with NO index when the journal never recorded that checkpoint.
    const positionless = siteProse({
      kind: "between",
      name: "a checkpoint the journal never saw",
    })
    expect(positionless).toContain(
      "Failed <b>after</b> checkpoint <b>a checkpoint the journal never saw</b>, before the next",
    )
    expect(positionless).not.toContain("#undefined")
  })

  it("highlights the journalled checkpoint for a step site only — the sites with no position mark none", () => {
    const step = siteProse({
      kind: "step",
      name: "the matured amount is claimable",
      index: 2,
    })
    expect(step).toContain('<span class="here">failed here</span>')
    expect(step).toContain('class="tl-node step failed"')

    for (const site of [
      { kind: "hook", name: "Before Hooks" },
      { kind: "fixture", name: "fixture: page" },
      { kind: "teardown", name: "After Hooks" },
      // Same NAME as a journalled checkpoint: an unattributable site must still not claim it.
      { kind: "unknown", name: "the matured amount is claimable" },
      { kind: "arrange" },
    ]) {
      const section = siteProse(site)
      expect(section).not.toContain("failed here")
      expect(section).not.toContain("tl-node step failed")
    }
  })
})

describe("market provenance — chain time in the narrative", () => {
  it("narrates a chain-time entry inside its step as “chain time +N s → <ISO>”", () => {
    const r = run()
    const row = r.tests.find((x) => x.uatId === "LEN-01")!
    row.journal = [
      {
        at: "2026-09-26T07:00:00.000Z",
        kind: "step",
        name: "let the batch expire",
      },
      {
        at: "2026-09-26T07:00:01.000Z",
        kind: "chain-time",
        seconds: 3_600,
        fromTs: 1_790_402_521,
        toTs: 1_790_406_122,
        block: "11584664",
      },
    ]
    const html = renderUatReport(r)
    expect(html).toContain("chain time +3,600 s → 2026-09-26T07:02:02Z")
  })
})

describe("market provenance — the Markets summary and each row's “How this state was reached”", () => {
  const CREATED = `0x${"c".repeat(40)}`
  const FORKED = "0x07878e16a64ed6daacebe8a6537902a048de8f2d"
  const LATE = `0x${"d".repeat(40)}`
  const GONE = `0x${"e".repeat(40)}`
  const H = (d: string) => `0x${d.repeat(64)}`

  const byTitle = (r: UatRun, title: string) =>
    r.tests.find((x) => x.title === title)!
  const withdrawalAnchor = (r: UatRun) =>
    anchorOf(byTitle(r, "queue a withdrawal through the UI"))
  const bopAnchor = (r: UatRun) =>
    anchorOf(byTitle(r, "BOP-17b: the permissionless APR reduction path"))

  /**
   * One created market touched by three rows in run order — the creator (MKT-01), a deposit row
   * with a chain-time jump (LEN-01), a withdrawal row — and then a LATER row (BOP-17b). One forked
   * market LEN-01 also touched. A created market outside the journal and an unresolved one.
   */
  const withMarkets = (): UatRun => {
    const r = run()
    r.schema = "uat-run/3"
    r.markets = [
      {
        address: CREATED,
        name: "Created Market",
        origin: "created",
        createdBy: {
          row: "MKT-01",
          anchor: "uat-MKT-01",
          block: "11584300",
          txHash: H("1"),
        },
        type: {
          term: "fixed-term",
          kind: "revolving",
          asset: "DAI 0x4f148643e3a5ac817ca68f7083da20f7283966c5",
          config: {
            maturity: "2026-10-29T00:00:00Z",
            allowClosureBeforeTerm: true,
            allowTermReduction: false,
            commitmentFeeBips: 200,
            depositRequiresAccess: true,
            transfersDisabled: false,
          },
        },
        txs: [
          {
            seq: 1,
            row: "MKT-01",
            anchor: "uat-MKT-01",
            during: "deploy",
            block: "11584300",
            from: "account #3 (borrower)",
            call: "deployMarketAndHooks(…)",
            status: "success",
            hash: H("1"),
            kind: "tx",
          },
          {
            seq: 2,
            row: "LEN-01",
            anchor: "uat-LEN-01",
            block: "11584301",
            call: "depositUpTo(amount: 100 DAI)",
            status: "success",
            hash: H("2"),
            kind: "tx",
          },
          {
            seq: 3,
            row: "LEN-01",
            anchor: "uat-LEN-01",
            block: "11584302",
            call: "chain time +3,600 s → 2026-09-26T07:02:02Z",
            kind: "chain-time",
          },
          {
            seq: 4,
            row: "queue a withdrawal through the UI",
            anchor: withdrawalAnchor(r),
            block: "11584303",
            call: "queueWithdrawal(amount: 40 DAI)",
            status: "reverted",
            hash: H("3"),
            kind: "tx",
          },
          {
            seq: 5,
            row: "BOP-17b",
            anchor: bopAnchor(r),
            block: "11584304",
            call: "setAnnualInterestBips(apr: 5.00%)",
            status: "success",
            hash: H("4"),
            kind: "tx",
          },
        ],
        derivedAt: "run",
      },
      {
        address: FORKED,
        name: "TEST DAI KW 3",
        origin: "forked",
        forkBlock: 11584253,
        type: {
          term: "open-term",
          kind: "standard",
          asset: "DAI 0x112bdd9b1649898c2ab2ed8f8866fc46a2eb52e6",
          config: { depositRequiresAccess: false, transfersDisabled: false },
        },
        txs: [
          {
            seq: 1,
            row: "LEN-01",
            anchor: "uat-LEN-01",
            block: "11584305",
            call: "approve(spender: market, amount: 5 DAI)",
            status: "success",
            hash: H("5"),
            kind: "tx",
          },
        ],
        derivedAt: "run",
      },
      {
        address: LATE,
        origin: "created",
        type: {
          term: "periodic-term",
          kind: "standard",
          config: {
            periodDuration: 1_800,
            withdrawalWindowDuration: 3_600,
            firstWithdrawalWindowStart: "2026-09-29T21:10:00Z",
            depositRequiresAccess: true,
            transfersDisabled: false,
          },
        },
        txs: [],
        derivedAt: "run",
      },
      {
        address: GONE,
        name: 'market "Gone"',
        origin: "unknown",
        txs: [],
        derivedAt: "render",
      },
    ]
    return r
  }

  /** The row's "starting state" timeline nodes, or "" when it has none. */
  const reachedOf = (html: string, anchor: string): string => {
    const at = html.indexOf(`id="${anchor}"`)
    expect(at).toBeGreaterThan(-1)
    const rest = html.slice(at + 1)
    const next = rest.search(/id="(uat-|row-|page-)/)
    const row = next >= 0 ? rest.slice(0, next) : rest
    const s = row.indexOf('<li class="tl-node state">')
    if (s === -1) return ""
    const after = row
      .slice(s + 1)
      .search(/class="tl-node (?!state")|<details class="harness"/)
    return after === -1 ? row.slice(s) : row.slice(s, s + 1 + after)
  }
  /** The steps of one market's block inside a row's section, as text. */
  const stepsOf = (section: string, addr: string): string[] => {
    const at = section.indexOf(`href="#market-${addr}"`)
    expect(at).toBeGreaterThan(-1)
    const block = section.slice(at, section.indexOf("</ol>", at))
    return (block.match(/<li[^>]*>[\s\S]*?<\/li>/g) ?? []).map((li) =>
      li
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
  }

  it("the summary table: one row per market with origin, type and config chips — no tx or rows column", () => {
    const html = renderUatReport(withMarkets())
    expect(html).toContain(
      '<section class="markets" id="markets" data-tab-pane="markets">',
    )
    expect(html).toContain("<h2>Markets in this run</h2>")
    expect(html).toContain(
      "4 markets · 2 created by this run · 1 forked · 1 unresolved",
    )
    const table = html.slice(
      html.indexOf('<table class="summary">'),
      html.indexOf("</table>", html.indexOf('<table class="summary">')),
    )
    expect(table).toContain(
      "<th>market</th><th>origin</th><th>type</th><th>config relevant to the type</th></tr>",
    )
    expect(table).not.toContain("<th>txs</th>")
    expect(table).not.toContain("<th>rows</th>")
    expect(table).toContain(`<tr id="market-${CREATED}">`)
    expect(table).toContain(
      'created by <a href="#uat-MKT-01">MKT-01</a> at block 11584300',
    )
    expect(table).toContain("forked at block 11584253")
    expect(table).toContain(
      "created after the fork, outside this run's journal",
    )
    expect(table).toContain("origin unknown")
    expect(table).toContain("<b>Fixed term · revolving</b>")
    expect(table).toContain("<b>Open term · standard</b>")
    expect(table).toContain("<b>Periodic term · standard</b>")
    expect(table).toContain(
      '<span class="chip"><span class="k">maturity</span> 2026-10-29T00:00:00Z</span>',
    )
    expect(table).toContain(
      '<span class="chip"><span class="k">commitmentFeeBips</span> 200</span>',
    )
    // Durations humanised, timestamps ISO.
    expect(table).toContain(
      '<span class="chip"><span class="k">periodDuration</span> 30 min</span>',
    )
    expect(table).toContain(
      '<span class="chip"><span class="k">withdrawalWindowDuration</span> 1 h</span>',
    )
    expect(table).toContain(
      '<span class="chip"><span class="k">firstWithdrawalWindowStart</span> 2026-09-29T21:10:00Z</span>',
    )
    // No facts: no type.
    const gone = table.slice(table.indexOf(`id="market-${GONE}"`))
    expect(gone.slice(0, gone.indexOf("</tr>"))).toContain(
      '<span class="muted">unknown</span>',
    )
    // The summary is its own tab, after every page; no per-market cards.
    expect(html.indexOf('<section class="markets"')).toBeGreaterThan(
      html.indexOf('data-tab-pane="page-'),
    )
    expect(html).not.toContain('<details class="market"')
    expect(html).not.toContain("Parameters as deployed")
  })

  it("the summary shortens an infra creator row to 24 characters, the full title in `title`", () => {
    const r = withMarkets()
    const title =
      "provision: register the borrower and deploy the open-term fixtures via the factory"
    r.markets![0].createdBy = {
      row: title,
      anchor: "row-provision-register",
      block: "11584300",
      txHash: H("1"),
    }
    const html = renderUatReport(r)
    const table = html.slice(
      html.indexOf('<table class="summary">'),
      html.indexOf("</table>", html.indexOf('<table class="summary">')),
    )
    expect(table).toContain(
      `created by <a href="#row-provision-register" title="${title}">provision: register the…</a> at block 11584300`,
    )
    // The row's own section keeps the full title.
    expect(html).toContain(
      `created by <a href="#row-provision-register">${title}</a> at block 11584300`,
    )
  })

  it("the provenance header carries the market counts", () => {
    const html = renderUatReport(withMarkets())
    const prov = html.slice(
      html.indexOf('<section class="prov">'),
      html.indexOf("</section>", html.indexOf('<section class="prov">')),
    )
    expect(prov).toMatch(
      /Markets<\/dt>\s*<dd>2 created · 1 forked · 1 unresolved/,
    )
    expect(renderUatReport(run())).not.toMatch(/Markets<\/dt>/)
  })

  it("the withdrawal row: creation, the deposit, the chain time as earlier actions — its own tx and nothing after", () => {
    const r = withMarkets()
    const html = renderUatReport(r)
    const sec = reachedOf(html, withdrawalAnchor(r))
    expect(sec).toContain('<div class="tl-kicker">starting state</div>')
    expect(sec).toContain("3 earlier actions by rows MKT-01, LEN-01")
    expect(stepsOf(sec, CREATED)).toEqual([
      "MKT-01: created the market — deployMarketAndHooks(…) (block 11584300)",
      "LEN-01: depositUpTo(amount: 100 DAI) (block 11584301)",
      "LEN-01: chain time +3,600 s (1 h) (block 11584302)",
    ])
    expect(sec).not.toContain("queueWithdrawal")
    expect(sec).not.toContain("setAnnualInterestBips")
    // The chain-time step keeps the target time in a title.
    expect(sec).toContain('title="2026-09-26T07:02:02Z"')
    // Header: name — type · origin, then the chips.
    expect(sec).toMatch(
      new RegExp(
        `<a href="#market-${CREATED}"[^>]*>Created Market</a> — <b>Fixed term · revolving</b> · created by <a href="#uat-MKT-01">MKT-01</a> at block 11584300`,
      ),
    )
    expect(sec).toContain(
      '<span class="chip"><span class="k">maturity</span> 2026-10-29T00:00:00Z</span>',
    )
    // The starting state leads the timeline: it is the card's first node.
    const row = html.slice(html.indexOf(`id="${withdrawalAnchor(r)}"`))
    expect(row.indexOf('<li class="tl-node state">')).toBe(
      row.indexOf('<li class="tl-node'),
    )
  })

  it("a reverted earlier action says so", () => {
    const r = withMarkets()
    const html = renderUatReport(r)
    expect(stepsOf(reachedOf(html, bopAnchor(r)), CREATED)).toContain(
      "queue a withdrawal through the UI: queueWithdrawal(amount: 40 DAI) reverted (block 11584303)",
    )
  })

  it("the creator row has no earlier actions and says it created the market", () => {
    const html = renderUatReport(withMarkets())
    const sec = reachedOf(html, "uat-MKT-01")
    expect(sec).toContain("created by this row at block 11584300")
    expect(sec).toContain("No earlier actions — this row created it.")
    expect(sec).not.toContain('<details class="prior"')
  })

  it("a row touching two markets gets one block each; a forked market carries the fork note", () => {
    const html = renderUatReport(withMarkets())
    const sec = reachedOf(html, "uat-LEN-01")
    expect(sec.match(/<li class="tl-node state">/g)).toHaveLength(2)
    expect(stepsOf(sec, CREATED)).toEqual([
      "MKT-01: created the market — deployMarketAndHooks(…) (block 11584300)",
    ])
    expect(sec).toContain("No earlier actions on it in this run.")
    expect(sec).toContain("forked at block 11584253")
    expect(sec).toContain(
      "state before the fork block is Sepolia's and not shown",
    )
    // The fork note belongs to the forked market's block only.
    expect(sec.match(/state before the fork block/g)).toHaveLength(1)
    expect(sec).toContain("time travel outside a row is not journaled")
  })

  it("a row that touched no market gets no starting state, and the old “Markets touched” line is gone", () => {
    const html = renderUatReport(withMarkets())
    expect(
      reachedOf(html, anchorOf(byTitle(withMarkets(), "LEN-01: discovery"))),
    ).not.toBe("")
    ;[
      "setup: fixtures",
      "stack is healthy and the pinned market exists",
    ].forEach((title) =>
      expect(reachedOf(html, anchorOf(byTitle(withMarkets(), title)))).toBe(""),
    )
    expect(html).not.toContain("Markets touched")
  })

  it("a row's only chain-time entry does not make it a toucher", () => {
    const r = withMarkets()
    r.markets![0].txs.push({
      seq: 6,
      row: "stack is healthy and the pinned market exists",
      anchor: anchorOf(
        byTitle(r, "stack is healthy and the pinned market exists"),
      ),
      block: "11584306",
      call: "chain time +60 s",
      kind: "chain-time",
    })
    const html = renderUatReport(r)
    expect(
      reachedOf(
        html,
        anchorOf(byTitle(r, "stack is healthy and the pinned market exists")),
      ),
    ).toBe("")
  })

  it("notes a render-time derivation once, in the summary", () => {
    const html = renderUatReport(withMarkets())
    expect(
      html.match(
        /derived at render time from the journal; created markets could not be resolved against the current fork/g,
      ),
    ).toHaveLength(1)
  })

  it("renders no section for an absent or empty index", () => {
    expect(renderUatReport(run())).not.toContain('class="markets"')
    expect(renderUatReport(run())).not.toContain('class="tl-node state"')
    const empty = run()
    empty.markets = []
    expect(renderUatReport(empty)).not.toContain('class="markets"')
    expect(renderUatReport(empty)).not.toContain('class="tl-node state"')
  })
})

/**
 * The per-test card (2026-10-01 redesign): a header line, a verdict sentence derived from the
 * row's data, one timeline (starting state → arrange → checkpoints → verdict block) and a closed
 * harness footer.
 */
describe("per-test card — verdict sentence", () => {
  const M9_LEDGER = {
    version: "main",
    decision: "expect-failure",
    reason:
      "ledger: known defect on main — REQ-BOP-070 (main#M9). A failure is only excused if it matches the signature.",
    requirements: [
      {
        requirementId: "REQ-BOP-070",
        known: true,
        storedApplicability: "required",
        effectiveApplicability: "required",
        implementation: "known-defect",
        coverage: "automated",
      },
    ],
    knownIssues: [
      {
        register: "main",
        id: "M9",
        signature: {
          requirementId: "REQ-BOP-070",
          assertion: "a backdrop click does not dismiss the completion dialog",
        },
      },
    ],
  }
  const STEP = "clicking outside does not dismiss the dialog"

  /** MKT-20 on main: a known-defect row; `assertion` is what the run failed on. */
  const mkt20 = (assertion: string, signature: "match" | "no-match") =>
    t({
      title: "MKT-20: the completion dialog stays until dismissed",
      suite: "market creation",
      page: 3,
      status: "failed",
      expectedStatus: signature === "match" ? "failed" : "passed",
      outcome: signature === "match" ? "expected-failure" : "failed",
      requirements: ["REQ-BOP-070"],
      errorHead: `Error: ${assertion}`,
      failedDuring: { kind: "step", name: STEP, index: 1 },
      annotations: [
        { type: "requirements", description: "REQ-BOP-070" },
        { type: "ledger", description: JSON.stringify(M9_LEDGER) },
        { type: "fail", description: M9_LEDGER.reason },
        ...(signature === "no-match"
          ? [{ type: "ledger-signature", description: "no-match" }]
          : []),
      ],
      journal: [
        {
          at: "2026-09-29T20:40:54.000Z",
          kind: "step",
          name: STEP,
          req: ["REQ-BOP-070"],
        },
        {
          at: "2026-09-29T20:41:27.000Z",
          kind: "data",
          name: "ledger signature",
          data: {
            result: signature,
            observed: { step: STEP, failedAssertion: assertion },
          },
        },
      ],
      observations: [
        {
          requirementId: "REQ-BOP-070",
          status: "fail",
          attribution: "step",
          step: STEP,
          stepIndex: 1,
          failedAssertion: assertion,
          error: `Error: ${assertion}`,
        },
      ],
    })

  it("expected failure, signature matched: names the known issue and the version; no Next", () => {
    const v = verdictOf(
      mkt20("a backdrop click does not dismiss the completion dialog", "match"),
    )
    expect(v.sentence).toBe(
      "Failed as known issue M9 predicts (expected on main).",
    )
    expect(v.next).toBeUndefined()
    expect(v.open).toBe(true)
  })

  it("expected failure, no match: quotes both assertions and refuses the attribution", () => {
    const v = verdictOf(
      mkt20(
        "an Escape press does not dismiss the completion dialog",
        "no-match",
      ),
    )
    expect(v.sentence).toBe(
      'Failed, but not the way known issue M9 predicts. M9 expects "a backdrop click does not dismiss the completion dialog" to fail; this run failed on "an Escape press does not dismiss the completion dialog". Not attributed to M9.',
    )
    expect(v.next).toBe("engineering — compare the two assertions")
    expect(v.sentence).not.toContain("signature mismatch")
  })

  it("unexpected pass against a ledger known issue", () => {
    const row = mkt20("unused", "match")
    const v = verdictOf({
      ...row,
      status: "passed",
      expectedStatus: "failed",
      outcome: "unexpected-pass",
      errorHead: undefined,
      failedDuring: undefined,
      observations: [],
    })
    expect(v.sentence).toBe(
      "Passed where known issue M9 predicted a failure. Either the issue is fixed or the check no longer exercises it.",
    )
    expect(v.next).toBe("register owner")
  })

  /** MKT-10b on v2.5: a finding under a proposed intentionally-different ruling. */
  const mkt10b = (applicabilityStatus: "proposed" | "approved") =>
    t({
      title: "MKT-10b: the sidebar gates each step",
      suite: "market creation › findings under proposed rulings",
      page: 3,
      status: "failed",
      outcome: "failed",
      requirements: ["REQ-BOP-139"],
      errorHead: "Error: each sidebar step is gated on the previous one",
      failedDuring: {
        kind: "step",
        name: "the sidebar chain gates each step on the previous one",
        index: 1,
      },
      annotations: [
        {
          type: "ledger",
          description: JSON.stringify({
            version: "v25",
            decision: "run",
            reason: "ledger: v25 owes these behaviours and can exercise them",
            requirements: [
              {
                requirementId: "REQ-BOP-139",
                known: true,
                storedApplicability: "intentionally-different",
                applicabilityStatus,
                effectiveApplicability: "required",
                implementation: "unknown",
                coverage: "automated",
              },
            ],
          }),
        },
      ],
      journal: [
        {
          at: "2026-09-25T18:00:00.000Z",
          kind: "step",
          name: "the sidebar chain gates each step on the previous one",
          req: ["REQ-BOP-139"],
        },
      ],
      observations: [
        {
          requirementId: "REQ-BOP-139",
          status: "fail",
          attribution: "step",
          step: "the sidebar chain gates each step on the previous one",
          stepIndex: 1,
          failedAssertion: "each sidebar step is gated on the previous one",
        },
      ],
    })

  it("a proposed intentionally-* ruling is read from the ledger annotation, never the suite title", () => {
    const v = verdictOf(mkt10b("proposed"))
    expect(v.sentence).toBe(
      "Fails the proposed behaviour; product ruling pending (REQ-BOP-139).",
    )
    expect(v.next).toBe("product")
    // Same suite title, approved ruling: an ordinary attributed failure.
    expect(verdictOf(mkt10b("approved")).kind).toBe("did-not-hold")
  })

  it("an attributed failure: the failed assertion did not hold", () => {
    const v = verdictOf(mkt10b("approved"))
    expect(v.sentence).toBe(
      "each sidebar step is gated on the previous one did not hold (REQ-BOP-139).",
    )
    expect(v.next).toBe("engineering")
  })

  it("an arrange failure did not reach the behaviour under test", () => {
    const v = verdictOf(
      t({
        title: "LEN-05: deposit appears in the lender's positions",
        suite: "lender flows",
        status: "failed",
        outcome: "failed",
        requirements: ["REQ-LEN-010"],
        errorHead: "TimeoutError: page.goto: Timeout 30000ms exceeded.",
        failedDuring: { kind: "arrange" },
        observations: [
          { requirementId: null, status: "unattributed", attribution: "row" },
        ],
      }),
    )
    expect(v.sentence).toBe(
      "Did not reach the behaviour under test: broke while arranging — page.goto: Timeout 30000ms exceeded. Nothing proven or disproven.",
    )
    expect(v.next).toBe("engineering — triage fixture / app state")
  })

  /** A uat-run/3 failed row whose only variable is its failure site; two journalled checkpoints. */
  const siteVerdict = (failedDuring: UatTest["failedDuring"]) =>
    verdictOf(
      t({
        title: "LEN-40: the lender claims a matured withdrawal",
        suite: "lender flows",
        status: "failed",
        outcome: "failed",
        requirements: ["REQ-LEN-130", "REQ-LEN-131"],
        errorHead: "TimeoutError: locator.click: Timeout 5000ms exceeded.",
        failedDuring,
        journal: [
          {
            at: "2026-09-29T20:00:01.000Z",
            kind: "step",
            name: "the claims tab lists the batch",
            req: ["REQ-LEN-130"],
          },
          {
            at: "2026-09-29T20:00:04.000Z",
            kind: "step",
            name: "the matured amount is claimable",
            req: ["REQ-LEN-131"],
          },
        ],
        observations: [
          {
            requirementId: null,
            status: "unattributed",
            attribution: "row",
          },
        ],
      }),
    )

  it("fixture and hook sites did not reach the behaviour under test", () => {
    const fixture = siteVerdict({ kind: "fixture", name: "fixture: page" })
    expect(fixture.sentence).toBe(
      "Did not reach the behaviour under test: broke while setting up a fixture (fixture: page) — locator.click: Timeout 5000ms exceeded. Nothing proven or disproven.",
    )
    expect(fixture.next).toBe("engineering — triage fixture / app state")
    const hook = siteVerdict({ kind: "hook", name: "Before Hooks" })
    expect(hook.sentence).toBe(
      "Did not reach the behaviour under test: broke while running a test hook (Before Hooks) — locator.click: Timeout 5000ms exceeded. Nothing proven or disproven.",
    )
    expect(hook.next).toBe("engineering — triage fixture / app state")
  })

  it("a teardown failure says the checkpoints held and the failure is in cleanup", () => {
    const v = siteVerdict({ kind: "teardown", name: "After Hooks" })
    expect(v.sentence).toBe(
      "Checkpoints held; failed while tearing down — locator.click: Timeout 5000ms exceeded. The behaviour under test was exercised; the failure is in cleanup.",
    )
    expect(v.next).toBe("engineering — triage teardown")
    expect(v.sentence).not.toContain("Did not reach")
  })

  it("a failure between checkpoints names the checkpoint that held and the one not reached", () => {
    const v = siteVerdict({
      kind: "between",
      name: "the claims tab lists the batch",
      index: 1,
    })
    expect(v.sentence).toBe(
      "Checkpoint 1 held; failed between checkpoints before 2 — locator.click: Timeout 5000ms exceeded. Behaviour up to checkpoint 1 is proven; later checkpoints were not reached.",
    )
    expect(v.next).toBe("engineering")
  })

  it("a checkpoint that broke before its assertion names the requirement it did not reach", () => {
    const v = siteVerdict({
      kind: "step",
      name: "the matured amount is claimable",
      index: 2,
    })
    expect(v.sentence).toBe(
      'Failed inside checkpoint "the matured amount is claimable" before its assertion — locator.click: Timeout 5000ms exceeded. The assertion for REQ-LEN-131 was not reached.',
    )
    expect(v.next).toBe("engineering")
  })

  it("a uat-run/2 row (no observations, no ledger) failing in a checkpoint degrades to the old wording", () => {
    const v = verdictOf(
      t({
        title: "BOP-09: the borrower reduces the APR",
        suite: "borrower ops",
        status: "failed",
        outcome: "failed",
        errorHead: "expect(locator).toContainText(expected)",
        failedDuring: { kind: "step", name: "the new APR appears", index: 2 },
      }),
    )
    expect(v.kind).toBe("failed")
    expect(v.sentence).toBe("Failed: expect(locator).toContainText(expected).")
    expect(v.next).toBeUndefined()
  })

  it("passed, skipped and did-not-run rows carry no sentence and stay closed", () => {
    ;(["passed", "skipped", "did-not-run"] as const).forEach((outcome) => {
      const v = verdictOf(t({ title: "X-01: x", suite: "s", outcome }))
      expect(v.open).toBe(false)
      expect(v.sentence).toBeUndefined()
    })
  })

  it("the page-5 LEN-18 row reads “Did not reach…”, with the revert in plain words", () => {
    const len18 = t({
      title:
        "LEN-18: partial withdrawal request enters the cycle; cycle end shown",
      suite: "lender flows › deposit → withdrawal cycle",
      page: 5,
      status: "failed",
      outcome: "failed",
      requirements: [],
      startedAt: "2026-09-25T18:57:30.000Z",
      durationMs: 12_640,
      errorHead:
        'ContractFunctionExecutionError: The contract function "balanceOf" reverted with the following reason:',
      errorDetail:
        "Arithmetic operation resulted in underflow or overflow.\n\nContract Call:\n  function:  balanceOf(address account)",
      failedDuring: {
        kind: "step",
        name: "queue a partial withdrawal",
        index: 1,
      },
      failureShot: "assets/t132-failure.png",
      failureState: {
        url: "http://127.0.0.1:3000/lender/market/0x07878e16a64ed6daacebe8a6537902a048de8f2d",
        chainBlock: "11584665",
        chainTimestamp: "2026-09-26T07:02:02.000Z",
        wallClock: "2026-09-25T18:57:42.640Z",
      },
      journal: [
        {
          at: "2026-09-25T18:57:31.000Z",
          kind: "nav",
          url: "http://127.0.0.1:3000/lender/market/0x07878e16a64ed6daacebe8a6537902a048de8f2d",
        },
        {
          at: "2026-09-25T18:57:33.000Z",
          kind: "step",
          name: "queue a partial withdrawal",
        },
      ],
      observations: [
        {
          requirementId: null,
          status: "unattributed",
          attribution: "row",
          step: "queue a partial withdrawal",
        },
      ],
    })
    const sentence =
      "Did not reach the behaviour under test: broke while arranging (queue a partial withdrawal) — balanceOf() reverted (Arithmetic operation resulted in underflow or overflow). Nothing proven or disproven."
    expect(verdictOf(len18).sentence).toBe(sentence)
    const r = { ...run(), schema: "uat-run/3" as const, tests: [len18] }
    assignPages(r.tests)
    const html = renderUatReport(r)
    const page5 = html.slice(html.indexOf('id="page-5"'))
    expect(page5).toContain(`<p class="verdict-sentence">${sentence}</p>`)
    expect(page5).toContain(
      '<p class="verdict-next"><b>Next:</b> engineering — triage fixture / app state</p>',
    )
    // The verdict block: page, block, chain time and the clock skew on one line.
    expect(page5).toContain("chain is <b>+12.1 h</b> ahead of the wall clock")
  })
})

describe("per-test card — header, timeline, footer, toolbar", () => {
  const MKT = `0x${"a".repeat(40)}`
  const H = (d: string) => `0x${d.repeat(64)}`
  const STEP1 = "the deployed policy carries the self-onboarding selection"
  const STEP2 = "a brand-new lender gains the credential and deposits"

  const tx = (
    at: string,
    block: string,
    call: string,
    during: string,
    hash: string,
    source = "lib",
  ) => ({
    at,
    kind: "tx" as const,
    hash,
    status: "success",
    block,
    source,
    to: MKT,
    enriched: {
      hash,
      status: "success",
      block,
      source,
      during,
      actor: "account #1 (lender)",
      target: { name: "E2E Market", kind: "market", address: MKT },
      fn: call.replace(/\(.*$/, ""),
      params: [],
      call,
      line: call,
    },
  })

  /** A created market, MKT-01 deploys it, MKT-12 (passed) and MKT-13 (failed) transact on it. */
  const cardRun = (): UatRun => {
    const tests = [
      t({
        title: "MKT-01: new policy created",
        suite: "market creation",
        page: 3,
        requirements: ["REQ-BOP-037"],
        observations: [
          {
            requirementId: "REQ-BOP-037",
            status: "pass",
            attribution: "step",
            step: "deploy",
            stepIndex: 1,
          },
        ],
      }),
      t({
        title: "MKT-12: self-onboarding policy",
        suite: "market creation",
        page: 3,
        startedAt: "2026-09-29T20:50:43.000Z",
        durationMs: 8_000,
        requirements: ["REQ-BOP-052", "REQ-LEN-110"],
        observations: [
          {
            requirementId: "REQ-BOP-052",
            status: "pass",
            attribution: "step",
            step: STEP1,
            stepIndex: 1,
          },
          {
            requirementId: "REQ-LEN-110",
            status: "pass",
            attribution: "step",
            step: STEP2,
            stepIndex: 2,
          },
        ],
        tracePath: "test-results/mkt-12/trace.zip",
        journal: [
          {
            at: "2026-09-29T20:50:43.984Z",
            kind: "step",
            name: STEP1,
            req: ["REQ-BOP-052"],
          },
          tx(
            "2026-09-29T20:50:44.471Z",
            "11584321",
            "depositUpTo(amount: 200 DAI)",
            STEP1,
            H("2"),
          ),
          tx(
            "2026-09-29T20:50:44.480Z",
            "11584320",
            "approve(amount: 200 DAI)",
            STEP1,
            H("1"),
          ),
          {
            at: "2026-09-29T20:50:44.489Z",
            kind: "step",
            name: STEP2,
            req: ["REQ-LEN-110"],
          },
          {
            at: "2026-09-29T20:50:48.576Z",
            kind: "data",
            name: "MKT-12 self-onboarding deposit",
            data: { deposited: "200 DAI", subgraphDelta: "200 DAI" },
          },
          {
            at: "2026-09-29T20:50:49.000Z",
            kind: "data",
            name: "console.error",
            data: "Warning: a key",
          },
          // Recorded late (receipt time), but it ran during step 2 at an earlier block.
          tx(
            "2026-09-29T20:53:35.000Z",
            "11584318",
            "mint()",
            STEP2,
            H("3"),
            "ui",
          ),
        ],
        agreements: [
          {
            name: "agreement: MKT-12 self-onboarding deposit",
            json: { deposited: "200 DAI", subgraphDelta: "200 DAI" },
          },
        ],
      }),
      t({
        title: "MKT-13: lender withdraws",
        suite: "market creation",
        page: 3,
        status: "failed",
        outcome: "failed",
        requirements: ["REQ-LEN-120"],
        errorHead: "Error: the withdrawal is queued",
        failedDuring: { kind: "step", name: "withdraw", index: 1 },
        journal: [
          {
            at: "2026-09-29T20:55:00.000Z",
            kind: "step",
            name: "withdraw",
            req: ["REQ-LEN-120"],
          },
          tx(
            "2026-09-29T20:55:01.000Z",
            "11584330",
            "queueWithdrawal(amount: 50 DAI)",
            "withdraw",
            H("4"),
          ),
        ],
        observations: [
          {
            requirementId: "REQ-LEN-120",
            status: "fail",
            attribution: "step",
            step: "withdraw",
            stepIndex: 1,
            failedAssertion: "the withdrawal is queued",
          },
        ],
      }),
      t({
        title: "MKT-18: Safe + MLA deployment",
        suite: "market creation",
        page: 3,
        status: "skipped",
        expectedStatus: "skipped",
        outcome: "skipped",
        requirements: ["REQ-BOP-068"],
        annotations: [{ type: "fixme" }],
        observations: [
          {
            requirementId: "REQ-BOP-068",
            status: "skipped",
            attribution: "row",
          },
        ],
        durationMs: 0,
      }),
    ]
    assignPages(tests)
    const r = { ...run(), schema: "uat-run/3" as const, tests }
    r.markets = [
      {
        address: MKT,
        name: "E2E Market",
        origin: "created",
        createdBy: {
          row: "MKT-01",
          anchor: "uat-MKT-01",
          block: "11584300",
          txHash: H("0"),
        },
        type: {
          term: "fixed-term",
          kind: "revolving",
          config: { maturity: "2026-10-29T00:00:00Z" },
        },
        txs: [
          {
            seq: 1,
            row: "MKT-01",
            anchor: "uat-MKT-01",
            block: "11584300",
            call: "deployMarketAndHooks(…)",
            status: "success",
            hash: H("0"),
            kind: "tx",
          },
          {
            seq: 2,
            row: "MKT-12",
            anchor: "uat-MKT-12",
            block: "11584318",
            call: "mint()",
            status: "success",
            hash: H("3"),
            kind: "tx",
          },
          {
            seq: 3,
            row: "MKT-12",
            anchor: "uat-MKT-12",
            block: "11584320",
            call: "approve(amount: 200 DAI)",
            status: "success",
            hash: H("1"),
            kind: "tx",
          },
          {
            seq: 4,
            row: "MKT-13",
            anchor: "uat-MKT-13",
            block: "11584330",
            call: "queueWithdrawal(amount: 50 DAI)",
            status: "success",
            hash: H("4"),
            kind: "tx",
          },
        ],
        derivedAt: "run",
      },
    ]
    return r
  }

  const rowOf = (html: string, anchor: string): string => {
    const start = html.indexOf(`id="${anchor}"`)
    expect(start).toBeGreaterThan(-1)
    const rest = html.slice(start + 1)
    const next = rest.search(/id="(uat-|row-|page-)/)
    return next >= 0 ? rest.slice(0, next) : rest
  }
  const summaryOf = (row: string): string =>
    row.slice(row.indexOf("<summary"), row.indexOf("</summary>"))
  const cardTag = (html: string, anchor: string): string => {
    const at = html.indexOf(`id="${anchor}"`)
    return html.slice(
      html.lastIndexOf("<details", at),
      html.indexOf(">", at) + 1,
    )
  }

  it("the header line: market chip, one chip per requirement with its result, duration", () => {
    const html = renderUatReport(cardRun())
    const head = summaryOf(rowOf(html, "uat-MKT-12"))
    expect(head).toContain('<span class="id mono">MKT-12</span>')
    expect(head).toContain('<span class="ttl">self-onboarding policy</span>')
    expect(head).toContain(
      `<span class="mchip" title="E2E Market · ${MKT}"><b>Fixed term · revolving</b> E2E Market</span>`,
    )
    expect(head).toContain(
      '<span class="req pass" title="REQ-BOP-052: pass">✓ REQ-BOP-052</span>',
    )
    expect(head).toContain(
      '<span class="req pass" title="REQ-LEN-110: pass">✓ REQ-LEN-110</span>',
    )
    expect(head).toContain('<span class="dur">8.0s</span>')
    // No step breadcrumb in the header any more.
    expect(head).not.toContain(STEP1)
    const failed = summaryOf(rowOf(html, "uat-MKT-13"))
    expect(failed).toContain(
      '<span class="req fail" title="REQ-LEN-120: fail">✗ REQ-LEN-120</span>',
    )
    // The second line: the failed assertion in plain words, and a flag.
    expect(failed).toContain(
      '<div class="teaser">the withdrawal is queued <span class="flag bad">did not hold</span></div>',
    )
    expect(summaryOf(rowOf(html, "uat-MKT-18"))).toContain(
      '<span class="req skipped" title="REQ-BOP-068: skipped">– REQ-BOP-068</span>',
    )
  })

  it("passed and skipped rows are one closed line; failed rows open with the verdict sentence", () => {
    const html = renderUatReport(cardRun())
    expect(cardTag(html, "uat-MKT-12")).toBe(
      '<details class="tcard passed quiet" id="uat-MKT-12">',
    )
    expect(cardTag(html, "uat-MKT-18")).toBe(
      '<details class="tcard skipped quiet" id="uat-MKT-18">',
    )
    expect(cardTag(html, "uat-MKT-13")).toBe(
      '<details class="tcard did-not-hold" id="uat-MKT-13" open>',
    )
    expect(rowOf(html, "uat-MKT-12")).not.toContain("verdict-sentence")
    expect(rowOf(html, "uat-MKT-13")).toContain(
      '<p class="verdict-sentence">the withdrawal is queued did not hold (REQ-LEN-120).</p>',
    )
  })

  it("the starting state's earlier actions are closed on a passed row and open on a failed one", () => {
    const html = renderUatReport(cardRun())
    const passed = rowOf(html, "uat-MKT-12")
    expect(passed).toContain(
      '<details class="prior"><summary>1 earlier action by rows MKT-01</summary>',
    )
    const failed = rowOf(html, "uat-MKT-13")
    expect(failed).toContain(
      '<details class="prior" open><summary>3 earlier actions by rows MKT-01, MKT-12</summary>',
    )
    expect(failed).toContain("Fixed term · revolving")
    expect(failed).toContain(
      '<span class="k">maturity</span> 2026-10-29T00:00:00Z',
    )
  })

  it("transactions sit inline under the checkpoint they ran in, in block order", () => {
    const html = renderUatReport(cardRun())
    const row = rowOf(html, "uat-MKT-12")
    const s1 = row.indexOf(`<span class="step-name">${STEP1}</span>`)
    const s2 = row.indexOf(`<span class="step-name">${STEP2}</span>`)
    const approve = row.indexOf("approve(amount: 200 DAI)")
    const deposit = row.indexOf("depositUpTo(amount: 200 DAI)")
    const mint = row.indexOf('<code class="tx-call">mint()</code>')
    expect(s1).toBeGreaterThan(-1)
    // Block 11584320 before 11584321, both inside checkpoint 1.
    expect(s1).toBeLessThan(approve)
    expect(approve).toBeLessThan(deposit)
    expect(deposit).toBeLessThan(s2)
    // The late-recorded UI mint belongs to checkpoint 2.
    expect(mint).toBeGreaterThan(s2)
    expect(row).toContain('<span class="badge ui">via app UI</span>')
    expect(row).toContain('<span class="badge lib">by test</span>')
    // The evidence the step attached sits in its checkpoint, after the transactions.
    expect(
      row.indexOf('<h4 class="ev-head">MKT-12 self-onboarding deposit</h4>'),
    ).toBeGreaterThan(s2)
    // …once, not again as a loose card.
    expect(row.match(/MKT-12 self-onboarding deposit<\/h4>/g)).toHaveLength(1)
    // Console noise stays out of the timeline.
    expect(
      row.slice(0, row.indexOf('<details class="harness">')),
    ).not.toContain("Warning: a key")
    // The checkpoint carries its requirement chip.
    expect(row.slice(s1, approve)).toContain("✓ REQ-BOP-052")
  })

  it("no Transactions table anywhere; the harness footer is closed and holds the maintainer detail", () => {
    const html = renderUatReport(cardRun())
    expect(html).not.toContain("<h3>Transactions</h3>")
    expect(html).not.toContain("What was verified")
    expect(html).not.toContain("How this state was reached")
    const row = rowOf(html, "uat-MKT-12")
    const foot = row.slice(row.indexOf('<details class="harness">'))
    expect(foot).toMatch(
      /^<details class="harness"><summary>Harness details<\/summary>/,
    )
    expect(foot).toContain(
      "npx playwright show-trace test-results/mkt-12/trace.zip",
    )
    expect(foot).toContain("2 step · 0 nav · 3 tx · 2 data · 0 chain-time")
    expect(foot).toContain("1 console error")
    expect(foot).toContain("&quot;subgraphDelta&quot;")
  })

  it("the ledger decision is a table in the harness footer", () => {
    const r = cardRun()
    const row = r.tests.find((x) => x.uatId === "MKT-13")!
    row.annotations = [
      {
        type: "ledger",
        description: JSON.stringify({
          version: "v25",
          decision: "run",
          reason: "ledger: v25 owes these behaviours and can exercise them",
          requirements: [
            {
              requirementId: "REQ-LEN-120",
              known: true,
              storedApplicability: "required",
              effectiveApplicability: "required",
              implementation: "implemented",
              coverage: "automated",
            },
          ],
        }),
      },
    ]
    const html = renderUatReport(r)
    const foot = rowOf(html, "uat-MKT-13").slice(
      rowOf(html, "uat-MKT-13").indexOf('<details class="harness">'),
    )
    expect(foot).toContain('<table class="ledger">')
    expect(foot).toContain(
      '<tr><td class="mono">REQ-LEN-120</td><td>required</td><td>required</td><td>implemented</td><td>automated</td><td></td></tr>',
    )
    expect(foot).toContain("decision <b>run</b>")
  })

  it("the needs-attention filter also hides a suite or page heading whose rows are all quiet", () => {
    // run(): page 3's "market creation" rows are passed/skipped only; page 4 holds the open
    // BOP-17b unexpected pass.
    const html = renderUatReport(run())
    expect(html).toContain(
      '<section class="page quiet-only" id="page-3" data-tab-pane="page-3">',
    )
    expect(html).toContain('<h3 class="suite quiet-only">market creation</h3>')
    expect(html).toContain(
      '<section class="page" id="page-4" data-tab-pane="page-4">',
    )
    expect(html).toContain('<h3 class="suite">borrower ops</h3>')
    expect(html).toContain("body.attention-only .quiet-only{display:none}")
  })

  it("the toolbar: a needs-attention filter and expand/collapse all", () => {
    const html = renderUatReport(cardRun())
    expect(html).toContain('<input type="checkbox" id="attention-only">')
    expect(html).toContain("Needs attention only")
    expect(html).toContain(
      '<button type="button" data-expand="1">Expand all</button>',
    )
    expect(html).toContain(
      '<button type="button" data-expand="0">Collapse all</button>',
    )
    expect(html.indexOf('class="toolbar"')).toBeLessThan(
      html.indexOf('id="page-3"'),
    )
  })
})

/* ================================== layout: tabs, Overview, Markets tab, “What it tests” ===== */

describe("layout — tab bar, Overview, page tabs and the Markets tab", () => {
  const FORKED = "0x07878e16a64ed6daacebe8a6537902a048de8f2d"

  /** run() plus a failed row on page 5, an excused expected failure, and (optionally) a market. */
  const layoutRun = (markets = true): UatRun => {
    const r = run()
    r.schema = "uat-run/3"
    r.tests.push(
      t({
        title: "LEN-02: deposit into a market",
        suite: "lender discovery",
        page: 5,
        status: "failed",
        outcome: "failed",
        failedDuring: { kind: "arrange" },
        errorHead: "Error: the fixture market is gone",
      }),
      t({
        title: "MKT-20: completion dialog",
        suite: "market creation",
        page: 3,
        status: "failed",
        expectedStatus: "failed",
        outcome: "expected-failure",
        annotations: [{ type: "fail", description: "KNOWN-ISSUES #9" }],
      }),
    )
    if (markets)
      r.markets = [
        {
          address: FORKED,
          name: "TEST DAI KW 3",
          origin: "forked",
          forkBlock: 11584253,
          txs: [
            {
              seq: 1,
              row: "LEN-01",
              anchor: "uat-LEN-01",
              call: "depositUpTo(1)",
              kind: "tx",
              status: "success",
              block: "11584300",
            },
          ],
          derivedAt: "run",
        },
      ]
    return r
  }

  const paneOf = (html: string, id: string): string => {
    const at = html.indexOf(`id="${id}" data-tab-pane="${id}"`)
    expect(at).toBeGreaterThan(-1)
    const start = html.lastIndexOf("<section", at)
    const rest = html.slice(at)
    const next = rest.search(/<section class="[^"]*" id="[^"]+" data-tab-pane=/)
    const end = rest.indexOf("<footer>")
    const stop = [next, end].filter((n) => n > 0)
    return html.slice(start, at + Math.min(...stop))
  }

  it("a sticky tab bar first in the page: Overview, one tab per page with its row count and a red dot on failure, Harness rows, Markets", () => {
    const html = renderUatReport(layoutRun())
    const nav = html.slice(
      html.indexOf('<nav class="tabs"'),
      html.indexOf("</nav>", html.indexOf('<nav class="tabs"')),
    )
    expect(html.indexOf('<nav class="tabs"')).toBeGreaterThan(-1)
    expect(html.indexOf('<nav class="tabs"')).toBeLessThan(
      html.indexOf('class="runbar"'),
    )
    expect(nav).toContain('<a href="#home" data-tab="home">Overview</a>')
    // Page 3 (all quiet or excused), page 4 (BOP-17b unexpected pass), page 5 (LEN-02 failed).
    const tab = (n: number) => {
      const at = nav.indexOf(`data-tab="page-${n}"`)
      return nav.slice(at, nav.indexOf("</a>", at))
    }
    expect(tab(3)).toContain("3 Market Creation")
    expect(tab(3)).toContain('<span class="tn">4</span>')
    expect(tab(3)).not.toContain("tdot")
    expect(tab(4)).toContain('class="tdot"')
    expect(tab(5)).toContain('class="tdot"')
    expect(tab(99)).toContain("Harness rows")
    expect(nav).toContain('<a href="#markets" data-tab="markets">Markets')
    expect(nav.indexOf('data-tab="page-99"')).toBeLessThan(
      nav.indexOf('data-tab="markets"'),
    )
    // The old in-flow page nav is gone; the CSS makes the bar sticky.
    expect(html).not.toContain('<nav class="pagenav">')
    expect(html).toMatch(/\.topbar\{[^}]*position:sticky/)
    // No markets index ⇒ no Markets tab.
    expect(renderUatReport(layoutRun(false))).not.toContain(
      '<a href="#markets" data-tab="markets">',
    )
  })

  it("the Overview tab: run status, answers, one tile per page, a Markets tile, Needs attention, provenance", () => {
    const html = renderUatReport(layoutRun())
    const home = paneOf(html, "home")
    expect(home).toContain('class="runbar"')
    expect(home).toContain('<section class="answers">')
    expect(home).toContain('<section class="prov">')
    // One tile per page; a red edge where something needs attention.
    expect(home).toContain('<a class="tile" href="#page-3">')
    expect(home).toContain('<a class="tile bad" href="#page-4">')
    expect(home).toContain('<a class="tile bad" href="#page-5">')
    expect(home).toContain('<a class="tile" href="#page-99">')
    expect(home).toContain('<a class="tile markets" href="#markets">')
    // Needs attention: the failure and the unexpected pass, each with its verdict flag; never the
    // excused expected failure, a passed or a skipped row.
    const attn = home.slice(
      home.indexOf('<ul class="attn">'),
      home.indexOf("</ul>", home.indexOf('<ul class="attn">')),
    )
    expect(attn).toContain('href="#uat-LEN-02"')
    expect(attn).toContain('href="#uat-BOP-17b"')
    expect(attn).toContain('class="flag')
    expect(attn).not.toContain("MKT-20")
    expect(attn).not.toContain("MKT-01")
    expect(attn).not.toContain("MKT-18")
    // Overview holds no row cards and no markets table.
    expect(home).not.toContain('<details class="tcard')
    expect(home).not.toContain('id="markets"')
  })

  it("Needs attention says so when nothing needs it", () => {
    const r = run()
    r.tests = r.tests.filter((x) => x.outcome !== "unexpected-pass")
    const home = paneOf(renderUatReport(r), "home")
    expect(home).not.toContain('<ul class="attn">')
    expect(home).toContain("Nothing needs attention")
  })

  it("each page is its own tab pane; the Markets section lives only in its tab, after the pages", () => {
    const html = renderUatReport(layoutRun())
    ;[3, 4, 5, 99].forEach((n) =>
      expect(html).toContain(`id="page-${n}" data-tab-pane="page-${n}"`),
    )
    expect(html).toContain(
      '<section class="markets" id="markets" data-tab-pane="markets">',
    )
    expect(html.split('id="markets"')).toHaveLength(2)
    expect(html.indexOf('id="markets"')).toBeGreaterThan(
      html.indexOf('id="page-99"'),
    )
    expect(paneOf(html, "markets")).toContain("<h2>Markets in this run</h2>")
    expect(paneOf(html, "page-5")).toContain('id="uat-LEN-02"')
    expect(paneOf(html, "page-5")).not.toContain("Markets in this run")
  })

  it("the comparison's “only in main” rows live in the Overview tab", () => {
    const other: UatRun = {
      ...run(),
      tests: [
        t({ title: "V2P-01: protocol invariant", suite: "protocol", page: 90 }),
      ],
    }
    const manifest: Manifest = {
      $schema: "comparison-manifest/1",
      variants: { a: "v2.5", b: "main" },
      rows: {
        "LEN-01": { relation: "v25-only", reason: "no periodic markets" },
        "V2P-01": { relation: "main-only", reason: "chain-level suite" },
      },
    }
    const html = renderUatReport(layoutRun(), { other, manifest })
    expect(paneOf(html, "home")).toContain(
      "Rows main ran that this branch does not have",
    )
  })

  it("the needs-attention toolbar sits in the sticky header; an all-quiet page tab says why it is empty", () => {
    const html = renderUatReport(layoutRun())
    const header = html.slice(
      html.indexOf('<header class="topbar">'),
      html.indexOf("</header>"),
    )
    expect(header).toContain('<nav class="tabs"')
    expect(header).toContain('<input type="checkbox" id="attention-only">')
    expect(paneOf(html, "page-99")).toContain('<p class="quiet-note">')
  })

  // ---------------------------------------------------------- behaviour, in jsdom -----------

  const load = (html: string) => {
    const doc = new DOMParser().parseFromString(
      html.replace(/<script>[\s\S]*?<\/script>/g, ""),
      "text/html",
    )
    document.replaceChild(
      document.importNode(doc.documentElement, true),
      document.documentElement,
    )
    const js = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ""
    // eslint-disable-next-line no-new-func
    new Function(js)()
  }
  const go = (hash: string) => {
    window.history.replaceState(null, "", hash || " ")
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  }
  const active = () =>
    Array.from(document.querySelectorAll("[data-tab-pane].active")).map((p) =>
      p.getAttribute("data-tab-pane"),
    )
  const onTab = () =>
    Array.from(document.querySelectorAll("nav.tabs a.on")).map((a) =>
      a.getAttribute("data-tab"),
    )

  beforeEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("routes #home, #page-N, #markets and card anchors to the right tab; a malformed hash lands on Overview", () => {
    load(renderUatReport(layoutRun()))
    expect(document.body.classList.contains("js")).toBe(true)
    expect(active()).toEqual(["home"])
    expect(onTab()).toEqual(["home"])

    go("#page-4")
    expect(active()).toEqual(["page-4"])
    expect(onTab()).toEqual(["page-4"])

    go("#markets")
    expect(active()).toEqual(["markets"])

    // A card anchor selects its page's tab and opens the (closed, passed) card.
    const card = document.getElementById("uat-MKT-01") as HTMLDetailsElement
    expect(card.open).toBe(false)
    go("#uat-MKT-01")
    expect(active()).toEqual(["page-3"])
    expect(card.open).toBe(true)

    // A market row anchor lives in the Markets tab.
    go(`#market-${FORKED}`)
    expect(active()).toEqual(["markets"])

    go("#home")
    expect(active()).toEqual(["home"])
    go("#page-4")
    go("#%E0%A4%A")
    expect(active()).toEqual(["home"])
    go("#page-4")
    go("#no-such-anchor")
    expect(active()).toEqual(["home"])
  })

  it("the card switch flips between What ran and What it tests; the header link opens the card on What it tests", () => {
    load(renderUatReport(layoutRun()))
    go("#page-3")
    const card = document.getElementById("uat-MKT-01") as HTMLDetailsElement
    const btn = (p: string) =>
      card.querySelector(`.cswitch [data-cpane="${p}"]`) as HTMLButtonElement
    expect(btn("ran").classList.contains("on")).toBe(true)
    btn("tests").click()
    expect(card.classList.contains("show-tests")).toBe(true)
    expect(btn("tests").classList.contains("on")).toBe(true)
    expect(btn("ran").classList.contains("on")).toBe(false)
    btn("ran").click()
    expect(card.classList.contains("show-tests")).toBe(false)

    card.open = false
    ;(card.querySelector("summary [data-spec-link]") as HTMLElement).click()
    expect(card.open).toBe(true)
    expect(card.classList.contains("show-tests")).toBe(true)
  })

  it("Expand all acts within the active tab only", () => {
    load(renderUatReport(layoutRun()))
    go("#page-3")
    ;(document.querySelector('[data-expand="1"]') as HTMLElement).click()
    expect(
      (document.getElementById("uat-MKT-01") as HTMLDetailsElement).open,
    ).toBe(true)
    expect(
      (document.getElementById("uat-LEN-01") as HTMLDetailsElement).open,
    ).toBe(false)
  })
})

describe("per-test card — “What it tests”", () => {
  const SPEC: NonNullable<UatTest["spec"]> = {
    source: "declared",
    runsheet: {
      uatId: "MKT-23",
      page: 3,
      pageTitle: "3 Market Creation",
      title: "Escape closes the dialog",
      preconditions: "A borrower with a <b>market</b>",
      steps: "Press Escape on the completion dialog.",
      expected: "The dialog closes.",
      notes: "see M12",
    },
    requirements: [
      {
        id: "REQ-MKT-140",
        statement: "Escape dismisses the completion dialog.",
        desired: "Pressing Escape closes the completion dialog.",
        applicability: "intentionally-different",
        applicabilityStatus: "proposed",
        implementation: "known-defect",
        knownIssue: "main#M12",
      },
      {
        id: "REQ-MKT-141",
        statement: "A backdrop click dismisses it.",
        desired: "Clicking the backdrop closes it.",
        applicability: "required",
        implementation: "conforming",
      },
      { id: "REQ-XXX-999", known: false },
    ],
  }

  const specRun = (): UatRun => {
    const r = run()
    r.schema = "uat-run/3"
    r.tests.push(
      t({
        title: "MKT-23b: Escape closes the completion dialog",
        suite: "market creation",
        page: 3,
        file: "e2e/borrowerflows/market-creation.spec.ts",
        spec: SPEC,
        journal: [
          {
            at: "2026-09-11T02:00:00.000Z",
            kind: "step",
            name: "open the completion dialog",
          },
          {
            at: "2026-09-11T02:00:01.000Z",
            kind: "step",
            name: "Escape closes it",
            req: ["REQ-MKT-140"],
          },
          {
            at: "2026-09-11T02:00:02.000Z",
            kind: "step",
            name: "the backdrop closes it",
            req: ["REQ-MKT-141", "REQ-MKT-140"],
          },
        ],
      }),
      t({
        title: "ADM-03: invitation status",
        suite: "admin",
        page: 1,
        spec: {
          source: "ledger-mapping",
          requirements: [
            {
              id: "REQ-ADM-006",
              statement: "Show when the invitee signed the ToU.",
              applicability: "required",
              implementation: "conforming",
            },
          ],
        },
      }),
    )
    return r
  }

  const paneTests = (html: string, anchor: string): string => {
    const card = html.slice(html.indexOf(`id="${anchor}"`))
    const s = card.indexOf('<div class="cpane tests">')
    expect(s).toBeGreaterThan(-1)
    return card.slice(s, card.indexOf("</details>", s))
  }

  it("every card has the two-button switch, What ran first and on; the timeline sits under What ran", () => {
    const html = renderUatReport(specRun())
    const at = html.indexOf('id="uat-MKT-23b"')
    const card = html.slice(
      at,
      html.indexOf("</details>", html.indexOf('<div class="cpane tests">', at)),
    )
    expect(card).toContain(
      '<div class="cswitch"><button type="button" class="on" data-cpane="ran">What ran</button><button type="button" data-cpane="tests">What it tests</button></div>',
    )
    expect(card.indexOf('<div class="cpane ran">')).toBeLessThan(
      card.indexOf('<ol class="tl">'),
    )
    expect(card.indexOf('<ol class="tl">')).toBeLessThan(
      card.indexOf('<div class="cpane tests">'),
    )
    // The collapsed line gains the small link.
    const summary = card.slice(0, card.indexOf("</summary>"))
    expect(summary).toContain(
      '<a class="speclink" href="#uat-MKT-23b" data-spec-link>what it tests</a>',
    )
    // Infra rows get the switch too.
    expect(html.split('<div class="cswitch">').length - 1).toBe(
      specRun().tests.length,
    )
  })

  it("the runsheet row, the requirements with their tags, the checkpoints with their req ids, then the spec file", () => {
    const pane = paneTests(renderUatReport(specRun()), "uat-MKT-23b")
    expect(pane).toContain("3 Market Creation · MKT-23")
    expect(pane).toContain("Escape closes the dialog")
    expect(pane).toContain(
      "<dt>Preconditions</dt><dd>A borrower with a &lt;b&gt;market&lt;/b&gt;</dd>",
    )
    expect(pane).toContain(
      "<dt>What the tester does</dt><dd>Press Escape on the completion dialog.</dd>",
    )
    expect(pane).toContain(
      "<dt>What should happen</dt><dd>The dialog closes.</dd>",
    )
    expect(pane).toContain("<dt>Notes</dt><dd>see M12</dd>")
    expect(pane).toContain("Requirements this row proves")
    expect(pane).toContain("REQ-MKT-140")
    expect(pane).toContain("Escape dismisses the completion dialog.")
    expect(pane).toContain("Pressing Escape closes the completion dialog.")
    expect(pane).toContain(
      '<span class="tag ruling">intentionally-different · proposed</span>',
    )
    expect(pane).toContain(
      '<span class="tag defect">known defect main#M12</span>',
    )
    expect(pane).toContain('<span class="tag unknown">not in the ledger</span>')
    expect(pane).not.toContain("mapped by the ledger")
    expect(pane).toContain("How the test checks it")
    const checks = pane.slice(pane.indexOf('<ol class="checks">'))
    expect(checks.indexOf("open the completion dialog")).toBeLessThan(
      checks.indexOf("Escape closes it"),
    )
    expect(checks.indexOf("Escape closes it")).toBeLessThan(
      checks.indexOf("the backdrop closes it"),
    )
    expect(checks).toContain(
      'the backdrop closes it <span class="rids"><span class="mono">REQ-MKT-141</span> <span class="mono">REQ-MKT-140</span></span>',
    )
    expect(pane).toContain("e2e/borrowerflows/market-creation.spec.ts")
    expect(pane.indexOf("How the test checks it")).toBeLessThan(
      pane.indexOf("e2e/borrowerflows/market-creation.spec.ts"),
    )
  })

  it("a ledger-mapped row says it was mapped by the ledger, not declared by the test", () => {
    const pane = paneTests(renderUatReport(specRun()), "uat-ADM-03")
    expect(pane).toContain("mapped by the ledger, not declared by the test")
    expect(pane).toContain("REQ-ADM-006")
    expect(pane).not.toContain("What the tester does")
  })

  it("a row with no spec data says so", () => {
    const pane = paneTests(renderUatReport(specRun()), "uat-MKT-01")
    expect(pane).toContain(
      "No runsheet or ledger text for this row in this run.",
    )
  })
})
