import { context, propagation, trace } from "@opentelemetry/api"
import type { SpanContext } from "@opentelemetry/api"

const TRACEPARENT_META_NAME = "traceparent"
const TRACESTATE_META_NAME = "tracestate"

export function getServerTraceContext(): SpanContext | null {
  if (typeof document === "undefined") return null

  const traceparent = document
    .querySelector(`meta[name="${TRACEPARENT_META_NAME}"]`)
    ?.getAttribute("content")
  if (!traceparent) return null

  const tracestate = document
    .querySelector(`meta[name="${TRACESTATE_META_NAME}"]`)
    ?.getAttribute("content")

  const carrier: Record<string, string> = { traceparent }
  if (tracestate) carrier.tracestate = tracestate

  const extracted = propagation.extract(context.active(), carrier)
  const span = trace.getSpan(extracted)
  return span?.spanContext() ?? null
}
