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

export type CuratedVault = {
  name: string | null
  share: number
  curators: string[]
  addresses: string[]
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

const isBorrowerVault = (borrower: BorrowerIdentity, vault: CuratedVault) =>
  vault.addresses.includes(borrower.address) ||
  (!!borrower.displayName &&
    vault.curators.some((curator) => {
      const curatorWords = new Set(words(curator))
      return borrower.nameWords.some((word) => curatorWords.has(word))
    }))

export const resolveAffiliation = ({
  borrower,
  vaults,
}: {
  borrower: BorrowerIdentity | undefined
  vaults: CuratedVault[]
}): DestinationAffiliation => {
  if (!borrower) return { kind: "not_reviewed" }

  const share = vaults.reduce(
    (sum, vault) =>
      isBorrowerVault(borrower, vault) ? sum + vault.share : sum,
    0,
  )

  if (share < MIN_AFFILIATED_SHARE) return { kind: "not_reviewed" }
  return {
    kind: "affiliated",
    entityName: borrower.displayName ?? trimAddress(borrower.address),
  }
}
