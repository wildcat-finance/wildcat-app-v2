import type { Manifest } from "../e2e/lib/manifest"
import {
  assignPages,
  attributeDidNotRun,
  type UatRun,
  type UatTest,
} from "../e2e/lib/uatModel"
import { anchorOf, renderUatReport } from "../e2e/lib/uatReport"

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
    expect(step).toContain('<span class="badge bad">failed here</span>')
    expect(step).toContain('class="step step-failed"')

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
      expect(section).not.toContain("step-failed")
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

  /** The row's "How this state was reached" section, or "" when it has none. */
  const reachedOf = (html: string, anchor: string): string => {
    const at = html.indexOf(`id="${anchor}"`)
    expect(at).toBeGreaterThan(-1)
    const row = html.slice(at)
    const end = row.indexOf("<h3>What happened</h3>")
    const head = end === -1 ? row : row.slice(0, end)
    const s = head.indexOf('<section class="reached">')
    return s === -1 ? "" : head.slice(s, head.indexOf("</section>", s))
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
    expect(html).toContain('<section class="markets" id="markets">')
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
    // The summary sits after the answers and before the page nav; no per-market cards.
    expect(html.indexOf('<section class="markets"')).toBeLessThan(
      html.indexOf('<nav class="pagenav">'),
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

  it("the withdrawal row: creation, the deposit, the chain time, its own tx marked — nothing after", () => {
    const r = withMarkets()
    const html = renderUatReport(r)
    const sec = reachedOf(html, withdrawalAnchor(r))
    expect(sec).toContain("<h3>How this state was reached</h3>")
    expect(stepsOf(sec, CREATED)).toEqual([
      "MKT-01: created the market — deployMarketAndHooks(…) (block 11584300)",
      "LEN-01: depositUpTo(amount: 100 DAI) (block 11584301)",
      "LEN-01: chain time +3,600 s (1 h) (block 11584302)",
      // A reverted tx changed no state; it says so.
      "queue a withdrawal through the UI: queueWithdrawal(amount: 40 DAI) reverted (block 11584303) (this row)",
    ])
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
    // The section comes before "What happened".
    const row = html.slice(html.indexOf(`id="${withdrawalAnchor(r)}"`))
    expect(row.indexOf("How this state was reached")).toBeLessThan(
      row.indexOf("<h3>What happened</h3>"),
    )
  })

  it("the creator row lists only the creation, marked as its own", () => {
    const html = renderUatReport(withMarkets())
    expect(stepsOf(reachedOf(html, "uat-MKT-01"), CREATED)).toEqual([
      "MKT-01: created the market — deployMarketAndHooks(…) (block 11584300) (this row)",
    ])
  })

  it("a row touching two markets gets one block each; a forked market carries the fork note", () => {
    const html = renderUatReport(withMarkets())
    const sec = reachedOf(html, "uat-LEN-01")
    expect(stepsOf(sec, CREATED)).toEqual([
      "MKT-01: created the market — deployMarketAndHooks(…) (block 11584300)",
      "LEN-01: depositUpTo(amount: 100 DAI) (block 11584301) (this row)",
      "LEN-01: chain time +3,600 s (1 h) (block 11584302) (this row)",
    ])
    expect(stepsOf(sec, FORKED)).toEqual([
      "LEN-01: approve(spender: market, amount: 5 DAI) (block 11584305) (this row)",
    ])
    expect(sec).toContain("forked at block 11584253")
    expect(sec).toContain(
      "state before the fork block is Sepolia's and not shown",
    )
    // The fork note belongs to the forked market's block only.
    expect(sec.match(/state before the fork block/g)).toHaveLength(1)
    expect(sec).toContain("time travel outside a row is not journaled")
  })

  it("a row that touched no market gets no section, and the old “Markets touched” line is gone", () => {
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
    expect(renderUatReport(run())).not.toContain("How this state was reached")
    const empty = run()
    empty.markets = []
    expect(renderUatReport(empty)).not.toContain('class="markets"')
    expect(renderUatReport(empty)).not.toContain("How this state was reached")
  })
})
