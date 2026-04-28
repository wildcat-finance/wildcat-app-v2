import {
  context,
  trace,
  type Context,
  type SpanContext,
} from "@opentelemetry/api"

import {
  getBestClientParentContext,
  getServerTraceContext,
} from "@/lib/otel/pageTrace"

import {
  captureCurrentTraceRef,
  endClientSpan,
  setFlowIdOnContext,
  startClientSpan,
  type TelemetryTraceRef,
} from "./clientTracing"
import { TelemetryAttrs, TelemetrySpanOutcome } from "./types"

type StartFlowSpanOptions = {
  pageLink?: boolean
  pageSpanContext?: SpanContext | null
}

export type ClientFlowRef = TelemetryTraceRef & {
  flowId?: string
}

const createFlowId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }
  return `flow-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const createClientFlowSession = () => {
  let flowSpanName: string | null = null
  let flowId: string | null = null
  let parentContext: Context | null = null

  const setFlowAttributes = (attrs?: TelemetryAttrs) => {
    if (!attrs || !parentContext) return
    const span = trace.getSpan(parentContext)
    if (!span) return
    span.setAttributes({
      ...attrs,
      ...(flowId ? { "flow.id": flowId } : {}),
    })
  }

  const startFlowSpan = (
    flowName: string,
    attrs?: TelemetryAttrs,
    options?: StartFlowSpanOptions,
  ) => {
    if (!parentContext) {
      const nextFlowId = createFlowId()
      const pageSpanContext =
        options?.pageSpanContext ??
        (options?.pageLink === false ? null : getServerTraceContext())
      const parentFromPageTrace = getBestClientParentContext()
      const hasDirectParent = Boolean(parentFromPageTrace)
      let pageParenting: "direct" | "link" | undefined
      if (hasDirectParent) {
        pageParenting = "direct"
      } else if (pageSpanContext) {
        pageParenting = "link"
      }

      const span = startClientSpan(flowName, {
        parentContext: parentFromPageTrace ?? undefined,
        flowId: nextFlowId,
        spanOptions:
          !hasDirectParent && pageSpanContext
            ? {
                links: [
                  {
                    context: pageSpanContext,
                    attributes: { "link.type": "page.render" },
                  },
                ],
              }
            : undefined,
        attributes: {
          ...attrs,
          "flow.id": nextFlowId,
          ...(typeof window !== "undefined"
            ? {
                "page.route": window.location.pathname,
              }
            : {}),
          ...(pageSpanContext
            ? {
                "page.trace_id": pageSpanContext.traceId,
              }
            : {}),
          ...(pageParenting
            ? {
                "page.parenting": pageParenting,
              }
            : {}),
        },
      })

      flowSpanName = flowName
      flowId = nextFlowId
      parentContext = setFlowIdOnContext(
        trace.setSpan(parentFromPageTrace ?? context.active(), span),
        nextFlowId,
      )
      return parentContext
    }

    if (attrs) {
      setFlowAttributes(attrs)
    }

    return parentContext
  }

  const getParentContext = () => parentContext

  const runInFlowContext = <T>(fn: () => T): T => {
    if (!parentContext) return fn()
    return context.with(parentContext, fn)
  }

  const endFlowSpan = (
    outcome: TelemetrySpanOutcome,
    attrs?: TelemetryAttrs,
  ) => {
    if (!parentContext || !flowSpanName) return
    const span = trace.getSpan(parentContext)
    if (!span) {
      parentContext = null
      flowSpanName = null
      flowId = null
      return
    }

    endClientSpan(span, flowSpanName, outcome, {
      attributes: {
        ...attrs,
        ...(flowId ? { "flow.id": flowId } : {}),
      },
      flowId: flowId ?? undefined,
    })
    parentContext = null
    flowSpanName = null
    flowId = null
  }

  const getFlowRef = (): ClientFlowRef => {
    if (!parentContext || !flowId) return {}
    const currentContext = setFlowIdOnContext(parentContext, flowId)
    const traceRef = captureCurrentTraceRef(currentContext)
    return {
      flowId,
      traceId: traceRef.traceId,
      spanId: traceRef.spanId,
    }
  }

  return {
    startFlowSpan,
    getParentContext,
    runInFlowContext,
    setFlowAttributes,
    endFlowSpan,
    getFlowRef,
  }
}

export type ClientFlowSession = ReturnType<typeof createClientFlowSession>
