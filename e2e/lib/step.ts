/* eslint-disable no-restricted-syntax, import/no-extraneous-dependencies */
import { test, type Page, type TestDetails } from "@playwright/test"

import { publicClient } from "./chain"
import * as journal from "./journal"

/** Stamp the chain head onto a step journal entry (best effort — UI-only suites may run
 *  without a reachable chain; the step then simply lacks a block range). */
const markBlock = async (
  entry: journal.JournalEntry | undefined,
  key: "blockStart" | "blockEnd",
) => {
  try {
    const head = await publicClient.getBlockNumber({ cacheTime: 0 })
    if (entry && entry.kind === "step") entry[key] = head.toString()
  } catch {
    /* chain unreachable — steps just lack block ranges */
  }
}

/** test.step wrapper that attaches a labeled screenshot at the step boundary (film strip in the
 *  report) and brackets the step with chain head blocks so swept UI txs can be attributed to it.
 *
 *  `opts.req` is the PER-STEP requirement declaration of capability-ledger SCHEMA.md §5.1 rule 1:
 *  "the assertions inside this checkpoint exercise these requirements". It is recorded on the
 *  journal entry and nowhere else, which is the point — the journal is the record of what actually
 *  RAN, so an attribution can be checked against an executed step rather than taken on trust. A
 *  step with no `req` asserts nothing the ledger names and produces no observation of its own, so
 *  the parameter is optional and every existing call site keeps working unchanged. */
export const step = async <T>(
  page: Page,
  name: string,
  fn: () => Promise<T>,
  opts?: { req?: string[] },
): Promise<T> =>
  test.step(name, async () => {
    const entry = journal.record({
      kind: "step",
      name,
      ...(opts?.req?.length ? { req: opts.req } : {}),
    })
    await markBlock(entry, "blockStart")
    const result = await fn()
    await markBlock(entry, "blockEnd")
    await test.info().attach(`step: ${name}`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    })
    return result
  })

/**
 * The ROW-LEVEL requirement declaration (capability-ledger SCHEMA.md §5.1 rule 2), as a Playwright
 * test-details object:
 *
 * ```ts
 * test("LEN-35b: after maturity, withdrawal requests work", requirements(["REQ-LEN-136"]),
 *   async ({ page }) => { … })
 * ```
 *
 * It says WHICH BEHAVIOURS this row is about. It does not, and cannot, say which of them a given
 * assertion exercised — that is what `step(…, { req })` is for, and a row declaring more than one
 * requirement MUST attribute every assertion to a step. The declaration is required on every
 * functional row; `infra()` below is the only exemption.
 *
 * The reporter copies `test.annotations` into the archive verbatim, so nothing has to be taught
 * about this helper: it is a plain details object, and writing the annotation out by hand is
 * exactly equivalent.
 */
export const requirements = (ids: string[]): TestDetails => ({
  annotation: [{ type: "requirements", description: ids.join(",") }],
})

/**
 * The INFRASTRUCTURE marker (capability-ledger SCHEMA.md §5.1 rule 2). An infra row asserts no
 * product behaviour — it arranges fixtures, tears them down, or proves the stack is up — so it
 * declares no requirements and observes none, and it is the one exemption from the
 * declaration-is-required rule.
 */
export const infra = (
  kind: "setup" | "teardown" | "smoke",
): TestDetails => ({
  annotation: [{ type: "infra", description: kind }],
})

/** Attach a structured oracle comparison so failures are self-describing without reading traces. */
export const attachAgreement = (
  label: string,
  values: Record<string, unknown>,
) => {
  journal.record({ kind: "data", name: label, data: values })
  return test.info().attach(`agreement: ${label}`, {
    body: JSON.stringify(
      values,
      (_k, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
    contentType: "application/json",
  })
}
