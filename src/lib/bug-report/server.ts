import { randomBytes } from "crypto"

import { z } from "zod"

import { BUG_REPORT_DEFAULT_GRAFANA_EXPLORE_PATH } from "./config"
import {
  BUG_REPORT_DESCRIPTION_MAX_LENGTH,
  BUG_REPORT_DESCRIPTION_MIN_LENGTH,
  BUG_REPORT_MAX_TRACE_IDS,
} from "./types"

const traceSchema = z.object({
  primaryTraceId: z.string().max(64).optional(),
  primarySpanId: z.string().max(32).optional(),
  flowId: z.string().max(128).optional(),
  recentTraceIds: z
    .array(z.string().max(64))
    .max(BUG_REPORT_MAX_TRACE_IDS)
    .optional(),
  traceparent: z.string().max(128).optional(),
})

export const bugReportPayloadSchema = z.object({
  description: z
    .string()
    .transform((s) => s.replace(/\0/g, "").replace(/\r\n/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(BUG_REPORT_DESCRIPTION_MIN_LENGTH)
        .max(BUG_REPORT_DESCRIPTION_MAX_LENGTH),
    ),
  includeTraces: z.boolean(),
  context: z.object({
    pageUrl: z.string().url().max(2_048),
    path: z.string().max(2_048),
    locale: z.string().max(16),
    userAgent: z.string().max(512).optional(),
    walletAddress: z.string().max(42).optional(),
    connectorId: z.string().max(128).optional(),
    otelEnabled: z.boolean(),
  }),
  trace: traceSchema.optional(),
})

export type ValidatedBugReportPayload = z.infer<typeof bugReportPayloadSchema>

export const createBugReportId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `BR-${date}-${randomBytes(3).toString("hex").toUpperCase()}`
}

const escapeSlackMrkdwn = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const escapeSlackUrl = (url: string) =>
  url.replace(/>/g, "%3E").replace(/\|/g, "%7C")

export const buildGrafanaTraceUrl = (
  traceId: string | undefined,
  env: {
    grafanaBaseUrl?: string
    grafanaDatasourceUid?: string
    grafanaOrgId?: string
    grafanaExplorePath?: string
  },
) => {
  if (!traceId || !env.grafanaBaseUrl || !env.grafanaDatasourceUid)
    return undefined

  try {
    const url = new URL(
      env.grafanaExplorePath || BUG_REPORT_DEFAULT_GRAFANA_EXPLORE_PATH,
      env.grafanaBaseUrl,
    )
    url.searchParams.set(
      "left",
      JSON.stringify({
        datasource: env.grafanaDatasourceUid,
        queries: [
          {
            query: `{ trace:id = "${traceId}" }`,
            queryType: "traceqlSearch",
            refId: "A",
          },
        ],
        range: { from: "now-6h", to: "now" },
      }),
    )
    if (env.grafanaOrgId) url.searchParams.set("orgId", env.grafanaOrgId)
    return url.toString()
  } catch {
    return undefined
  }
}

export const buildBugReportSlackMessage = ({
  reportId,
  payload,
  grafanaUrl,
}: {
  reportId: string
  payload: ValidatedBugReportPayload
  grafanaUrl?: string
}) => {
  const wallet = payload.context.walletAddress || "Not connected"
  const traceQl = payload.trace?.primaryTraceId
    ? `{ trace:id = "${payload.trace.primaryTraceId}" }`
    : undefined

  const fallbackLines = [
    `Bug report received [${reportId}]`,
    `Description: ${payload.description}`,
    `Page: ${payload.context.path}`,
    `Wallet: ${wallet}`,
  ]
  if (payload.trace?.primaryTraceId)
    fallbackLines.push(`Trace ID: ${payload.trace.primaryTraceId}`)
  if (grafanaUrl) fallbackLines.push(`Grafana: ${grafanaUrl}`)

  const traceLines = payload.trace
    ? ([
        payload.trace.primaryTraceId &&
          `*Trace ID:* \`${payload.trace.primaryTraceId}\``,
        payload.trace.primarySpanId &&
          `*Span ID:* \`${payload.trace.primarySpanId}\``,
        payload.trace.flowId &&
          `*Flow ID:* \`${escapeSlackMrkdwn(payload.trace.flowId)}\``,
        payload.trace.recentTraceIds?.length &&
          `*Recent Trace IDs:* ${payload.trace.recentTraceIds
            .map((id) => `\`${id}\``)
            .join(", ")}`,
        traceQl && `*TraceQL:* \`${traceQl}\``,
        grafanaUrl && `*Grafana:* <${grafanaUrl}|Open trace in Grafana>`,
      ].filter(Boolean) as string[])
    : []

  return {
    text: fallbackLines.join("\n"),
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Bug report received" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Report ID:* \`${reportId}\`\n*Description:*\n${escapeSlackMrkdwn(
            payload.description,
          )}`,
        },
      },
      {
        type: "section",
        fields: [
          `*Path*\n${escapeSlackMrkdwn(payload.context.path)}`,
          `*Locale*\n\`${escapeSlackMrkdwn(payload.context.locale)}\``,
          `*Wallet*\n\`${escapeSlackMrkdwn(wallet)}\``,
          payload.context.connectorId
            ? `*Connector*\n\`${escapeSlackMrkdwn(
                payload.context.connectorId,
              )}\``
            : `*Connector*\nNot available`,
        ].map((text) => ({ type: "mrkdwn" as const, text })),
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Page URL:* <${escapeSlackUrl(
            payload.context.pageUrl,
          )}|${escapeSlackMrkdwn(payload.context.pageUrl)}>`,
        },
      },
      ...(traceLines.length
        ? [
            {
              type: "section" as const,
              text: {
                type: "mrkdwn" as const,
                text: traceLines.join("\n"),
              },
            },
          ]
        : []),
    ],
  }
}

export const getBugReportSlackEnv = () => ({
  slackBotToken: process.env.SLACK_BOT_TOKEN?.trim(),
  slackChannel: process.env.SLACK_BUG_REPORT_CHANNEL?.trim(),
  grafanaBaseUrl: process.env.SLACK_BUG_REPORT_GRAFANA_BASE_URL?.trim(),
  grafanaDatasourceUid:
    process.env.SLACK_BUG_REPORT_GRAFANA_DATASOURCE_UID?.trim(),
  grafanaOrgId: process.env.SLACK_BUG_REPORT_GRAFANA_ORG_ID?.trim(),
  grafanaExplorePath: process.env.SLACK_BUG_REPORT_GRAFANA_EXPLORE_PATH?.trim(),
})
