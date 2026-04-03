type RateLimitEntry = {
  count: number
  resetAt: number
}

const normalizeOrigin = (origin: string) =>
  origin.trim().toLowerCase().replace(/\/$/, "")

export const getClientIp = (request: Request): string => {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  )
}

export const isOriginAllowed = (
  request: Request,
  configuredOrigins?: string[],
): boolean => {
  const origin = request.headers.get("origin")
  if (!origin) return false

  const normalized = normalizeOrigin(origin)
  const allowed =
    configuredOrigins?.map(normalizeOrigin).filter(Boolean) ??
    (() => {
      try {
        return [normalizeOrigin(new URL(request.url).origin)]
      } catch {
        return []
      }
    })()

  return allowed.includes("*") || allowed.includes(normalized)
}

export const createRateLimiter = (max: number, windowMs: number) => {
  const store = new Map<string, RateLimitEntry>()
  const MAX_STORE_SIZE = 10_000

  return (
    request: Request,
  ): { limited: boolean; retryAfterSeconds?: number } => {
    const key = getClientIp(request)
    const now = Date.now()

    if (store.size > MAX_STORE_SIZE / 2) {
      store.forEach((v, k) => {
        if (now >= v.resetAt) store.delete(k)
      })
    }

    if (store.size >= MAX_STORE_SIZE) {
      return { limited: true, retryAfterSeconds: 1 }
    }

    const entry = store.get(key)

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return { limited: false }
    }

    entry.count += 1

    if (entry.count > max) {
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      }
    }

    return { limited: false }
  }
}

export const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError"
