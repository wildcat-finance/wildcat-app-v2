import { z } from "zod"

import {
  SANCTIONS_RESULT_TTL_MS,
  SANCTIONS_TIMEOUT_MS,
  SanctionsDevOverride,
  SanctionsResult,
  walletAddressSchema,
} from "@/utils/sanctions"

const LIST = "redstone-mainnet"
const ORACLE = "0x574ad490fe8087b580db227a8ca7efb7c19dc8c4"
const IMPLEMENTATION = "0x0e89f02febddf91dd0e61be9b0fb4a5b55a914d5"
const DEPLOYMENT = "QmV4rcuTiHaqqxxwYXNByYy17LfYuCA7TTRW7nydRTC4b6"
const START_BLOCK = 25_748_072
const DEFAULT_URL = "https://graph.wildcat.finance/mainnet-sanctions/v0.1.0"

const query = `query ScreenWallet($id: ID!) {
  _meta { deployment hasIndexingErrors block { number hash timestamp } }
  sanctionsList(id: "redstone-mainnet") {
    id chainId oracleAddress implementation activeCount knownAddressCount
    updateSequence lastUpdateBlock lastUpdateTimestamp
  }
  sanctionedAccount(id: $id) { id address isSanctioned list { id } }
}`

const integer = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine(Number.isSafeInteger)
const graphResponseSchema = z.object({
  errors: z.array(z.unknown()).optional(),
  data: z.object({
    _meta: z.object({
      deployment: z.string(),
      hasIndexingErrors: z.literal(false),
      block: z.object({
        number: z.number().int().min(START_BLOCK),
        hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
        timestamp: z.number().int().positive(),
      }),
    }),
    sanctionsList: z.object({
      id: z.literal(LIST),
      chainId: z.literal("1"),
      oracleAddress: walletAddressSchema,
      implementation: walletAddressSchema,
      activeCount: integer,
      knownAddressCount: integer,
      updateSequence: integer,
      lastUpdateBlock: integer,
      lastUpdateTimestamp: integer,
    }),
    sanctionedAccount: z
      .object({
        id: z.string(),
        address: walletAddressSchema,
        isSanctioned: z.boolean(),
        list: z.object({ id: z.literal(LIST) }),
      })
      .nullable(),
  }),
})

function positiveSeconds(value: string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback
  const seconds = Number(value)
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error("Invalid sanctions freshness configuration")
  }
  return seconds
}

function result(
  address: string,
  status: SanctionsResult["status"],
  checkedAt: number,
  validUntil = checkedAt + SANCTIONS_RESULT_TTL_MS,
): SanctionsResult {
  return { address, status, checkedAt, validUntil }
}

/** Screen a wallet directly from the browser against the reviewed gateway. */
export async function screenWallet(
  input: string,
  options: { signal?: AbortSignal; devOverride?: SanctionsDevOverride } = {},
): Promise<SanctionsResult> {
  const address = walletAddressSchema.parse(input)
  const startedAt = Date.now()
  // The server supplies this fixture only in local development. Never consult
  // private env values in this browser-compatible module.
  if (
    process.env.NODE_ENV === "development" &&
    options.devOverride?.address === address
  ) {
    return result(address, options.devOverride.status, startedAt)
  }

  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener("abort", abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = setTimeout(() => controller.abort(), SANCTIONS_TIMEOUT_MS)
  try {
    if (controller.signal.aborted) throw new Error("Screening cancelled")
    const maxIndexAge = positiveSeconds(
      process.env.NEXT_PUBLIC_SANCTIONS_MAX_INDEX_AGE_SECONDS,
      15 * 60,
    )
    const maxListAge = positiveSeconds(
      process.env.NEXT_PUBLIC_SANCTIONS_MAX_LIST_AGE_SECONDS,
      10 * 86_400,
    )
    const response = await fetch(
      process.env.NEXT_PUBLIC_SANCTIONS_GRAPH_URL || DEFAULT_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { id: `${LIST}:${address}` },
        }),
        // Browser no-store also disables Chromium's CORS preflight cache.
        // Each check still sends a POST and validates the returned source ages.
        cache: "default",
        credentials: "omit",
        signal: controller.signal,
      },
    )
    if (!response.ok) throw new Error("Sanctions upstream HTTP error")
    const parsed = graphResponseSchema.parse(await response.json())
    if (parsed.errors?.length) throw new Error("Sanctions GraphQL error")
    const {
      _meta: meta,
      sanctionsList: list,
      sanctionedAccount: account,
    } = parsed.data
    const checkedAt = Date.now()
    const now = checkedAt / 1000
    if (
      meta.deployment !==
        (process.env.NEXT_PUBLIC_SANCTIONS_GRAPH_DEPLOYMENT || DEPLOYMENT) ||
      list.oracleAddress !== ORACLE ||
      list.implementation !== IMPLEMENTATION ||
      list.updateSequence < 1 ||
      list.knownAddressCount < list.activeCount ||
      list.lastUpdateBlock < START_BLOCK ||
      list.lastUpdateBlock > meta.block.number ||
      list.lastUpdateTimestamp > meta.block.timestamp ||
      meta.block.timestamp > now + 60 ||
      now - meta.block.timestamp > maxIndexAge ||
      now - list.lastUpdateTimestamp > maxListAge
    ) {
      throw new Error("Sanctions source identity or freshness check failed")
    }
    if (
      account &&
      (account.id !== `${LIST}:${address}` || account.address !== address)
    ) {
      throw new Error("Sanctions response belongs to another address")
    }
    // A missing account means absent only after validating the reviewed index.
    // Do not extend clearance past either upstream freshness deadline.
    const validUntil = Math.min(
      checkedAt + SANCTIONS_RESULT_TTL_MS,
      (meta.block.timestamp + maxIndexAge) * 1000,
      (list.lastUpdateTimestamp + maxListAge) * 1000,
    )
    return result(
      address,
      account?.isSanctioned ? "blocked" : "clear",
      checkedAt,
      validUntil,
    )
  } catch {
    // Errors (including partial GraphQL data) never imply a clear wallet.
    return result(address, "unavailable", Date.now())
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener("abort", abort)
  }
}
