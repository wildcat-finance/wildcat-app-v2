import {
  context,
  Span,
  SpanStatusCode,
  trace,
  type Context,
  type SpanOptions,
} from "@opentelemetry/api"

import { TelemetryAttrs, TelemetryAttrValue } from "@/lib/telemetry/types"

type WithServerSpanOptions = {
  tracerName?: string
  parentContext?: Context
  spanOptions?: SpanOptions
  attributes?: TelemetryAttrs
}

const DEFAULT_TRACER_NAME = "wildcat-app-v2-server"

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

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

export const withServerSpan = async <T>(
  name: string,
  callback: (span: Span, activeContext: Context) => Promise<T>,
  options?: WithServerSpanOptions,
) => {
  const parentContext = options?.parentContext ?? context.active()
  const tracer = trace.getTracer(options?.tracerName ?? DEFAULT_TRACER_NAME)
  const span = tracer.startSpan(name, options?.spanOptions, parentContext)
  const attributes = toSpanAttributeRecord(options?.attributes)
  if (Object.keys(attributes).length) {
    span.setAttributes(attributes)
  }

  const activeContext = trace.setSpan(parentContext, span)

  try {
    return await context.with(activeContext, () =>
      callback(span, activeContext),
    )
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: toErrorMessage(error),
    })
    throw error
  } finally {
    span.end()
  }
}
