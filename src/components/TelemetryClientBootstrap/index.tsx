"use client"

import { useEffect } from "react"

import { context, trace } from "@opentelemetry/api"

import {
  getBestClientParentContext,
  getServerTraceContext,
  setClientBootstrapContext,
} from "@/lib/otel/pageTrace"
import { appendTimelineEvent } from "@/lib/telemetry/clientTimeline"
import {
  captureCurrentTraceRef,
  endClientSpan,
  startClientSpan,
} from "@/lib/telemetry/clientTracing"

const stringifyReason = (reason: unknown) => {
  if (reason instanceof Error) return reason.message
  if (typeof reason === "string") return reason

  try {
    return JSON.stringify(reason)
  } catch {
    return String(reason)
  }
}

const TelemetryClientBootstrap = () => {
  useEffect(() => {
    const pageSpanContext = getServerTraceContext()
    const directParentContext = getBestClientParentContext()
    const hasDirectParent = Boolean(directParentContext)
    let pageParenting: "direct" | "link" | "none" = "none"
    if (hasDirectParent) {
      pageParenting = "direct"
    } else if (pageSpanContext) {
      pageParenting = "link"
    }
    const bootstrapParentContext = directParentContext ?? context.active()
    const bootstrapSpan = startClientSpan("browser.root", {
      parentContext: bootstrapParentContext,
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
        "page.route": window.location.pathname,
        "bootstrap.source": "TelemetryClientBootstrap",
        "page.parenting": pageParenting,
      },
    })
    const bootstrapContext = trace.setSpan(
      bootstrapParentContext,
      bootstrapSpan,
    )
    setClientBootstrapContext(bootstrapContext)

    let bootstrapEnded = false
    const finishBootstrapSpan = (outcome: "success" | "cancelled") => {
      if (bootstrapEnded) return
      bootstrapEnded = true
      endClientSpan(bootstrapSpan, "browser.root", outcome, {
        attributes: {
          "bootstrap.completed": outcome === "success",
        },
      })
    }

    const handleError = (event: ErrorEvent) => {
      const traceRef = captureCurrentTraceRef()

      appendTimelineEvent({
        ts: Date.now(),
        kind: "window_error",
        name: event.message || "window.error",
        traceId: traceRef.traceId,
        spanId: traceRef.spanId,
        attrs: {
          filename: event.filename || "",
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const traceRef = captureCurrentTraceRef()

      appendTimelineEvent({
        ts: Date.now(),
        kind: "unhandled_rejection",
        name: "unhandledrejection",
        traceId: traceRef.traceId,
        spanId: traceRef.spanId,
        attrs: {
          reason: stringifyReason(event.reason),
        },
      })
    }

    const handleLoad = () => {
      finishBootstrapSpan("success")
    }

    if (document.readyState === "complete") {
      queueMicrotask(handleLoad)
    } else {
      window.addEventListener("load", handleLoad, { once: true })
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("load", handleLoad)
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      finishBootstrapSpan("cancelled")
    }
  }, [])

  return null
}

export default TelemetryClientBootstrap
