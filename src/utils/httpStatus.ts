const RETRYABLE_CLIENT_STATUSES = new Set([408, 425, 429])

export const isTerminalClientError = (status: number) =>
  status >= 400 && status < 500 && !RETRYABLE_CLIENT_STATUSES.has(status)
