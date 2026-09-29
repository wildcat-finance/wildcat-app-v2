/* eslint-disable import/no-extraneous-dependencies, global-require, @typescript-eslint/no-var-requires */
/**
 * Chain-time journaling (market provenance, Task 1).
 *
 * `advanceTime` in e2e/lib/env.ts reports every time jump to an optional recorder, and
 * e2e/lib/test.ts registers `journal.record` as that recorder ONLY under UAT_RUN_SCHEMA=3. That
 * source gate is what keeps a uat-run/2 board byte-identical: with the recorder unregistered no
 * `chain-time` entry ever reaches a journal, so run.json, playwright-summary.json,
 * playwright-report.md and the journal attachment carry exactly what they carried before.
 *
 * env.ts must not import journal.ts (render-report loads env.ts through loadTs, which cannot
 * resolve @playwright/test), hence the setter.
 */

type Head = { number: number; timestamp: number }

/** A fake anvil: evm_increaseTime + anvil_mine move the head; eth_getBlockByNumber reads it. */
const fakeChain = (start: Head) => {
  const head = { ...start }
  let pending = 0
  const calls: string[] = []
  const fetchMock = jest.fn(async (_url: unknown, init?: { body?: string }) => {
    const { method, params } = JSON.parse(init?.body ?? "{}") as {
      method: string
      params: unknown[]
    }
    calls.push(method)
    let result: unknown = null
    if (method === "evm_increaseTime") pending += Number(params[0])
    if (method === "anvil_mine") {
      head.number += 1
      head.timestamp += pending + 1
      pending = 0
    }
    if (method === "eth_getBlockByNumber")
      result = {
        number: `0x${head.number.toString(16)}`,
        timestamp: `0x${head.timestamp.toString(16)}`,
      }
    return { json: async () => ({ jsonrpc: "2.0", id: 1, result }) }
  })
  return { fetchMock, calls }
}

describe("advanceTime reports chain-time changes to the registered recorder", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    jest.resetModules()
  })

  it("records seconds, the timestamps either side and the post-mine head", async () => {
    const { fetchMock } = fakeChain({ number: 100, timestamp: 1_000 })
    globalThis.fetch = fetchMock as never
    const env = require("../e2e/lib/env")
    const seen: unknown[] = []
    env.setChainTimeRecorder((e: unknown) => seen.push(e))
    await env.advanceTime(3_600)
    expect(seen).toEqual([
      {
        kind: "chain-time",
        seconds: 3_600,
        fromTs: 1_000,
        toTs: 4_601,
        block: "101",
      },
    ])
  })

  it("makes no extra RPC call and records nothing without a recorder", async () => {
    const { fetchMock, calls } = fakeChain({ number: 100, timestamp: 1_000 })
    globalThis.fetch = fetchMock as never
    const env = require("../e2e/lib/env")
    await env.advanceTime(60)
    expect(calls).toEqual(["evm_increaseTime", "anvil_mine"])
  })

  it("never fails the time jump when the head cannot be read", async () => {
    const fetchMock = jest.fn(
      async (_url: unknown, init?: { body?: string }) => {
        const { method } = JSON.parse(init?.body ?? "{}") as { method: string }
        if (method === "eth_getBlockByNumber") throw new Error("rpc hiccup")
        return { json: async () => ({ result: null }) }
      },
    )
    globalThis.fetch = fetchMock as never
    const env = require("../e2e/lib/env")
    const seen: unknown[] = []
    env.setChainTimeRecorder((e: unknown) => seen.push(e))
    await expect(env.advanceTime(60)).resolves.toBeUndefined()
    expect(seen).toEqual([{ kind: "chain-time", seconds: 60 }])
  })
})

describe("lib/test.ts registers the journal as the recorder only under UAT_RUN_SCHEMA=3", () => {
  const originalFetch = globalThis.fetch
  const originalSchema = process.env.UAT_RUN_SCHEMA

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalSchema === undefined) delete process.env.UAT_RUN_SCHEMA
    else process.env.UAT_RUN_SCHEMA = originalSchema
    jest.resetModules()
  })

  /** Load lib/test.ts with its Playwright-bound neighbours stubbed; return the journal's `record`. */
  const loadTestModule = (): jest.Mock => {
    const record = jest.fn()
    jest.doMock("@playwright/test", () => ({
      test: { extend: () => ({}) },
      expect: () => undefined,
    }))
    jest.doMock("../e2e/lib/chain", () => ({ publicClient: {} }))
    jest.doMock("../e2e/lib/ledger", () => ({ ledgerFixture: {} }))
    jest.doMock("../e2e/lib/journal", () => ({
      record,
      journalOf: () => [],
      captureFailureShot: async () => undefined,
      finalize: async () => undefined,
    }))
    require("../e2e/lib/test")
    return record
  }

  it("uat-run/2 (UAT_RUN_SCHEMA unset): a time jump journals nothing", async () => {
    delete process.env.UAT_RUN_SCHEMA
    const record = loadTestModule()
    globalThis.fetch = fakeChain({ number: 5, timestamp: 50 })
      .fetchMock as never
    await require("../e2e/lib/env").advanceTime(3_600)
    expect(record).not.toHaveBeenCalled()
  })

  it("uat-run/3: a time jump lands in the journal as a chain-time entry", async () => {
    process.env.UAT_RUN_SCHEMA = "3"
    const record = loadTestModule()
    globalThis.fetch = fakeChain({ number: 5, timestamp: 50 })
      .fetchMock as never
    await require("../e2e/lib/env").advanceTime(3_600)
    expect(record).toHaveBeenCalledWith({
      kind: "chain-time",
      seconds: 3_600,
      fromTs: 50,
      toTs: 3_651,
      block: "6",
    })
  })
})
