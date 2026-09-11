/* eslint-disable no-restricted-syntax, no-await-in-loop, import/no-extraneous-dependencies, no-nested-ternary, no-empty-pattern, prefer-destructuring, no-continue */
import { test as base, type Page, type TestInfo } from "@playwright/test"

import { publicClient } from "./chain"
import { ANVIL_ACCOUNTS } from "./env"
import * as journal from "./journal"

const pages = new WeakMap<TestInfo, Page>()

/**
 * Browser noise that says nothing about the app under test. The harness serves the app over plain
 * HTTP against a local anvil, which the production CSP (report-only) does not list — every RPC
 * call logs a violation and drowns everything else.
 */
const IGNORED_CONSOLE = /Content Security Policy|\[Report Only\]/
/**
 * App code that swallows a failure usually re-emits it through `console.log`, not `console.error`
 * — react-query's `onError(error) { console.log(error) }` in create-market's deploy mutation is
 * the case this exists for. Keep the log channel, but only the entries that read like failures.
 */
const ERRORISH_LOG =
  /error|reverted|CALL_EXCEPTION|UNPREDICTABLE_GAS_LIMIT|not ready|failed|cannot/i

// ---------- UI-tx sweep ----------
// Lib helpers journal their own txs (with fn + args); transactions the APP sends — MetaMask-less
// anvil accounts signing from the UI — leave no journal trace. Sweep the blocks mined during the
// test and append any anvil-account tx the journal does not know, tagged source:"ui" and
// attributed to the step whose block range contains it. Reporting must never fail a test:
// everything here is best-effort and swallowed.

const startBlocks = new WeakMap<TestInfo, bigint>()
const ANVIL_SET = new Set<string>(ANVIL_ACCOUNTS.map((a) => a.toLowerCase()))
/** Anvil mines on demand — a test mines a handful of blocks; anything larger is misconfig. */
const SWEEP_CAP = 300n

const sweepUiTxs = async (info: TestInfo) => {
  const start = startBlocks.get(info)
  if (start === undefined) return
  try {
    const head = await publicClient.getBlockNumber({ cacheTime: 0 })
    if (head <= start || head - start > SWEEP_CAP) return
    const entries = journal.journalOf(info)
    const known = new Set(
      entries.flatMap((e) => (e.kind === "tx" ? [e.hash.toLowerCase()] : [])),
    )
    const steps = entries.filter(
      (e): e is Extract<journal.JournalEntry, { kind: "step" }> =>
        e.kind === "step",
    )
    const stepFor = (b: bigint) =>
      steps.find(
        (s) =>
          s.blockStart !== undefined &&
          s.blockEnd !== undefined &&
          BigInt(s.blockStart) <= b &&
          b <= BigInt(s.blockEnd),
      )
    for (let b = start + 1n; b <= head; b += 1n) {
      const block = await publicClient.getBlock({
        blockNumber: b,
        includeTransactions: true,
      })
      for (const tx of block.transactions) {
        if (typeof tx === "string") continue
        if (!ANVIL_SET.has(tx.from.toLowerCase())) continue
        if (known.has(tx.hash.toLowerCase())) continue
        let status: "success" | "reverted" = "success"
        let gasUsed = ""
        try {
          const r = await publicClient.getTransactionReceipt({ hash: tx.hash })
          status = r.status
          gasUsed = r.gasUsed.toString()
        } catch {
          /* receipt unavailable — keep the tx with defaults */
        }
        const during = stepFor(b)
        const entry: journal.JournalEntry = {
          at: new Date(Number(block.timestamp) * 1000).toISOString(),
          kind: "tx",
          hash: tx.hash,
          status,
          block: b.toString(),
          gasUsed,
          from: tx.from,
          to: tx.to ?? undefined,
          input: tx.input,
          source: "ui",
          duringStep: during?.name,
        }
        // Insert in timeline position: inside its step's span (before the NEXT step entry),
        // or before the first step when it landed during setup; otherwise append.
        let idx = entries.length
        if (during) {
          const si = entries.indexOf(during)
          const next = entries.findIndex((e, i) => i > si && e.kind === "step")
          idx = next >= 0 ? next : entries.length
        } else {
          const first = steps[0]
          if (first?.blockStart !== undefined && b <= BigInt(first.blockStart))
            idx = entries.indexOf(first)
        }
        entries.splice(idx, 0, entry)
        known.add(tx.hash.toLowerCase())
      }
    }
  } catch {
    /* sweep is reporting, not testing — never fail the test over it */
  }
}

