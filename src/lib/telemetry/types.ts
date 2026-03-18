export type TelemetryAttrValue = string | number | boolean

export type TelemetryAttrs = Record<string, TelemetryAttrValue>

export type TelemetryTimelineEvent = {
  ts: number
  kind: string
  name: string
  traceId?: string
  spanId?: string
  flowId?: string
  attrs?: TelemetryAttrs
}

export type TelemetrySpanOutcome = "success" | "error" | "cancelled"
