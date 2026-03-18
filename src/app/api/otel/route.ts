export const runtime = "nodejs"

type RateLimitEntry = {
  count: number
  resetAt: number
}

const DEFAULT_COLLECTOR_ENDPOINT = "http://localhost:4318"
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024
const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_RATE_LIMIT_MAX = 120
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000
const DEFAULT_CONTENT_TYPE = "application/x-protobuf"

const rateLimitStore = new Map<string, RateLimitEntry>()

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

const normalizeOrigin = (origin: string) =>
  origin.trim().toLowerCase().replace(/\/$/, "")

const getAllowedOrigins = (request: Request): string[] => {
  const configured = process.env.OTEL_RELAY_ALLOWED_ORIGINS
  if (configured) {
    return configured
      .split(",")
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  }

  try {
    return [normalizeOrigin(new URL(request.url).origin)]
  } catch {
    return []
  }
}

const isOriginAllowed = (request: Request): boolean => {
  const origin = request.headers.get("origin")
  if (!origin) return false

  const normalized = normalizeOrigin(origin)
  const allowedOrigins = getAllowedOrigins(request)
  if (!allowedOrigins.length) return false
  if (allowedOrigins.includes("*")) return true

  return allowedOrigins.includes(normalized)
}

const getClientKey = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const connectingIp = request.headers.get("cf-connecting-ip")
  if (connectingIp) return connectingIp

  return "unknown"
}

const enforceRateLimit = (
  request: Request,
  max: number,
  windowMs: number,
): { limited: boolean; retryAfterSeconds?: number } => {
  const key = getClientKey(request)
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return { limited: false }
  }

  entry.count += 1
  rateLimitStore.set(key, entry)

  Array.from(rateLimitStore.entries()).forEach(([entryKey, value]) => {
    if (now >= value.resetAt) {
      rateLimitStore.delete(entryKey)
    }
  })

  if (entry.count > max) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetAt - now) / 1000),
    )
    return { limited: true, retryAfterSeconds }
  }

  return { limited: false }
}

const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false
  const name = "name" in error ? String(error.name) : ""
  return name === "AbortError"
}

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
  const rateLimitMax = parseIntEnv(
    process.env.OTEL_RELAY_RATE_LIMIT_MAX,
    DEFAULT_RATE_LIMIT_MAX,
  )
  const rateLimitWindowMs = parseIntEnv(
    process.env.OTEL_RELAY_RATE_LIMIT_WINDOW_MS,
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  )
  const upstreamAuthHeader = (
    process.env.OTEL_RELAY_UPSTREAM_AUTH_HEADER || "authorization"
  )
    .trim()
    .toLowerCase()
  const upstreamAuthValue = process.env.OTEL_RELAY_UPSTREAM_AUTH_VALUE?.trim()

  const url = getCollectorUrl(endpoint)

  if (!isOriginAllowed(request)) {
    return new Response("Forbidden origin", {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    })
  }

  const rateLimitResult = enforceRateLimit(
    request,
    rateLimitMax,
    rateLimitWindowMs,
  )
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

  try {
    const headers = new Headers()
    const contentType = request.headers.get("content-type")
    headers.set("content-type", contentType || DEFAULT_CONTENT_TYPE)
    if (upstreamAuthValue && upstreamAuthHeader) {
      headers.set(upstreamAuthHeader, upstreamAuthValue)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

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
  }
}
