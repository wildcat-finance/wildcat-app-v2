import { prisma } from "../../db"

const PROVIDER_THROTTLE_LOCK = 8_510_853n
const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

export async function waitForProviderSlot(key: string, intervalMs: number) {
  if (process.env.NODE_ENV === "test") {
    return
  }

  const slot = await prisma.$transaction(async (database) => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(${PROVIDER_THROTTLE_LOCK})`
    const current = await database.exportProviderThrottle.findUnique({
      where: { key },
    })
    const now = Date.now()
    const scheduled = Math.max(now, current?.nextRequestAt.getTime() ?? 0)
    await database.exportProviderThrottle.upsert({
      where: { key },
      create: { key, nextRequestAt: new Date(scheduled + intervalMs) },
      update: { nextRequestAt: new Date(scheduled + intervalMs) },
    })
    return scheduled
  })
  if (slot > Date.now()) await sleep(slot - Date.now())
}
