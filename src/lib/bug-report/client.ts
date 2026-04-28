"use client"

import { isClientOtelInitialized } from "@/lib/otel/state"
import {
  getTimelineTraceRefs,
  readTimelineEvents,
} from "@/lib/telemetry/clientTimeline"
import { captureCurrentTraceRef } from "@/lib/telemetry/clientTracing"

import {
  BUG_REPORT_MAX_TRACE_IDS,
  type BugReportPayload,
  type BugReportTrace,
} from "./types"

export const isBugReportTracingAvailable = () => isClientOtelInitialized()

export const collectBugReportTrace = (): BugReportTrace | undefined => {
  if (!isBugReportTracingAvailable()) return undefined

  const timeline = readTimelineEvents()
  const activeTrace = captureCurrentTraceRef()
  const latestEvent = [...timeline].reverse().find((e) => e.traceId)

  const primaryTraceId = activeTrace.traceId ?? latestEvent?.traceId
  const primarySpanId = activeTrace.spanId ?? latestEvent?.spanId
  if (!primaryTraceId) return undefined

  const recentTraceIds = getTimelineTraceRefs(timeline).slice(
    0,
    BUG_REPORT_MAX_TRACE_IDS,
  )

  return {
    primaryTraceId,
    primarySpanId,
    flowId: latestEvent?.flowId,
    recentTraceIds: recentTraceIds.length ? recentTraceIds : undefined,
    traceparent: primarySpanId
      ? `00-${primaryTraceId}-${primarySpanId}-01`
      : undefined,
  }
}

export const buildBugReportPayload = ({
  description,
  includeTraces,
  locale,
  walletAddress,
  connectorId,
}: {
  description: string
  includeTraces: boolean
  locale: string
  walletAddress?: string
  connectorId?: string
}): BugReportPayload => {
  const trace = includeTraces ? collectBugReportTrace() : undefined

  return {
    description,
    includeTraces: includeTraces && !!trace,
    context: {
      pageUrl: window.location.href,
      path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      locale,
      userAgent: navigator.userAgent,
      walletAddress,
      connectorId,
      otelEnabled: isBugReportTracingAvailable(),
    },
    trace,
  }
}
