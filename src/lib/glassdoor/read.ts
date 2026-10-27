import type { PrismaClient } from "@prisma/client"

// Read side of Glass Door: every response comes from the current publication
// only, so a page never mixes metric values from different blocks.

export const GLASS_DOOR_READ_CHAINS = [1, 9745]

/**
 * Per-market values on the borrower page (cheat sheet v4): the per-market
 * table, then the inputs of card 3.12 Trouble over time.
 */
export const PER_MARKET_TABLE = [
  "M18",
  "M32",
  "M30",
  "M21",
  "M85",
  "M07",
  "M11",
  "H02",
  "H08",
  "M26",
  "M05",
  "D17",
  // Context for those: asset, lifecycle, recorded life, incidents, worst.
  "M02",
  "M77",
  "H01",
  "M20",
  "M24",
]

type Cut = { block: number; hash: string; timestamp: number }

export const isAddress = (value: string) => /^0x[0-9a-f]{40}$/i.test(value)

/** Comparisons and protocol counts travel as their own fields. */
const splitFlags = (raw: unknown) => {
  const { comparisons, protocol, ...flags } = (raw ?? {}) as Record<
    string,
    unknown
  >
  return { flags, comparisons: comparisons ?? {}, protocol: protocol ?? null }
}

async function currentPublication(database: PrismaClient) {
  return database.glassDoorPublication.findFirst({
    where: { status: "Current" },
    orderBy: { publishedAt: "desc" },
  })
}

const publicationView = (
  publication: NonNullable<Awaited<ReturnType<typeof currentPublication>>>,
  chainId: number,
) => ({
  id: publication.id,
  kind: publication.kind,
  day: publication.day?.toISOString().slice(0, 10) ?? null,
  publishedAt: publication.publishedAt?.toISOString() ?? null,
  registryVersion: publication.registryVersion,
  cut: (publication.cuts as Record<string, Cut>)[String(chainId)] ?? null,
})

export type ReadResult =
  | { status: 200; publicationId: string; body: unknown }
  | { status: 404; body: { error: string; state?: string } }

export async function readMarket(
  database: PrismaClient,
  chainId: number,
  address: string,
): Promise<ReadResult> {
  const market = address.toLowerCase()
  const publication = await currentPublication(database)
  const row = publication
    ? await database.glassDoorMetricSnapshot.findUnique({
        where: {
          publicationId_entityKind_chainId_entityAddress: {
            publicationId: publication.id,
            entityKind: "Market",
            chainId,
            entityAddress: market,
          },
        },
      })
    : null
  if (!publication || !row) {
    const status = await database.glassDoorMarketStatus.findUnique({
      where: { chainId_address: { chainId, address: market } },
      select: { state: true },
    })
    return {
      status: 404,
      body: status
        ? { error: "Market history is being prepared", state: "Preparing" }
        : { error: "Unknown V2 market" },
    }
  }
  const { flags, comparisons, protocol } = splitFlags(row.flags)
  const values = row.values as Record<string, unknown>
  return {
    status: 200,
    publicationId: publication.id,
    body: {
      publication: publicationView(publication, chainId),
      // Name and symbol are both shown (M01 is the symbol).
      market: {
        chainId,
        address: market,
        name: values.MARKET_NAME || null,
        symbol: values.M01 ?? null,
      },
      state: flags.state ?? "Ok",
      reason: flags.reason ?? null,
      values: row.values,
      comparisons,
      protocol,
      flags,
    },
  }
}

export async function readBorrower(
  database: PrismaClient,
  chainId: number,
  address: string,
): Promise<ReadResult> {
  const borrower = address.toLowerCase()
  const publication = await currentPublication(database)
  if (!publication) {
    return {
      status: 404,
      body: { error: "Analytics are being prepared", state: "Preparing" },
    }
  }
  const [row, markets] = await Promise.all([
    database.glassDoorMetricSnapshot.findUnique({
      where: {
        publicationId_entityKind_chainId_entityAddress: {
          publicationId: publication.id,
          entityKind: "Borrower",
          chainId,
          entityAddress: borrower,
        },
      },
    }),
    database.glassDoorMetricSnapshot.findMany({
      where: {
        publicationId: publication.id,
        entityKind: "Market",
        chainId,
        flags: { path: ["borrower"], equals: borrower },
      },
      orderBy: { entityAddress: "asc" },
    }),
  ])
  if (!row) return { status: 404, body: { error: "Unknown borrower" } }
  const { flags, comparisons, protocol } = splitFlags(row.flags)
  return {
    status: 200,
    publicationId: publication.id,
    body: {
      publication: publicationView(publication, chainId),
      borrower: { chainId, address: borrower },
      state: flags.state ?? "Ok",
      reason: flags.reason ?? null,
      partial: Boolean(flags.partial),
      values: row.values,
      comparisons,
      protocol,
      flags,
      markets: markets.map((market) => {
        const values = market.values as Record<string, unknown>
        const marketFlags = (market.flags ?? {}) as Record<string, unknown>
        return {
          address: market.entityAddress,
          name: values.MARKET_NAME || null,
          symbol: values.M01 ?? null,
          state: marketFlags.state ?? "Ok",
          values: Object.fromEntries(
            PER_MARKET_TABLE.map((id) => [id, values[id] ?? null]),
          ),
        }
      }),
    },
  }
}
