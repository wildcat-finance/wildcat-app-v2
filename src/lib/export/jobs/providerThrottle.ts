import type { PrismaClient } from "@prisma/client"

import { prisma } from "../../db"

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const providerQueues = new Map<string, Promise<void>>()
const providerLeases = new Map<
  string,
  { expiresAt: number; nextRequestAt: number; remaining: number }
>()

export class ProviderThrottleError extends Error {
  constructor(error: unknown) {
    super(
      `Provider request scheduler failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    )
    this.name = "ProviderThrottleError"
  }
}

export async function reserveProviderSlots(
  database: PrismaClient,
  key: string,
  intervalMs: number,
  count: number,
) {
  const now = new Date()
  const durationMs = intervalMs * count
  const [slot] = await database.$queryRaw<{ scheduledAt: Date }[]>`
    INSERT INTO "ExportProviderThrottle" ("key", "nextRequestAt")
    VALUES (${key}, ${new Date(now.getTime() + durationMs)})
    ON CONFLICT ("key") DO UPDATE
    SET "nextRequestAt" =
      GREATEST(${now}, "ExportProviderThrottle"."nextRequestAt")
      + ${durationMs} * INTERVAL '1 millisecond'
    RETURNING
      "nextRequestAt" - ${durationMs} * INTERVAL '1 millisecond'
        AS "scheduledAt"
  `
  return slot.scheduledAt
}

export async function waitForProviderSlotWithClient(
  database: PrismaClient,
  key: string,
  intervalMs: number,
  leaseSize = 20,
) {
  const previous = providerQueues.get(key) ?? Promise.resolve()
  const turn = previous
    .catch(() => undefined)
    .then(async () => {
      let lease = providerLeases.get(key)
      const now = Date.now()
      if (
        !lease ||
        lease.remaining === 0 ||
        Math.max(lease.nextRequestAt, now) >= lease.expiresAt
      ) {
        let scheduledAt: Date
        try {
          scheduledAt = await reserveProviderSlots(
            database,
            key,
            intervalMs,
            leaseSize,
          )
        } catch (error) {
          throw new ProviderThrottleError(error)
        }
        lease = {
          expiresAt:
            intervalMs === 0
              ? Number.POSITIVE_INFINITY
              : scheduledAt.getTime() + intervalMs * leaseSize,
          nextRequestAt: scheduledAt.getTime(),
          remaining: leaseSize,
        }
      }
      const scheduledAt = Math.max(lease.nextRequestAt, Date.now())
      const waitMs = scheduledAt - Date.now()
      lease.nextRequestAt = scheduledAt + intervalMs
      lease.remaining -= 1
      providerLeases.set(key, lease)
      if (waitMs > 0) await sleep(waitMs)
    })
  providerQueues.set(key, turn)
  try {
    await turn
  } finally {
    if (providerQueues.get(key) === turn) providerQueues.delete(key)
  }
}

export async function waitForProviderSlot(
  key: string,
  intervalMs: number,
  leaseSize = 20,
) {
  if (process.env.NODE_ENV === "test") return

  await waitForProviderSlotWithClient(prisma, key, intervalMs, leaseSize)
}
