/** @jest-environment node */

import { createBlockscoutExplorer, BlockscoutRequestError } from "./blockscout"
import { etherscanExplorer } from "./etherscan"
import { createExportExplorer } from "./explorer"
import { compareMarketLogSources } from "../ledger/buildMarketDataset"
import { parseExportRequest } from "../validation"

const address = `0x${"1".repeat(40)}`
const other = `0x${"2".repeat(40)}`
const hash = `0x${"3".repeat(64)}`
const blockHash = `0x${"4".repeat(64)}`
const topic = `0x${"5".repeat(64)}`
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
const addressTopic = `0x${address.slice(2).padStart(64, "0")}`
const rawLog = {
  address,
  blockNumber: "0x10",
  data: "0x1234",
  gasPrice: "0x1",
  gasUsed: "0x2",
  logIndex: "0x0",
  timeStamp: "0x123",
  topics: [topic, null, null, null],
  transactionHash: hash,
  transactionIndex: "0x1",
}
const ok = (result: unknown) => ({ status: "1", message: "OK", result })
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

describe("Ink Blockscout explorer", () => {
  const originalKey = process.env.BLOCKSCOUT_API_KEY
  beforeEach(() => {
    process.env.BLOCKSCOUT_API_KEY = "test-blockscout-key"
  })
  afterEach(() => {
    jest.restoreAllMocks()
    if (originalKey === undefined) delete process.env.BLOCKSCOUT_API_KEY
    else process.env.BLOCKSCOUT_API_KEY = originalKey
  })

  it("routes existing chains to Etherscan and keeps Ink publicly disabled", () => {
    ;([1, 11155111, 9745, 9746] as const).forEach((id) => {
      expect(createExportExplorer(id)).toBe(etherscanExplorer)
    })
    expect(createExportExplorer(763373)).not.toBe(etherscanExplorer)
    expect(() =>
      parseExportRequest({ chainId: 763373, markets: [address] }),
    ).toThrow()
  })

  it("uses independent Blockscout headers, trims padding, and matches RPC payloads", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input))
        expect(url.origin).toBe("https://api.blockscout.com")
        expect(url.pathname.startsWith("/763373/api")).toBe(true)
        expect(url.searchParams.get("apikey")).toBe("test-blockscout-key")
        return json(
          url.pathname.includes("/blocks/")
            ? { height: 16, hash: blockHash }
            : ok([rawLog]),
        )
      })
    const explorer = createBlockscoutExplorer()
    const logs = await explorer.getMarketLogs(763373, address, 16, 16)
    expect(logs[0]).toMatchObject({ blockHash, topics: [topic] })
    expect(
      compareMarketLogSources(address, [{ ...logs[0], removed: false }], logs),
    ).toEqual({ rpcCount: 1, explorerCount: 1 })
    expect(() =>
      compareMarketLogSources(
        address,
        [{ ...logs[0], data: "0xab", removed: false }],
        logs,
      ),
    ).toThrow("payload mismatches")
    await explorer.getMarketLogs(763373, address, 16, 16)
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).includes("/blocks/"),
      ),
    ).toHaveLength(1)
  })

  it.each([
    { topics: [topic, null, topic] },
    { blockNumber: "0x11" },
    { blockHash: hash },
    { address: other },
    { data: "0xZZ" },
  ])("rejects malformed or unrelated logs: %j", async (override) => {
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) =>
        json(
          String(input).includes("/blocks/")
            ? { height: 16, hash: blockHash }
            : ok([{ ...rawLog, ...override }]),
        ),
      )
    await expect(
      createBlockscoutExplorer().getMarketLogs(763373, address, 16, 16),
    ).rejects.toThrow()
  })

  it("rejects a header for another block", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) =>
        json(
          String(input).includes("/blocks/")
            ? { height: 17, hash: blockHash }
            : ok([rawLog]),
        ),
      )
    await expect(
      createBlockscoutExplorer().getMarketLogs(763373, address, 16, 16),
    ).rejects.toThrow("wrong block")
  })

  it("bisects capped log ranges without trusting ignored pagination parameters", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input))
        const from = url.searchParams.get("fromBlock")
        const to = url.searchParams.get("toBlock")
        expect(url.searchParams.has("page")).toBe(false)
        expect(url.searchParams.has("offset")).toBe(false)
        return json(
          ok(from === "16" && to === "17" ? Array(1000).fill(rawLog) : []),
        )
      })
    expect(
      await createBlockscoutExplorer().getMarketLogs(763373, address, 16, 17),
    ).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("fails closed on a capped single block", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json(ok(Array(1000).fill(rawLog))))
    await expect(
      createBlockscoutExplorer().getMarketLogs(763373, address, 16, 16),
    ).rejects.toThrow("completeness unproven")
  })

  it("bisects explicit range errors", async () => {
    const mock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        json({
          status: "0",
          message: "NOTOK",
          result: "Query timeout: block range too wide",
        }),
      )
      .mockImplementation(async () => json(ok([])))
    expect(
      await createBlockscoutExplorer().getMarketLogs(763373, address, 16, 17),
    ).toEqual([])
    expect(mock).toHaveBeenCalledTimes(3)
  })

  it.each(["logs", "transactions"])(
    "accepts explicit empty %s results",
    async (kind) => {
      jest
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () =>
          json({ status: "0", message: `No ${kind} found`, result: [] }),
        )
      const explorer = createBlockscoutExplorer()
      expect(await explorer.getMarketLogs(763373, address, 16, 16)).toEqual([])
      expect(
        await explorer.getDirectFailedTransactionHashes(
          763373,
          address,
          16,
          16,
        ),
      ).toEqual([])
    },
  )

  it("does not interpret API failures as empty history", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ status: "0", message: "NOTOK", result: [] }))
    await expect(
      createBlockscoutExplorer().getMarketLogs(763373, address, 16, 16),
    ).rejects.toThrow("request rejected")
  })

  it("deduplicates self-transfers across incoming and outgoing queries only", async () => {
    const transfer = {
      ...rawLog,
      topics: [transferTopic, addressTopic, addressTopic, null],
    }
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) =>
        json(
          String(input).includes("/blocks/")
            ? { height: 16, hash: blockHash }
            : ok([transfer]),
        ),
      )
    expect(
      await createBlockscoutExplorer().getTransferLogsMentioningAddress(
        763373,
        address,
        16,
        16,
      ),
    ).toHaveLength(1)
    jest
      .mocked(fetch)
      .mockImplementation(async (input) =>
        json(
          String(input).includes("/blocks/")
            ? { height: 16, hash: blockHash }
            : ok([transfer, transfer]),
        ),
      )
    await expect(
      createBlockscoutExplorer().getTransferLogsMentioningAddress(
        763373,
        address,
        16,
        16,
      ),
    ).rejects.toThrow("duplicate")
  })

  it("paginates transactions and returns only direct failures", async () => {
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      hash: `0x${index.toString(16).padStart(64, "0")}`,
      blockNumber: "16",
      to: address,
      isError: "0",
    }))
    rows[0].isError = "1"
    rows[1] = { ...rows[1], isError: "1", to: other }
    const mock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(ok(rows)))
      .mockResolvedValueOnce(
        json(ok([{ hash, blockNumber: "16", to: address, isError: "1" }])),
      )
    expect(
      await createBlockscoutExplorer().getDirectFailedTransactionHashes(
        763373,
        address,
        16,
        16,
      ),
    ).toEqual([rows[0].hash, hash])
    expect(
      new URL(String(mock.mock.calls[1][0])).searchParams.get("page"),
    ).toBe("2")
  })

  it("rejects repeated transaction pages", async () => {
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      hash: `0x${index.toString(16).padStart(64, "0")}`,
      blockNumber: "16",
      to: address,
      isError: "0",
    }))
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => json(ok(rows)))
    await expect(
      createBlockscoutExplorer().getDirectFailedTransactionHashes(
        763373,
        address,
        16,
        16,
      ),
    ).rejects.toThrow("repeated")
  })

  it("rejects a failed transaction with a missing recipient", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json(ok([{ hash, blockNumber: "16", isError: "1" }])))
    await expect(
      createBlockscoutExplorer().getDirectFailedTransactionHashes(
        763373,
        address,
        16,
        16,
      ),
    ).rejects.toThrow("recipient")
  })

  it("retries transient HTTP failures", async () => {
    const mock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json(ok([])))
    expect(
      await createBlockscoutExplorer().getMarketLogs(763373, address, 16, 16),
    ).toEqual([])
    expect(mock).toHaveBeenCalledTimes(2)
    expect(new BlockscoutRequestError("temporary")).toBeInstanceOf(Error)
  })

  it("rejects other chains before making requests", async () => {
    const mock = jest.spyOn(globalThis, "fetch")
    await expect(
      createBlockscoutExplorer().getMarketLogs(1, address, 16, 16),
    ).rejects.toThrow("requires Ink Sepolia")
    expect(mock).not.toHaveBeenCalled()
  })

  it("honours the Retry-After header", async () => {
    jest.useFakeTimers()
    try {
      const response = json({}, 429)
      response.headers.set("Retry-After", "1")
      const mock = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce(json(ok([])))
      const result = createBlockscoutExplorer().getMarketLogs(
        763373,
        address,
        16,
        16,
      )
      await jest.advanceTimersByTimeAsync(999)
      expect(mock).toHaveBeenCalledTimes(1)
      await jest.advanceTimersByTimeAsync(1)
      expect(await result).toEqual([])
      expect(mock).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })

  it("requires a PRO API key without making a request", async () => {
    delete process.env.BLOCKSCOUT_API_KEY
    const mock = jest.spyOn(globalThis, "fetch")
    await expect(
      createBlockscoutExplorer().getMarketLogs(763373, address, 16, 16),
    ).rejects.toThrow("BLOCKSCOUT_API_KEY")
    expect(mock).not.toHaveBeenCalled()
  })
})
