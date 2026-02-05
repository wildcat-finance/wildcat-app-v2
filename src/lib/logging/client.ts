import { context, trace } from "@opentelemetry/api"
import pino from "pino"

const level =
  process.env.NEXT_PUBLIC_LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug")

export const logger = pino({
  level,
  browser: {
    asObject: true,
  },
  mixin() {
    const span = trace.getSpan(context.active())
    const spanContext = span?.spanContext()
    if (!spanContext) return {}
    return {
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
    }
  },
})
