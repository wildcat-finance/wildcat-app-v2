import { NextRequest } from "next/server"

// A per-tab anonymous capability works inside Safe's cross-origin iframe,
// where third-party cookies may be blocked. It carries no wallet identity.
export const getExportClientId = (request: NextRequest) => {
  const value = request.headers.get("x-export-client")
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value.toLowerCase()
    : undefined
}
