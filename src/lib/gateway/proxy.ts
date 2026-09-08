import "server-only"

import {
  getRpcConnection,
  isSupportedChainId,
  SubgraphUrls,
} from "@wildcatfi/wildcat-sdk"
import type { NextRequest } from "next/server"

import { isAllowedRpcRequest, isAllowedSubgraphRequest } from "./requests"
import { getGatewayToken } from "./server"

type GatewayKind = "rpc" | "graph"

const MAX_REQUEST_BYTES = 1024 * 1024
const REQUEST_TIMEOUT_MS = 30_000
const MAX_ACTIVE_REQUESTS = 32
const buckets = new Map<string, { tokens: number; updatedAt: number }>()
let activeRequests = 0

const errorResponse = (status: number, message: string) =>
  Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "1" } : {}),
      },
    },
  )

// A per-instance burst guard, not a shared/global quota. Vercel Firewall can
// impose a deployment-wide policy without putting the bearer in the browser.
const takeBudget = (request: NextRequest, cost: number) => {
  const key =
    request.ip ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  const now = Date.now()
  const previous = buckets.get(key)
  const tokens = previous
    ? Math.min(60, previous.tokens + (now - previous.updatedAt) / 100)
    : 60
  if (!previous && buckets.size >= 10_000) {
    const oldest = buckets.keys().next().value
    if (oldest !== undefined) buckets.delete(oldest)
  }
  buckets.set(key, { tokens: Math.max(0, tokens - cost), updatedAt: now })
  return tokens >= cost
}

class RequestTooLargeError extends Error {}

const readBody = async (request: NextRequest, signal: AbortSignal) => {
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    throw new RequestTooLargeError()
  }
  const reader = request.body?.getReader()
  if (!reader) throw new Error("Missing request body")
  const abort = () => {
    reader.cancel().catch(() => {})
  }
  signal.addEventListener("abort", abort, { once: true })
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (!signal.aborted) {
      signal.throwIfAborted()
      // Bound actual bytes even when Content-Length is absent or incorrect.
      // eslint-disable-next-line no-await-in-loop
      const chunk = await reader.read()
      signal.throwIfAborted()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > MAX_REQUEST_BYTES) throw new RequestTooLargeError()
      chunks.push(chunk.value)
    }
    signal.throwIfAborted()
    return Buffer.concat(chunks).toString("utf8")
  } finally {
    signal.removeEventListener("abort", abort)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export const proxyGatewayRequest = async (
  request: NextRequest,
  kind: GatewayKind,
  chainIdParameter: string,
) => {
  const chainId = Number(chainIdParameter)
  if (String(chainId) !== chainIdParameter || !isSupportedChainId(chainId)) {
    return errorResponse(404, "Unsupported gateway chain")
  }
  // This blocks cross-site browser use; it is not authentication for scripts.
  const origin = request.headers.get("origin")
  // NextURL normalizes loopback IPs to localhost. Use the HTTP Host header so
  // browsers visiting 127.0.0.1 retain their actual origin during development.
  const host = request.headers.get("host") ?? request.nextUrl.host
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.slice(0, -1)
  if (
    (origin && origin !== `${protocol}://${host}`) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    return errorResponse(403, "Cross-site gateway requests are not allowed")
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return errorResponse(415, "Expected application/json")
  }
  if (request.nextUrl.search) {
    return errorResponse(400, "Gateway query parameters are not supported")
  }
  if (activeRequests >= MAX_ACTIVE_REQUESTS || !takeBudget(request, 1)) {
    return errorResponse(429, "Gateway proxy is busy; retry shortly")
  }

  let token: string
  try {
    token = getGatewayToken()
  } catch {
    return errorResponse(503, "Gateway credentials are not configured")
  }

  activeRequests += 1
  const controller = new AbortController()
  const abort = () => {
    controller.abort()
    // Cleanup and the abort listener share the same lifecycle.
    // eslint-disable-next-line no-use-before-define
    release()
  }
  const timeout = setTimeout(abort, REQUEST_TIMEOUT_MS)
  let released = false
  const release = () => {
    if (released) return
    released = true
    clearTimeout(timeout)
    request.signal.removeEventListener("abort", abort)
    activeRequests -= 1
  }
  request.signal.addEventListener("abort", abort, { once: true })
  if (request.signal.aborted) abort()

  let rawBody: string
  let body: unknown
  try {
    rawBody = await readBody(request, controller.signal)
    body = JSON.parse(rawBody)
  } catch (error) {
    release()
    if (controller.signal.aborted)
      return errorResponse(408, "Request timed out")
    if (error instanceof RequestTooLargeError) {
      return errorResponse(413, "Gateway request is too large")
    }
    return errorResponse(400, "Invalid JSON request")
  }
  const allowed =
    kind === "rpc" ? isAllowedRpcRequest(body) : isAllowedSubgraphRequest(body)
  if (!allowed) {
    release()
    return errorResponse(400, "Unsupported gateway request")
  }
  if (Array.isArray(body) && !takeBudget(request, body.length - 1)) {
    release()
    return errorResponse(429, "Gateway proxy is busy; retry shortly")
  }

  try {
    const url =
      kind === "rpc" ? getRpcConnection(chainId).url : SubgraphUrls[chainId]
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: rawBody,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    })
    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    })
    const retryAfter = upstream.headers.get("retry-after")
    if (retryAfter) headers.set("Retry-After", retryAfter)
    if (upstream.status === 204) {
      release()
      return new Response(null, { status: 204, headers })
    }
    if (
      !upstream.body ||
      !upstream.headers.get("content-type")?.includes("json")
    ) {
      controller.abort()
      release()
      return errorResponse(502, "Invalid gateway response")
    }
    const reader = upstream.body.getReader()
    const maxBytes = (kind === "graph" ? 32 : 16) * 1024 * 1024
    let bytes = 0
    // Stream to avoid Vercel's 4.5 MB buffered-response limit. Keep the deadline
    // and concurrency slot until the entire body finishes or is cancelled.
    const stream = new ReadableStream<Uint8Array>({
      async pull(output) {
        try {
          controller.signal.throwIfAborted()
          const chunk = await reader.read()
          if (chunk.done) {
            output.close()
            release()
            return
          }
          bytes += chunk.value.byteLength
          if (bytes > maxBytes) throw new Error("Gateway response is too large")
          output.enqueue(chunk.value)
        } catch {
          output.error(new Error("Gateway response interrupted"))
          controller.abort()
          await reader.cancel().catch(() => {})
          release()
        }
      },
      async cancel() {
        controller.abort()
        await reader.cancel().catch(() => {})
        release()
      },
    })
    return new Response(stream, { status: upstream.status, headers })
  } catch {
    release()
    return controller.signal.aborted
      ? errorResponse(504, "Gateway request timed out")
      : errorResponse(502, "Gateway request failed")
  }
}
