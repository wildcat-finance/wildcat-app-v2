import type { PrismaClient } from "@prisma/client"

import { prisma } from "../../db"

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

export async function reserveProviderSlot(
  database: PrismaClient,
  key: string,
  intervalMs: number,
) {
  const now = new Date()
  const [slot] = await database.$queryRaw<{ scheduledAt: Date }[]>`
    INSERT INTO "ExportProviderThrottle" ("key", "nextRequestAt")
    VALUES (${key}, ${new Date(now.getTime() + intervalMs)})
    ON CONFLICT ("key") DO UPDATE
    SET "nextRequestAt" =
      GREATEST(${now}, "ExportProviderThrottle"."nextRequestAt")
      + ${intervalMs} * INTERVAL '1 millisecond'
    RETURNING
      "nextRequestAt" - ${intervalMs} * INTERVAL '1 millisecond'
        AS "scheduledAt"
  `
  return slot.scheduledAt
}

export async function waitForProviderSlot(key: string, intervalMs: number) {
  if (process.env.NODE_ENV === "test") return

  const scheduledAt = await reserveProviderSlot(prisma, key, intervalMs)
  const waitMs = scheduledAt.getTime() - Date.now()
  if (waitMs > 0) await sleep(waitMs)
}
