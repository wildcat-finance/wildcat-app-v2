import { prisma } from "@/lib/db"

import type { CuratedVault } from "./morpho"
import { MIN_AFFILIATED_SHARE } from "../constants"
import type { DestinationAffiliation } from "../types"

const GENERIC_WORDS = new Set([
  "the",
  "and",
  "ltd",
  "llc",
  "inc",
  "limited",
  "corp",
  "corporation",
  "company",
  "gmbh",
  "plc",
  "group",
  "holding",
  "holdings",
  "capital",
  "trading",
  "finance",
  "financial",
  "fund",
  "funds",
  "markets",
  "market",
  "partners",
  "ventures",
  "labs",
  "digital",
  "global",
  "asset",
  "assets",
  "management",
  "investments",
  "credit",
  "lending",
  "protocol",
  "foundation",
  "network",
  "solutions",
  "services",
  "technologies",
  "research",
  "vault",
  "vaults",
  "yield",
  "prime",
  "select",
])

const MIN_WORD_LENGTH = 4

const words = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

const significantWords = (value: string) =>
  words(value).filter(
    (word) => word.length >= MIN_WORD_LENGTH && !GENERIC_WORDS.has(word),
  )

export type BorrowerIdentity = {
  address: string
  displayName: string | undefined
  nameWords: string[]
}

export const loadBorrowerIdentities = async (
  chainId: number,
  addresses: string[],
): Promise<Map<string, BorrowerIdentity>> => {
  const lowered = Array.from(new Set(addresses.map((a) => a.toLowerCase())))
  const identities = new Map<string, BorrowerIdentity>()
  lowered.forEach((address) =>
    identities.set(address, { address, displayName: undefined, nameWords: [] }),
  )
  if (lowered.length === 0) return identities

  const rows = await prisma.borrower.findMany({
    where: { chainId, address: { in: lowered }, registeredOnChain: true },
    select: { address: true, name: true, alias: true },
  })

  rows.forEach(({ address, name, alias }) => {
    const nameWords = Array.from(
      new Set([
        ...significantWords(name ?? ""),
        ...significantWords(alias ?? ""),
      ]),
    )
    identities.set(address.toLowerCase(), {
      address: address.toLowerCase(),
      displayName: alias || name || undefined,
      nameWords,
    })
  })

  return identities
}

const trimAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`

const isBorrowerVault = (borrower: BorrowerIdentity, vault: CuratedVault) => {
  if (vault.addresses.includes(borrower.address)) return "address"
  if (borrower.displayName && borrower.nameWords.length > 0) {
    const named = vault.curators.some((curator) => {
      const curatorWords = new Set(words(curator))
      return borrower.nameWords.some((word) => curatorWords.has(word))
    })
    if (named) return "name"
  }
  return null
}

export const resolveAffiliation = ({
  borrower,
  vaults,
}: {
  borrower: BorrowerIdentity | undefined
  vaults: CuratedVault[]
}): DestinationAffiliation => {
  if (!borrower) return { kind: "not_reviewed" }

  let share = 0
  let basis: "address" | "name" = "name"
  vaults.forEach((vault) => {
    const match = isBorrowerVault(borrower, vault)
    if (!match) return
    share += vault.share
    if (match === "address") basis = "address"
  })

  if (share < MIN_AFFILIATED_SHARE) return { kind: "not_reviewed" }
  return {
    kind: "affiliated",
    basis,
    entityName: borrower.displayName ?? trimAddress(borrower.address),
  }
}
