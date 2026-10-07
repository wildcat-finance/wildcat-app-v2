import type { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { findBorrowerNames } from "@/lib/db"
import { trimAddress } from "@/utils/formatters"

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

/** A party that controls part of a venue: a curator, owner, operator or maker. */
export type Counterparty = {
  names: string[]
  /** Lowercase */
  addresses: string[]
  /** Share of the venue the party controls, 0..1 */
  weight: number
}

export type BorrowerIdentity = {
  address: string
  displayName: string | undefined
  nameWords: string[]
}

export const loadBorrowerIdentities = async (
  chainId: SupportedChainId,
  addresses: string[],
): Promise<Map<string, BorrowerIdentity>> => {
  const lowered = Array.from(new Set(addresses.map((a) => a.toLowerCase())))
  const identities = new Map<string, BorrowerIdentity>()
  lowered.forEach((address) =>
    identities.set(address, { address, displayName: undefined, nameWords: [] }),
  )
  if (lowered.length === 0) return identities

  const rows = await findBorrowerNames(chainId)

  rows.forEach(({ address, name, alias }) => {
    if (!identities.has(address.toLowerCase())) return
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

const isBorrowerParty = (
  borrower: BorrowerIdentity,
  counterparty: Counterparty,
) =>
  counterparty.addresses.includes(borrower.address) ||
  (!!borrower.displayName &&
    counterparty.names.some((name) => {
      const nameWords = new Set(words(name))
      return borrower.nameWords.some((word) => nameWords.has(word))
    }))

export const resolveAffiliation = ({
  borrower,
  counterparties,
}: {
  borrower: BorrowerIdentity | undefined
  counterparties: Counterparty[]
}): DestinationAffiliation => {
  if (!borrower) return { kind: "not_reviewed" }

  const share = counterparties.reduce(
    (sum, counterparty) =>
      isBorrowerParty(borrower, counterparty) ? sum + counterparty.weight : sum,
    0,
  )

  if (share < MIN_AFFILIATED_SHARE) return { kind: "not_reviewed" }
  return {
    kind: "affiliated",
    entityName: borrower.displayName ?? trimAddress(borrower.address),
  }
}
