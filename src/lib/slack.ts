/// Internal Slack notifier for the Wildcat team (product#789).
/// Posts to the incoming-webhook URL in SLACK_WEBHOOK_URL. Without the
/// variable it degrades to a server log line and reports false. The URL is
/// a secret: it is never logged and never reaches the client.

export async function notifySlack(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) {
    console.warn(
      `slack notification skipped (SLACK_WEBHOOK_URL unset): ${text}`,
    )
    return false
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      console.error(`slack notification failed: status ${response.status}`)
    }
    return response.ok
  } catch (error) {
    console.error("slack notification failed:", error)
    return false
  }
}
