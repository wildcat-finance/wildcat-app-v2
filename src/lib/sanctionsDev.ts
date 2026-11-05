// Next.js supplies this build-time boundary through its compiler alias.
// eslint-disable-next-line import/no-unresolved
import "server-only"

import { SanctionsDevOverride, walletAddressSchema } from "@/utils/sanctions"

/** Only this local fixture is serialized into the page, never the server env. */
export function getSanctionsDevOverride(): SanctionsDevOverride | undefined {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.VERCEL ||
    process.env.VERCEL_ENV
  )
    return undefined
  const address = walletAddressSchema.safeParse(
    process.env.SANCTIONS_DEV_ADDRESS,
  )
  const status = process.env.SANCTIONS_DEV_STATUS
  if (
    address.success &&
    (status === "clear" || status === "blocked" || status === "unavailable")
  )
    return { address: address.data, status }
  return undefined
}
