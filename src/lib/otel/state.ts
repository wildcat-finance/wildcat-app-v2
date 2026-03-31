const OTEL_CLIENT_INIT_KEY = "__wildcat_otel_client_initialized__"

export function markClientOtelInitialized() {
  if (typeof window === "undefined") return

  const globalState = globalThis as unknown as Record<string, boolean>
  globalState[OTEL_CLIENT_INIT_KEY] = true
}

export function isClientOtelInitialized() {
  if (typeof window === "undefined") return false

  const globalState = globalThis as unknown as Record<string, boolean>
  return Boolean(globalState[OTEL_CLIENT_INIT_KEY])
}
