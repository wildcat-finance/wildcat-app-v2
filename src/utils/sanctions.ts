import { z } from "zod"

export const SANCTIONS_RESULT_TTL_MS = 60_000
export const SANCTIONS_REFRESH_MS = 45_000
export const SANCTIONS_TIMEOUT_MS = 10_000

export const walletAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((address) => address.toLowerCase())

export type SanctionsResult = {
  address: string
  status: "clear" | "blocked" | "unavailable"
  checkedAt: number
  validUntil: number
}
export type SanctionsDevOverride = Pick<SanctionsResult, "address" | "status">
export type SanctionsState = SanctionsResult["status"] | "checking"
