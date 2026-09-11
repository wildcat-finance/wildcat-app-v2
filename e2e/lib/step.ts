/* eslint-disable no-restricted-syntax, import/no-extraneous-dependencies */
import { test, type Page } from "@playwright/test"

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
 *  report) and brackets the step with chain head blocks so swept UI txs can be attributed to it. */
export const step = async <T>(
  page: Page,
  name: string,
  fn: () => Promise<T>,
): Promise<T> =>
  test.step(name, async () => {
    const entry = journal.record({ kind: "step", name })
    await markBlock(entry, "blockStart")
    const result = await fn()
    await markBlock(entry, "blockEnd")
    await test.info().attach(`step: ${name}`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    })
    return result
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
