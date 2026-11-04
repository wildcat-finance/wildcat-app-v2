import type { PrismaClient } from "@prisma/client"

import { GLASS_DOOR_READ_CHAINS } from "@/lib/glassdoor/read"

// Temporary: the metric review page (product#917). Remove with the page.
// Every borrower with at least one market in the current publication, with
// those markets, for the page's two selectors.

export type ReviewMarket = {
  address: string
  name: string | null
  symbol: string | null
  /** Lifecycle status (M77). */
  status: string | null
  state: string
}

export type ReviewBorrower = {
  chainId: number
  address: string
  name: string | null
  /** The borrower record's state; null when it has none. */
  state: string | null
  markets: ReviewMarket[]
}

export type ReviewBorrowerList = {
  publication: { id: string; publishedAt: string | null } | null
  borrowers: ReviewBorrower[]
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null

/** Open markets first, then by symbol, so the first market is a live one. */
export const marketOrder = (left: ReviewMarket, right: ReviewMarket) =>
  Number(left.status === "Closed") - Number(right.status === "Closed") ||
  (left.symbol ?? `~${left.address}`).localeCompare(
    right.symbol ?? `~${right.address}`,
  ) ||
  left.address.localeCompare(right.address)

export async function listReviewBorrowers(
  database: PrismaClient,
): Promise<ReviewBorrowerList> {
  // The same publication the read API serves (read.ts currentPublication).
  const publication = await database.glassDoorPublication.findFirst({
    where: { status: "Current" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, publishedAt: true },
  })
  if (!publication) return { publication: null, borrowers: [] }
  const chains = { in: GLASS_DOOR_READ_CHAINS }
  const [markets, records, names] = await Promise.all([
    database.glassDoorMetricSnapshot.findMany({
      where: {
        publicationId: publication.id,
        entityKind: "Market",
        chainId: chains,
      },
      select: { chainId: true, entityAddress: true, values: true, flags: true },
      orderBy: [{ chainId: "asc" }, { entityAddress: "asc" }],
    }),
    database.glassDoorMetricSnapshot.findMany({
      where: {
        publicationId: publication.id,
        entityKind: "Borrower",
        chainId: chains,
      },
      select: { chainId: true, entityAddress: true, flags: true },
    }),
    database.borrower.findMany({
      where: { chainId: chains },
      select: { chainId: true, address: true, name: true, alias: true },
    }),
  ])
  const key = (chainId: number, address: string) =>
    `${chainId}:${address.toLowerCase()}`
  const nameOf = new Map(
    names.map((row) => [
      key(row.chainId, row.address),
      text(row.alias) ?? text(row.name),
    ]),
  )
  const stateOf = new Map(
    records.map((row) => [
      key(row.chainId, row.entityAddress),
      text((row.flags as Record<string, unknown> | null)?.state) ?? "Ok",
    ]),
  )
  const borrowers = new Map<string, ReviewBorrower>()
  markets.forEach((row) => {
    const values = (row.values ?? {}) as Record<string, unknown>
    const flags = (row.flags ?? {}) as Record<string, unknown>
    const borrower = text(flags.borrower)?.toLowerCase()
    if (!borrower) return
    const id = key(row.chainId, borrower)
    const entry = borrowers.get(id) ?? {
      chainId: row.chainId,
      address: borrower,
      name: nameOf.get(id) ?? null,
      state: stateOf.get(id) ?? null,
      markets: [],
    }
    entry.markets.push({
      address: row.entityAddress,
      name: text(values.MARKET_NAME),
      symbol: text(values.M01),
      status: text(values.M77),
      state: text(flags.state) ?? "Ok",
    })
    borrowers.set(id, entry)
  })
  return {
    publication: {
      id: publication.id,
      publishedAt: publication.publishedAt?.toISOString() ?? null,
    },
    borrowers: [...borrowers.values()]
      .map((borrower) => ({
        ...borrower,
        markets: [...borrower.markets].sort(marketOrder),
      }))
      .sort(
        (left, right) =>
          left.chainId - right.chainId ||
          (left.name ?? `~${left.address}`).localeCompare(
            right.name ?? `~${right.address}`,
          ),
      ),
  }
}
