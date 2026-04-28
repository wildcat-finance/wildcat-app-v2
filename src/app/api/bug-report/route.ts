import {
  BUG_REPORT_MAX_BODY_BYTES,
  BUG_REPORT_RATE_LIMIT_MAX,
  BUG_REPORT_RATE_LIMIT_WINDOW_MS,
  BUG_REPORT_SLACK_TIMEOUT_MS,
} from "@/lib/bug-report/config"
import {
  bugReportPayloadSchema,
  buildBugReportSlackMessage,
  buildGrafanaTraceUrl,
  createBugReportId,
  getBugReportSlackEnv,
} from "@/lib/bug-report/server"
import { logger } from "@/lib/logging/server"
import {
  createRateLimiter,
  isAbortError,
  isOriginAllowed,
} from "@/lib/route-guards"

export const runtime = "nodejs"

const checkRateLimit = createRateLimiter(
  BUG_REPORT_RATE_LIMIT_MAX,
  BUG_REPORT_RATE_LIMIT_WINDOW_MS,
)

export async function POST(request: Request) {
  if (!isOriginAllowed(request)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 })
  }

  const rateLimit = checkRateLimit(request)
  if (rateLimit.limited) {
    return Response.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "retry-after": String(rateLimit.retryAfterSeconds ?? 1) },
      },
    )
  }

  const raw = await request.text()
  if (raw.length > BUG_REPORT_MAX_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(raw)
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const result = bugReportPayloadSchema.safeParse(parsedBody)
  if (!result.success) {
    return Response.json(
      { error: result.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    )
  }

  const slackEnv = getBugReportSlackEnv()
  if (!slackEnv.slackBotToken || !slackEnv.slackChannel) {
    logger.error("Bug report route is missing Slack configuration")
    return Response.json(
      { error: "Bug reporting is not configured" },
      { status: 503 },
    )
  }

  const reportId = createBugReportId()
  const grafanaUrl = buildGrafanaTraceUrl(
    result.data.trace?.primaryTraceId,
    slackEnv,
  )
  const slackMessage = buildBugReportSlackMessage({
    reportId,
    payload: result.data,
    grafanaUrl,
  })

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    BUG_REPORT_SLACK_TIMEOUT_MS,
  )

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        authorization: `Bearer ${slackEnv.slackBotToken}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: slackEnv.slackChannel,
        text: slackMessage.text,
        blocks: slackMessage.blocks,
      }),
      signal: controller.signal,
    })

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean
      error?: string
    } | null

    if (!response.ok || !body?.ok) {
      logger.error(
        { reportId, slack_status: response.status, slack_error: body?.error },
        "Failed to post bug report to Slack",
      )
      return Response.json(
        { error: "Bug report delivery failed" },
        { status: 502 },
      )
    }

    logger.info(
      {
        reportId,
        walletAddress: result.data.context.walletAddress,
        primaryTraceId: result.data.trace?.primaryTraceId,
        includeTraces: result.data.includeTraces,
      },
      "Accepted bug report",
    )

    return Response.json({ reportId })
  } catch (error) {
    if (isAbortError(error)) {
      logger.error({ reportId }, "Bug report delivery timed out")
      return Response.json(
        { error: "Bug report delivery timed out" },
        { status: 504 },
      )
    }

    logger.error({ err: error, reportId }, "Bug report delivery failed")
    return Response.json(
      { error: "Bug report delivery failed" },
      { status: 502 },
    )
  } finally {
    clearTimeout(timeout)
  }
}