/**
 * Extended test: every test gets a semantic journal (steps/navs/txs/data — see journal.ts) that is
 * attached as journal.json, plus a failure screenshot + state snapshot when the test fails. The
 * page fixture additionally records every main-frame navigation — including app-initiated
 * redirects, which is exactly what deep-link bounce bugs look like in a repro.
 *
 * Both the sweep and the attach hang off the `uatJournal` AUTO FIXTURE below rather than
 * `test.beforeEach`/`test.afterEach`. That is not a style choice: Playwright registers a hook on
 * the file suite that is *currently loading* (playwright/lib/common/testType.js `_hook` →
 * `currentlyLoadingFileSuite()`), so a hook written at the top level of this module attaches only
 * to the first spec file that pulls this module into a worker process. Every other spec in that
 * worker silently ran without the journal attach — which is why only the alphabetically-first
 * suite carried a journal, and why the count moved run to run (a worker is restarted after each
 * failure, so the next spec to load became the new, accidental host). Fixtures are registered on
 * the test type itself, so they run for every spec that imports this `test`.
 */
export const test = base.extend<{ uatJournal: void }>({
  page: async ({ page }, use, testInfo) => {
    pages.set(testInfo, page)
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame())
        journal.record({ kind: "nav", url: frame.url() })
    })
    // App-side failures are usually swallowed into a generic "Oops! Something went wrong!" modal
    // (create-market's deploy step does exactly that), which tells a test nothing. Journal the
    // console errors and uncaught exceptions so a failure report carries the real cause.
    page.on("console", (msg) => {
      const type = msg.type()
      if (type !== "error" && type !== "log" && type !== "warning") return
      const text = msg.text()
      if (IGNORED_CONSOLE.test(text)) return
      if (type !== "error" && !ERRORISH_LOG.test(text)) return
      journal.record({
        kind: "data",
        name: `console.${type}`,
        data: text.slice(0, 4000),
      })
      // E2E_CONSOLE=1 also mirrors them to the runner's stdout — the journal lives inside an
      // attachment, which is awkward to read while iterating on a failure. Errors logged as
      // objects (`console.log(error)`) print only their message, so pull the stack off the handle.
      if (process.env.E2E_CONSOLE === "1") {
        // eslint-disable-next-line no-console
        console.log(`[browser ${type}] ${text.slice(0, 2000)}`)
        void Promise.all(
          msg
            .args()
            .map((h) =>
              h
                .evaluate((v) => (v instanceof Error ? v.stack : undefined))
                .catch(() => undefined),
            ),
        ).then((stacks) => {
          const stack = stacks.find(Boolean)
          // eslint-disable-next-line no-console
          if (stack)
            console.log(`[browser stack] ${String(stack).slice(0, 3000)}`)
        })
      }
    })
    page.on("pageerror", (error) => {
      journal.record({
        kind: "data",
        name: "pageerror",
        data: `${error.message}\n${error.stack ?? ""}`.slice(0, 4000),
      })
    })
    await use(page)
    // Page-fixture teardown still has an OPEN page; the auto fixture below is set up before this
    // one and therefore torn down after the context has closed it, so the shot must be taken here.
    await journal.captureFailureShot(testInfo, page)
  },

  /**
   * Auto fixture: brackets every test with the sweep start block and the journal attach, whether
   * or not the test asked for any fixture at all. Setup runs before `page`, so its teardown runs
   * after the page has closed — everything it does is page-independent by design.
   */
  uatJournal: [
    async ({}, use, testInfo) => {
      try {
        startBlocks.set(
          testInfo,
          await publicClient.getBlockNumber({ cacheTime: 0 }),
        )
      } catch {
        /* chain unreachable (UI-only run) — sweep disabled for this test */
      }
      await use()
      await sweepUiTxs(testInfo)
      await journal.finalize(testInfo, pages.get(testInfo))
    },
    { auto: true },
  ],
})

export { expect } from "@playwright/test"
export type { Page, Locator, TestInfo } from "@playwright/test"
