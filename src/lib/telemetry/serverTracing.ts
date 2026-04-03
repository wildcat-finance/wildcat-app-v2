import { context, trace, type Context } from "@opentelemetry/api"

export type ServerTraceRef = {
  traceId?: string
  spanId?: string
}

export const getServerTraceRef = (
  activeContext: Context = context.active(),
): ServerTraceRef => {
  const span = trace.getSpan(activeContext)
  const spanContext = span?.spanContext()

  if (!spanContext) return {}

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  }
}
