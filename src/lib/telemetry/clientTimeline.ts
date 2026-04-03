import {
  TelemetryAttrs,
  TelemetryAttrValue,
  TelemetryTimelineEvent,
} from "@/lib/telemetry/types"

const STORAGE_KEY = "wildcat.telemetry.timeline"
const MAX_TIMELINE_EVENTS = 200

const isTelemetryAttrValue = (value: unknown): value is TelemetryAttrValue =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"

const sanitizeAttrs = (attrs?: Record<string, unknown>): TelemetryAttrs => {
  if (!attrs) return {}

  return Object.entries(attrs).reduce<TelemetryAttrs>((acc, [key, value]) => {
    if (!isTelemetryAttrValue(value)) return acc
    acc[key] = value
    return acc
  }, {})
}

const sanitizeEvent = (
  event: TelemetryTimelineEvent,
): TelemetryTimelineEvent => {
  const safeEvent: TelemetryTimelineEvent = {
    ts: Number.isFinite(event.ts) ? event.ts : Date.now(),
    kind: String(event.kind || "unknown"),
    name: String(event.name || "unnamed"),
  }

  if (event.traceId) safeEvent.traceId = event.traceId
  if (event.spanId) safeEvent.spanId = event.spanId
  if (event.flowId) safeEvent.flowId = event.flowId

  const attrs = sanitizeAttrs(event.attrs)
  if (Object.keys(attrs).length) {
    safeEvent.attrs = attrs
  }

  return safeEvent
}

export const readTimelineEvents = (): TelemetryTimelineEvent[] => {
  if (typeof window === "undefined") return []

  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is TelemetryTimelineEvent => Boolean(item))
      .map((item) => sanitizeEvent(item))
      .slice(-MAX_TIMELINE_EVENTS)
  } catch {
    return []
  }
}

export const appendTimelineEvent = (event: TelemetryTimelineEvent) => {
  if (typeof window === "undefined") return

  const current = readTimelineEvents()
  current.push(sanitizeEvent(event))
  const next = current.slice(-MAX_TIMELINE_EVENTS)

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures (e.g. private browsing restrictions).
  }
}

export const clearTimelineEvents = () => {
  if (typeof window === "undefined") return

  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures (e.g. private browsing restrictions).
  }
}

export const getTimelineTraceRefs = (
  timeline: TelemetryTimelineEvent[],
): string[] => {
  const refs = new Set<string>()

  timeline.forEach((event) => {
    if (event.traceId) refs.add(event.traceId)
  })

  return Array.from(refs)
}
