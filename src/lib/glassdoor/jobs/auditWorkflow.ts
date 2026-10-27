/* eslint-disable no-await-in-loop, no-restricted-syntax */
import { prisma } from "@/lib/db"

import { auditMarket, pickAuditMarkets } from "../pipeline/audit"
import { compactScanRanges } from "../sources/prismaStores"

async function compactRanges() {
  "use step"

  const removed = await compactScanRanges(prisma)
  // eslint-disable-next-line no-console
  console.log(`[Glass Door audit] merged away ${removed} scan ranges`)
  return removed
}

async function pickMarkets() {
  "use step"

  return pickAuditMarkets(prisma)
}

async function auditOne(chainId: number, address: string) {
  "use step"

  const result = await auditMarket(prisma, chainId, address)
  // eslint-disable-next-line no-console
  console.log(`[Glass Door audit] ${JSON.stringify(result)}`)
  return result
}

/**
 * Compacts earlier days' scan ranges, then audits one market per step, so a
 * large market cannot exhaust a shared budget.
 */
export async function glassDoorAuditWorkflow() {
  "use workflow"

  await compactRanges()
  const results = []
  for (const market of await pickMarkets()) {
    results.push(await auditOne(market.chainId, market.address))
  }
  return results
}
