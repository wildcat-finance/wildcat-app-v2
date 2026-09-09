/** @jest-environment node */

import { NextRequest } from "next/server"

import { POST as graphPost } from "@/app/api/gateway/graph/[chainId]/route"
import { POST as rpcPost } from "@/app/api/gateway/rpc/[chainId]/route"

import { isAllowedRpcRequest, isAllowedSubgraphRequest } from "./requests"

const rpcBody = { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }
const graphBody = {
  query: 'query Metadata { indexerDeployment(id: "wildcat") { id } }',
}
const context = { params: { chainId: "11155111" } }
let requestId = 0

const makeRequest = (
  kind: "rpc" | "graph",
  body: unknown = kind === "rpc" ? rpcBody : graphBody,
  options: {
    headers?: Record<string, string>
    query?: string
    signal?: AbortSignal
  } = {},
) => {
  requestId += 1
  return new NextRequest(
    `https://app.example/api/gateway/${kind}/11155111${options.query ?? ""}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://app.example",
        "x-forwarded-for": `192.0.2.${requestId}`,
        ...options.headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
      signal: options.signal,
    },
  )
}

describe("gateway proxy routes", () => {
  const originalFetch = global.fetch
  const originalEnvironment = { ...process.env }
  const mockFetch = jest.fn()

  beforeEach(() => {
    process.env.WILDCAT_GATEWAY_TOKEN = "server-only-test-token"
    global.fetch = mockFetch
    mockFetch.mockReset()
    mockFetch.mockImplementation(async () =>
      Response.json({ result: "0xaa36a7" }),
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env = { ...originalEnvironment }
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("routes RPC to the SDK gateway and constructs fresh authenticated headers", async () => {
    const response = await rpcPost(
      makeRequest("rpc", rpcBody, {
        headers: {
          Authorization: "Bearer browser-supplied-token",
          Cookie: "session=browser-cookie",
          "x-upstream-url": "https://other.example",
        },
      }),
      context,
    )

    expect(await response.json()).toEqual({ result: "0xaa36a7" })
    expect(mockFetch).toHaveBeenCalledWith(
      "https://rpc.wildcat.finance/11155111",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer server-only-test-token",
        },
        body: JSON.stringify(rpcBody),
        cache: "no-store",
        redirect: "error",
        signal: expect.any(AbortSignal),
      },
    )
  })

  it("uses the SDK's pinned subgraph release for metadata and normal queries", async () => {
    const response = await graphPost(makeRequest("graph"), context)
    await response.text()
    expect(mockFetch).toHaveBeenCalledWith(
      "https://graph.wildcat.finance/sepolia/v2.5.12",
      expect.objectContaining({ body: JSON.stringify(graphBody) }),
    )
  })

  it("accepts the real browser origin when Next normalizes a loopback URL", async () => {
    const request = new NextRequest(
      "http://127.0.0.1:3000/api/gateway/rpc/11155111",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "127.0.0.1:3000",
          origin: "http://127.0.0.1:3000",
        },
        body: JSON.stringify(rpcBody),
      },
    )
    expect(request.nextUrl.origin).toBe("http://localhost:3000")
    const response = await rpcPost(request, context)
    expect(response.status).toBe(200)
    await response.text()
  })

  it.each(["137", "011155111", "11155111/foo", "https://other.example"])(
    "rejects unsupported chain paths (%s) before accessing the gateway",
    async (chainId) => {
      const response = await rpcPost(makeRequest("rpc"), {
        params: { chainId },
      })
      expect(response.status).toBe(404)
      expect(mockFetch).not.toHaveBeenCalled()
    },
  )

  it.each([
    [{ origin: "https://other.example" }, 403],
    [{ "sec-fetch-site": "cross-site" }, 403],
    [{ "content-type": "text/plain" }, 415],
    [{ "content-length": String(1024 * 1024 + 1) }, 413],
  ] as const)("rejects disallowed request headers", async (headers, status) => {
    const response = await rpcPost(
      makeRequest("rpc", rpcBody, { headers }),
      context,
    )
    expect(response.status).toBe(status)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("rejects caller-supplied routing parameters", async () => {
    const response = await graphPost(
      makeRequest("graph", graphBody, {
        query: "?url=https://other.example",
      }),
      context,
    )
    expect(response.status).toBe(400)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("bounds actual request bytes without relying on Content-Length", async () => {
    const response = await rpcPost(
      makeRequest("rpc", " ".repeat(1024 * 1024 + 1)),
      context,
    )
    expect(response.status).toBe(413)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it.each([undefined, "", "bad token"])(
    "fails closed when the credential is unavailable",
    async (token) => {
      if (token === undefined) delete process.env.WILDCAT_GATEWAY_TOKEN
      else process.env.WILDCAT_GATEWAY_TOKEN = token
      const response = await rpcPost(makeRequest("rpc"), context)
      expect(response.status).toBe(503)
      expect(mockFetch).not.toHaveBeenCalled()
    },
  )

  it("rejects an entire RPC batch containing an unapproved method", async () => {
    const response = await rpcPost(
      makeRequest("rpc", [
        rpcBody,
        {
          ...rpcBody,
          id: 2,
          method: "debug_traceTransaction",
        },
      ]),
      context,
    )
    expect(response.status).toBe(400)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("preserves gateway status and Retry-After without forwarding arbitrary response headers", async () => {
    mockFetch.mockResolvedValue(
      Response.json(
        { error: "busy" },
        {
          status: 429,
          headers: {
            "retry-after": "4",
            "set-cookie": "upstream=secret",
            authorization: "Bearer upstream-token",
            "cache-control": "public, max-age=60",
          },
        },
      ),
    )
    const response = await rpcPost(makeRequest("rpc"), context)
    expect(response.status).toBe(429)
    expect(response.headers.get("retry-after")).toBe("4")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.has("set-cookie")).toBe(false)
    expect(response.headers.has("authorization")).toBe(false)
    expect(await response.json()).toEqual({ error: "busy" })
  })

  it("streams a history result larger than Vercel's buffered response limit", async () => {
    const data = "x".repeat(5 * 1024 * 1024)
    mockFetch.mockResolvedValue(Response.json({ data }))
    const response = await graphPost(makeRequest("graph"), context)
    expect(response.headers.has("content-length")).toBe(false)
    expect((await response.json()).data).toHaveLength(data.length)
  })

  it("cancels upstream work when the response is cancelled", async () => {
    const cancelled = jest.fn()
    mockFetch.mockResolvedValue(
      new Response(new ReadableStream({ cancel: cancelled }), {
        headers: { "content-type": "application/json" },
      }),
    )
    const response = await rpcPost(makeRequest("rpc"), context)
    await response.body?.cancel()
    expect(cancelled).toHaveBeenCalled()
    expect(mockFetch.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it("interrupts an oversized upstream response", async () => {
    mockFetch.mockResolvedValue(
      new Response(new Uint8Array(16 * 1024 * 1024 + 1), {
        headers: { "content-type": "application/json" },
      }),
    )
    const response = await rpcPost(makeRequest("rpc"), context)
    await expect(response.text()).rejects.toThrow(
      "Gateway response interrupted",
    )
    expect(mockFetch.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it("times out a stalled gateway without returning request credentials", async () => {
    jest.useFakeTimers()
    mockFetch.mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new Error("server-only-test-token")),
          )
        }),
    )
    const pendingResponse = rpcPost(makeRequest("rpc"), context)
    await jest.advanceTimersByTimeAsync(30_000)
    const response = await pendingResponse
    expect(response.status).toBe(504)
    expect(await response.text()).not.toContain("server-only-test-token")
  })

  it("returns a generic error for a rejected upstream request or redirect", async () => {
    mockFetch.mockRejectedValue(new Error("server-only-test-token"))
    const response = await rpcPost(makeRequest("rpc"), context)
    expect(response.status).toBe(502)
    expect(await response.text()).toBe('{"error":"Gateway request failed"}')
  })

  it("applies a per-instance burst guard before forwarding more work", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1_000_000)
    const headers = { "x-forwarded-for": "rate-limit-test" }
    const batch = Array.from({ length: 20 }, (_, id) => ({ ...rpcBody, id }))
    for (let index = 0; index < 3; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      const response = await rpcPost(
        makeRequest("rpc", batch, { headers }),
        context,
      )
      // eslint-disable-next-line no-await-in-loop
      await response.text()
      expect(response.status).toBe(200)
    }
    const response = await rpcPost(
      makeRequest("rpc", rpcBody, { headers }),
      context,
    )
    expect(response.status).toBe(429)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

describe("app gateway request scope", () => {
  it("allows viem simulations and broadcasts of already signed transactions", () => {
    expect(isAllowedRpcRequest({ ...rpcBody, method: "eth_call" })).toBe(true)
    expect(
      isAllowedRpcRequest({ ...rpcBody, method: "eth_sendRawTransaction" }),
    ).toBe(true)
    expect(
      isAllowedRpcRequest({ ...rpcBody, method: "eth_sendTransaction" }),
    ).toBe(false)
    expect(isAllowedRpcRequest([])).toBe(false)
    expect(isAllowedRpcRequest(Array(21).fill(rpcBody))).toBe(false)
  })

  it("allows a genuine history query of 1000 records with fragments and variables", () => {
    expect(
      isAllowedSubgraphRequest({
        query:
          "query History($first: Int!) { transfers(first: $first) { ...Record } } fragment Record on Transfer { id }",
        operationName: "History",
        variables: { first: 1000 },
      }),
    ).toBe(true)
  })

  it.each([
    "mutation { change { id } }",
    "subscription { updates { id } }",
    "not graphql",
    "query A { x } query B { y }",
  ])("rejects non-query or ambiguous GraphQL (%s)", (query) => {
    expect(isAllowedSubgraphRequest({ query })).toBe(false)
  })
})
