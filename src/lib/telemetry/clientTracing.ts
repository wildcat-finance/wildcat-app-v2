import {
  createContextKey,
  context,
  Span,
  SpanStatusCode,
  trace,
  type Context,
  type SpanOptions,
} from "@opentelemetry/api"

import { appendTimelineEvent } from "@/lib/telemetry/clientTimeline"
import {
  TelemetryAttrs,
  TelemetryAttrValue,
  TelemetrySpanOutcome,
} from "@/lib/telemetry/types"

type SpanRecordOptions = {
  attributes?: TelemetryAttrs
  flowId?: string
}

export type TelemetryTraceRef = {
  traceId?: string
  spanId?: string
}

type StartClientSpanOptions = {
  tracerName?: string
  parentContext?: Context
  spanOptions?: SpanOptions
  attributes?: TelemetryAttrs
  flowId?: string
}

type EndClientSpanOptions = {
  attributes?: TelemetryAttrs
  error?: unknown
  flowId?: string
}

type WithClientSpanOptions = StartClientSpanOptions

const DEFAULT_TRACER_NAME = "wildcat-app-v2-web"
const FLOW_ID_CONTEXT_KEY = createContextKey("wildcat.flow_id")

const toSpanAttributeRecord = (
  attrs?: TelemetryAttrs,
): Record<string, TelemetryAttrValue> => {
  if (!attrs) return {}

  return Object.entries(attrs).reduce<Record<string, TelemetryAttrValue>>(
    (acc, [key, value]) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        acc[key] = value
      }
      return acc
    },
    {},
  )
}

const getSpanReference = (span: Span): Required<TelemetryTraceRef> => {
  const spanContext = span.spanContext()
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  }
}

const stringifyError = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

export const captureCurrentTraceRef = (
  activeContext?: Context,
): TelemetryTraceRef => {
  const span = trace.getSpan(activeContext ?? context.active())
  if (!span) return {}

  return getSpanReference(span)
}

export const getFlowIdFromContext = (
  activeContext: Context = context.active(),
): string | undefined => {
  const value = activeContext.getValue(FLOW_ID_CONTEXT_KEY)
  return typeof value === "string" ? value : undefined
}

export const setFlowIdOnContext = (
  targetContext: Context,
  flowId?: string,
): Context => {
  if (!flowId) return targetContext
  return targetContext.setValue(FLOW_ID_CONTEXT_KEY, flowId)
}

export const recordTraceRef = (
  name: string,
  attrs?: TelemetryAttrs,
  options?: { flowId?: string },
) => {
  const { traceId, spanId } = captureCurrentTraceRef()
  if (!traceId) return
  const flowId = options?.flowId ?? getFlowIdFromContext()

  appendTimelineEvent({
    ts: Date.now(),
    kind: "trace_ref",
    name,
    traceId,
    spanId,
    flowId,
    attrs,
  })
}

export const recordSpanStart = (
  span: Span,
  name: string,
  options?: SpanRecordOptions,
) => {
  const spanAttrs = toSpanAttributeRecord(options?.attributes)
  const flowId = options?.flowId ?? getFlowIdFromContext()
  if (flowId) spanAttrs["flow.id"] = flowId
  if (Object.keys(spanAttrs).length) {
    span.setAttributes(spanAttrs)
  }

  const { traceId, spanId } = getSpanReference(span)
  appendTimelineEvent({
    ts: Date.now(),
    kind: "span_start",
    name,
    traceId,
    spanId,
    flowId,
    attrs: options?.attributes,
  })
}

export const recordSpanEnd = (
  span: Span,
  name: string,
  outcome: TelemetrySpanOutcome,
  options?: SpanRecordOptions,
) => {
  const spanAttrs = toSpanAttributeRecord(options?.attributes)
  const flowId = options?.flowId ?? getFlowIdFromContext()
  if (flowId) spanAttrs["flow.id"] = flowId
  if (Object.keys(spanAttrs).length) {
    span.setAttributes(spanAttrs)
  }

  const { traceId, spanId } = getSpanReference(span)
  appendTimelineEvent({
    ts: Date.now(),
    kind: "span_end",
    name,
    traceId,
    spanId,
    flowId,
    attrs: {
      outcome,
      ...(options?.attributes || {}),
    },
  })
}

export const startClientSpan = (
  name: string,
  options?: StartClientSpanOptions,
): Span => {
  const tracer = trace.getTracer(options?.tracerName ?? DEFAULT_TRACER_NAME)
  const flowId = options?.flowId ?? getFlowIdFromContext(options?.parentContext)
  const span = tracer.startSpan(
    name,
    options?.spanOptions,
    options?.parentContext ?? context.active(),
  )

  recordSpanStart(span, name, {
    attributes: options?.attributes,
    flowId,
  })
  return span
}

export const endClientSpan = (
  span: Span,
  name: string,
  outcome: TelemetrySpanOutcome,
  options?: EndClientSpanOptions,
) => {
  if (options?.error) {
    span.recordException(options.error as Error)
  }

  if (outcome === "error") {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: options?.error ? stringifyError(options.error) : name,
    })
  } else if (outcome === "success") {
    span.setStatus({ code: SpanStatusCode.OK })
  } else {
    span.setStatus({
      code: SpanStatusCode.UNSET,
      message: "cancelled",
    })
  }

  recordSpanEnd(span, name, outcome, {
    attributes: options?.attributes,
    flowId: options?.flowId,
  })
  span.end()
}

export const withClientSpan = async <T>(
  name: string,
  callback: (span: Span, activeContext: Context) => Promise<T>,
  options?: WithClientSpanOptions,
) => {
  const parentContext = options?.parentContext ?? context.active()
  const flowId = options?.flowId ?? getFlowIdFromContext(parentContext)
  const span = startClientSpan(name, {
    tracerName: options?.tracerName,
    parentContext,
    spanOptions: options?.spanOptions,
    attributes: options?.attributes,
    flowId,
  })

  const activeContext = setFlowIdOnContext(
    trace.setSpan(parentContext, span),
    flowId,
  )

  try {
    const result = await context.with(activeContext, () =>
      callback(span, activeContext),
    )
    endClientSpan(span, name, "success", { flowId })
    return result
  } catch (error) {
    endClientSpan(span, name, "error", { error, flowId })
    throw error
  }
}
