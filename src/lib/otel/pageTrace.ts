import {
  ROOT_CONTEXT,
  TraceFlags,
  type Context,
  propagation,
  trace,
  SpanContext,
} from "@opentelemetry/api"

const TRACEPARENT_META_NAME = "traceparent"
const TRACESTATE_META_NAME = "tracestate"
const CLIENT_BOOTSTRAP_CONTEXT_KEY = "__wildcat_client_bootstrap_context__"

const getTraceCarrierFromMeta = (): Record<string, string> | null => {
  if (typeof document === "undefined") return null

  const traceparent = document
    .querySelector(`meta[name="${TRACEPARENT_META_NAME}"]`)
    ?.getAttribute("content")
  if (!traceparent) return null

  const carrier: Record<string, string> = { traceparent }
  const tracestate = document
    .querySelector(`meta[name="${TRACESTATE_META_NAME}"]`)
    ?.getAttribute("content")
  if (tracestate) {
    carrier.tracestate = tracestate
  }

  return carrier
}

export const getServerParentContext = (
  baseContext: Context = ROOT_CONTEXT,
): Context | null => {
  const carrier = getTraceCarrierFromMeta()
  if (!carrier) return null
  return propagation.extract(baseContext, carrier)
}

export function getServerTraceContext(): SpanContext | null {
  const extracted = getServerParentContext()
  if (!extracted) return null

  return (
    trace.getSpanContext(extracted) ??
    trace.getSpan(extracted)?.spanContext() ??
    null
  )
}

const isSampledSpanContext = (spanContext: SpanContext | null) =>
  Boolean(spanContext && spanContext.traceFlags === TraceFlags.SAMPLED)

export const getSampledServerParentContext = (
  baseContext: Context = ROOT_CONTEXT,
): Context | null => {
  const serverTraceContext = getServerTraceContext()
  if (!isSampledSpanContext(serverTraceContext)) return null
  return getServerParentContext(baseContext)
}

export const getClientBootstrapContext = (): Context | null => {
  const globalState = globalThis as Record<string, unknown>
  const value = globalState[CLIENT_BOOTSTRAP_CONTEXT_KEY]
  return value ? (value as Context) : null
}

export const setClientBootstrapContext = (bootstrapContext: Context | null) => {
  const globalState = globalThis as Record<string, unknown>
  if (!bootstrapContext) {
    delete globalState[CLIENT_BOOTSTRAP_CONTEXT_KEY]
    return
  }

  globalState[CLIENT_BOOTSTRAP_CONTEXT_KEY] = bootstrapContext
}

export const getBestClientParentContext = (): Context | null =>
  getClientBootstrapContext() ?? getSampledServerParentContext()
