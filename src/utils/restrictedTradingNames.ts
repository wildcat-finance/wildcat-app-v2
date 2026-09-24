/**
 * Restricted terms for borrower trading names and aliases.
 *
 * Purpose: flag a profile update for human review when the borrower's chosen
 * trading name implies a regulated activity, official status, or association
 * with a named third party. It does NOT reject anything and it is not a
 * compliance control in itself. A match means somebody looks; nothing more.
 *
 * Basis: the categories mirror the restricted-activity terms found in company
 * naming regimes, e.g. the UK's Company, Limited Liability Partnership and
 * Business Names (Sensitive Words and Expressions) Regulations 2014, which
 * gate words such as "bank" and "insurance" behind approval from the relevant
 * authority. Using a regulated-activity word without permission can itself be
 * an offence, which is precisely why it is worth a look at onboarding.
 *
 * Tune this against the jurisdictions you actually onboard from. It is a
 * starting point, not legal advice.
 */

// Matched as substrings, deliberately. A name like "GrowthBank" carries no word
// boundary before "Bank", and compound names are the whole problem here.
// Substring matching means false positives (embankment, Frankfurt); that is the
// correct trade-off, because a false positive costs one glance and a false
// negative costs what this list exists to prevent.
export const RESTRICTED_NAME_TERMS: Record<string, readonly string[]> = {
  // Deposit-taking and banking
  banking: ["bank", "banc", "banque", "bankers", "sparkasse", "bldgsoc"],

  // Insurance and reinsurance
  insurance: [
    "insurance",
    "insurer",
    "assurance",
    "reinsur",
    "underwriter",
    "takaful", // Sharia-compliant insurance; regulated in GCC markets
  ],

  // Investment, securities and fund management
  investment: [
    "securities",
    "brokerage",
    "broker-dealer",
    "asset management",
    "fund manager",
    "portfolio management",
    "wealth management",
    "investment fund",
    "mutual fund",
    "hedge fund",
  ],

  // Trust, custody and fiduciary
  fiduciary: ["trustee", "fiduciary", "custodian", "custody", "depositary"],

  // Payments and e-money
  payments: [
    "e-money",
    "emoney",
    "electronic money",
    "payment institution",
    "money transmitter",
    "remittance",
  ],

  // Credit and savings institutions
  credit: ["credit union", "building society", "savings and loan", "thrift"],

  // Market infrastructure
  infrastructure: ["clearing house", "clearinghouse", "central securities"],

  // Implied official or governmental status
  official: [
    "authority",
    "regulator",
    "commission",
    "central bank",
    "ombudsman",
    "ministry",
    "federal",
    "national",
    "royal",
    "sovereign",
  ],

  // Implied authorisation or endorsement
  endorsement: [
    "chartered",
    "licensed",
    "regulated",
    "authorised",
    "authorized",
    "accredited",
    "certified",
    "official",
    "guaranteed",
    "insured",
  ],
} as const

const ALL_TERMS: readonly string[] = Object.values(RESTRICTED_NAME_TERMS).flat()

/**
 * Lowercase, strip punctuation and collapse whitespace, so that "Growth-Bank",
 * "growth bank" and "GrowthBank" all normalise to the same thing.
 *
 * Deliberately does not attempt homoglyph or leetspeak folding. Someone
 * evading this on purpose will write "8ank" or use Cyrillic "а", and chasing
 * that is a different problem with a much worse false-positive profile. If
 * evasion becomes a live concern, normalise Unicode confusables here rather
 * than extending the term list.
 */
export const normaliseTradingName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Returns every restricted term present in the supplied value. Empty array
 * means nothing matched.
 *
 * Run this over the fields a borrower controls and that are displayed as
 * identity: alias / trading name first, and arguably `name` and `description`
 * too. A legal name containing a restricted term is not necessarily wrong, but
 * it is worth knowing about.
 */
export const findRestrictedTerms = (
  value: string | null | undefined,
): string[] => {
  if (!value) return []
  const haystack = normaliseTradingName(value)
  const collapsed = haystack.replace(/\s/g, "")
  return ALL_TERMS.filter(
    (term) =>
      haystack.includes(term) || collapsed.includes(term.replace(/[\s-]/g, "")),
  )
}

export const hasRestrictedTerm = (value: string | null | undefined): boolean =>
  findRestrictedTerms(value).length > 0

/**
 * Convenience for a whole update request. Returns a map of field name to the
 * terms matched, for fields that matched at all.
 */
export const findRestrictedTermsInFields = (
  fields: Record<string, string | null | undefined>,
): Record<string, string[]> =>
  Object.entries(fields).reduce<Record<string, string[]>>(
    (acc, [field, value]) => {
      const matches = findRestrictedTerms(value)
      if (matches.length) acc[field] = matches
      return acc
    },
    {},
  )
