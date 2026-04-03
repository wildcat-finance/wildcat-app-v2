export const BUG_REPORT_DESCRIPTION_MAX_LENGTH = 500
export const BUG_REPORT_DESCRIPTION_MIN_LENGTH = 10
export const BUG_REPORT_MAX_TRACE_IDS = 5

export type BugReportTrace = {
  primaryTraceId?: string
  primarySpanId?: string
  flowId?: string
  recentTraceIds?: string[]
  traceparent?: string
}

export type BugReportPayload = {
  description: string
  includeTraces: boolean
  context: {
    pageUrl: string
    path: string
    locale: string
    userAgent?: string
    walletAddress?: string
    connectorId?: string
    otelEnabled: boolean
  }
  trace?: BugReportTrace
}
