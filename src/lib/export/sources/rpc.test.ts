/** @jest-environment node */

import {
  ExportRpcClient,
  fromHex,
  normalizeRpcBlock,
  normalizeRpcLog,
} from "./rpc"

const HASH = `0x${"1".repeat(64)}`
const TX_HASH = `0x${"2".repeat(64)}`
const ADDRESS = `0x${"3".repeat(40)}`

const response = (value: unknown) => ({
  ok: true,
  status: 200,
  json: async () => value,
})

describe("export RPC boundary", () => {
  afterEach(() => jest.restoreAllMocks())

  it("rejects partial and non-canonical RPC quantities", () => {
    expect(() => fromHex("0x1junk")).toThrow("Invalid RPC quantity")
    expect(() => fromHex("0x01")).toThrow("Invalid RPC quantity")
    expect(() => fromHex(undefined)).toThrow("Invalid RPC quantity")
    expect(() => fromHex("0x20000000000000")).toThrow("safe integer")
  })

  it("validates every field in a log", () => {
    expect(
      normalizeRpcLog({
        address: ADDRESS,
        blockHash: HASH,
        transactionHash: TX_HASH,
        blockNumber: "0x1",
        transactionIndex: "0x0",
        logIndex: "0x0",
        topics: [HASH],
        data: "0x00",
        removed: false,
      }),
    ).toMatchObject({ address: ADDRESS, blockHash: HASH })
    expect(() =>
      normalizeRpcLog({
        address: ADDRESS,
        blockHash: HASH,
        transactionHash: TX_HASH,
        blockNumber: "1",
        transactionIndex: "0x0",
        logIndex: "0x0",
        topics: [HASH],
        data: "0x00",
        removed: false,
      }),
    ).toThrow("Invalid RPC quantity")
  })

  it("rejects a valid block returned for the wrong requested height", () => {
    expect(() =>
      normalizeRpcBlock({ number: "0x2", timestamp: "0x3", hash: HASH }, 1),
    ).toThrow("expected 1")
  })

  it("checks provider chain identity and uses bounded log windows", async () => {
    const methods: { method: string; params: unknown[] }[] = []
    jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        id: number
        method: string
        params: unknown[]
      }
      methods.push(body)
      return response({
        jsonrpc: "2.0",
        id: body.id,
        result: body.method === "eth_chainId" ? "0x1" : [],
      }) as never
    })
    const rpc = new ExportRpcClient(1, ["https://rpc.example"])
    await expect(
      rpc.getLogs({ fromBlock: 0, toBlock: 100_000 }),
    ).resolves.toEqual([])
    expect(
      methods.filter(({ method }) => method === "eth_chainId"),
    ).toHaveLength(1)
    expect(
      methods.filter(({ method }) => method === "eth_getLogs"),
    ).toHaveLength(3)
  })

  it("rejects a provider connected to another chain", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { id: number }
      return response({ jsonrpc: "2.0", id: body.id, result: "0x2" }) as never
    })
    const rpc = new ExportRpcClient(1, ["https://wrong.example"])
    await expect(rpc.call("eth_blockNumber", [])).rejects.toThrow("wrong chain")
  })

  it("fails over immediately when a provider returns HTTP 429", async () => {
    const requests: string[] = []
    jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input)
      requests.push(url)
      if (url === "https://limited.example") {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ "retry-after": "1" }),
          json: async () => ({}),
        } as Response
      }
      const body = JSON.parse(String(init?.body)) as {
        id: number
        method: string
      }
      return response({
        jsonrpc: "2.0",
        id: body.id,
        result: body.method === "eth_chainId" ? "0x1" : "0x123",
      }) as never
    })

    const rpc = new ExportRpcClient(1, [
      "https://limited.example",
      "https://healthy.example",
    ])
    await expect(rpc.call("eth_blockNumber", [])).resolves.toBe("0x123")
    expect(requests).toEqual([
      "https://limited.example",
      "https://healthy.example",
      "https://healthy.example",
    ])
  })

  it("bisects only provider-declared range failures", async () => {
    let logCalls = 0
    jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        id: number
        method: string
      }
      if (body.method === "eth_chainId") {
        return response({ jsonrpc: "2.0", id: body.id, result: "0x1" }) as never
      }
      logCalls += 1
      return response(
        logCalls === 1
          ? {
              jsonrpc: "2.0",
              id: body.id,
              error: { code: -32005, message: "block range too wide" },
            }
          : { jsonrpc: "2.0", id: body.id, result: [] },
      ) as never
    })
    const rpc = new ExportRpcClient(1, ["https://rpc.example"])
    await expect(rpc.getLogs({ fromBlock: 0, toBlock: 10 })).resolves.toEqual(
      [],
    )
    expect(logCalls).toBe(3)
  })

  it("does not disguise invalid requests as range failures", async () => {
    let logCalls = 0
    jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        id: number
        method: string
      }
      if (body.method === "eth_chainId") {
        return response({ jsonrpc: "2.0", id: body.id, result: "0x1" }) as never
      }
      logCalls += 1
      return response({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32602, message: "invalid argument" },
      }) as never
    })
    const rpc = new ExportRpcClient(1, ["https://rpc.example"])
    await expect(rpc.getLogs({ fromBlock: 0, toBlock: 10 })).rejects.toThrow(
      "invalid argument",
    )
    expect(logCalls).toBe(1)
  })
})
