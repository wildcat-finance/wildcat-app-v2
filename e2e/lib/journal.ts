/* eslint-disable no-restricted-syntax, no-await-in-loop, import/no-extraneous-dependencies, no-nested-ternary, no-empty-pattern, prefer-destructuring */
import { test, type Page, type TestInfo } from "@playwright/test"

/**
 * Per-test semantic journal: the ordered record of what a test DID — steps, navigations
 * (including app-initiated redirects), transactions and oracle data. Attached as journal.json,
 * it doubles as the reproduction recipe; the summary reporter renders it into report.md.
 */
export type JournalEntry = { at: string } & (
  | {
      kind: "step"
      name: string
      /** Chain head when the step began/ended (strings; used to attribute swept UI txs). */
      blockStart?: string
      blockEnd?: string
    }
  | { kind: "nav"; url: string }
  | {
      kind: "tx"
      hash: string
      status: "success" | "reverted"
      block: string
      gasUsed: string
      fn?: string
      from?: string
      to?: string
      /** Function + decoded args when the sender (a lib helper) knew them. */
      functionName?: string
      args?: readonly unknown[]
      /** Raw calldata hex — recorded by the UI-tx sweep for report-time decoding. */
      input?: string
      /** "lib" = sent by test helper code; "ui" = swept from the chain (sent via the app UI). */
      source?: "lib" | "ui"
      /** Name of the step during which the tx landed (sweep attribution via block ranges). */
      duringStep?: string
    }
  | { kind: "data"; name: string; data: unknown }
)

type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never

/** Registered by chain.ts (avoids an import cycle): chain context for failure snapshots. */
let chainStateProvider: (() => Promise<Record<string, unknown>>) | undefined
export const setChainStateProvider = (
  fn: () => Promise<Record<string, unknown>>,
) => {
  chainStateProvider = fn
}

const journals = new WeakMap<TestInfo, JournalEntry[]>()

const entriesFor = (info: TestInfo): JournalEntry[] => {
  let list = journals.get(info)
  if (!list) {
    list = []
    journals.set(info, list)
  }
  return list
}

/** Append an entry to the running test's journal (no-op outside a test).
 *  Returns the LIVE entry so callers may enrich it in place (e.g. step block ranges). */
export const record = (
  entry: DistributiveOmit<JournalEntry, "at">,
): JournalEntry | undefined => {
  try {
    const full = { at: new Date().toISOString(), ...entry } as JournalEntry
    entriesFor(test.info()).push(full)
    return full
  } catch {
    /* outside a test (global setup, reporters) — ignore */
    return undefined
  }
}

/** The live journal array for a test — used by the tx sweep in lib/test.ts. */
export const journalOf = (info: TestInfo): JournalEntry[] => entriesFor(info)

const serialize = (value: unknown) =>
  JSON.stringify(
    value,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  )

/** URL of the page at the moment of failure, captured while the page was still open. */
const failureUrls = new WeakMap<TestInfo, string>()

/**
 * Failure screenshot. MUST run while the page is still open — i.e. from the `page` fixture's
 * teardown. `finalize` below runs from the auto fixture in lib/test.ts, whose teardown Playwright
 * schedules AFTER the context (and every page in it) has been closed, so it cannot take one.
 */
export const captureFailureShot = async (
  info: TestInfo,
  page: Page | undefined,
) => {
  if (info.status === info.expectedStatus) return
  try {
    if (!page || page.isClosed()) return
    failureUrls.set(info, page.url())
    await info.attach("failure.png", {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    })
  } catch {
    /* page gone */
  }
}

/**
 * Attach the journal (and, on failure, a failure-state snapshot). Called from the auto fixture in
 * lib/test.ts — NOT from a `test.afterEach`: a hook registered at import time of a helper module
 * lands on whichever spec file happened to load that module first in the worker process
 * (playwright/lib/common/testType.js `_hook` → `currentlyLoadingFileSuite()`), so every other
 * spec silently loses its journal. A fixture is registered on the test type itself and therefore
 * runs for every spec that imports this `test`.
 */
export const finalize = async (info: TestInfo, page?: Page) => {
  const entries = journals.get(info) ?? []
  if (entries.length > 0)
    await info.attach("journal.json", {
      body: serialize(entries),
      contentType: "application/json",
    })
  if (info.status !== info.expectedStatus) {
    const state: Record<string, unknown> = {
      wallClock: new Date().toISOString(),
      error: info.error?.message?.slice(0, 2_000),
    }
    let url = failureUrls.get(info)
    try {
      if (url === undefined && page && !page.isClosed()) url = page.url()
    } catch {
      /* page gone */
    }
    if (url !== undefined) state.url = url
    try {
      if (chainStateProvider) Object.assign(state, await chainStateProvider())
    } catch {
      /* chain unreachable */
    }
    await info.attach("failure-state.json", {
      body: serialize(state),
      contentType: "application/json",
    })
  }
}
