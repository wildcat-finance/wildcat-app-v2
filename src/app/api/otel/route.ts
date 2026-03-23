import {
  createRateLimiter,
  isAbortError,
  isOriginAllowed,
} from "@/lib/route-guards"

export const runtime = "nodejs"

const DEFAULT_COLLECTOR_ENDPOINT = "http://localhost:4318"
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024
const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_RATE_LIMIT_MAX = 120
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000
const DEFAULT_CONTENT_TYPE = "application/x-protobuf"

const getCollectorUrl = (endpoint: string) => {
  const trimmed = endpoint.replace(/\/$/, "")
  if (trimmed.endsWith("/v1/traces")) return trimmed
  return `${trimmed}/v1/traces`
}

const parseIntEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const allowedOrigins =
  process.env.OTEL_RELAY_ALLOWED_ORIGINS?.split(",").filter(Boolean)

const checkRateLimit = createRateLimiter(
  parseIntEnv(process.env.OTEL_RELAY_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
  parseIntEnv(
    process.env.OTEL_RELAY_RATE_LIMIT_WINDOW_MS,
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  ),
)

export async function POST(request: Request) {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || DEFAULT_COLLECTOR_ENDPOINT
  const maxBodyBytes = parseIntEnv(
    process.env.OTEL_RELAY_MAX_BODY_BYTES,
    DEFAULT_MAX_BODY_BYTES,
  )
  const timeoutMs = parseIntEnv(
    process.env.OTEL_RELAY_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  )
  const upstreamAuthHeader = (
    process.env.OTEL_RELAY_UPSTREAM_AUTH_HEADER || "authorization"
  )
    .trim()
    .toLowerCase()
  const upstreamAuthValue = process.env.OTEL_RELAY_UPSTREAM_AUTH_VALUE?.trim()

  const url = getCollectorUrl(endpoint)

  if (!isOriginAllowed(request, allowedOrigins)) {
    return new Response("Forbidden origin", {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    })
  }

  const rateLimitResult = checkRateLimit(request)
  if (rateLimitResult.limited) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "retry-after": String(rateLimitResult.retryAfterSeconds ?? 1),
      },
    })
  }

  const contentLengthHeader = request.headers.get("content-length")
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10)
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return new Response("Request body too large", {
        status: 413,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      })
    }
  }

  const body = await request.arrayBuffer()
  if (body.byteLength > maxBodyBytes) {
    return new Response("Request body too large", {
      status: 413,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers = new Headers()
    const contentType = request.headers.get("content-type")
    headers.set("content-type", contentType || DEFAULT_CONTENT_TYPE)
    if (upstreamAuthValue && upstreamAuthHeader) {
      headers.set(upstreamAuthHeader, upstreamAuthValue)
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()

      return new Response(errorBody || "Upstream OTLP collector error", {
        status: response.status,
        headers: {
          "content-type":
            response.headers.get("content-type") || "text/plain; charset=utf-8",
        },
      })
    }

    return new Response(null, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") || "application/json",
      },
    })
  } catch (error) {
    if (isAbortError(error)) {
      return new Response("OTLP relay timed out", {
        status: 504,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      })
    }

    return new Response("OTLP relay failed", {
      status: 502,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}
