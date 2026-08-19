/**
 * Assigns an i18n key to every string in hardcoded-inventory.json.
 *
 *   npm run i18n:propose
 *
 * ONE KEY PER DISTINCT STRING, never one per site. That is what makes the result
 * obey convention rule 4 by construction: a string used from two different
 * sections cannot receive two keys, it is promoted to `common.*` instead.
 *
 * Preference order per distinct string:
 *   1. it already exists in en.json  -> reuse that key (matched case-insensitively)
 *   2. a hand-picked override        -> use it
 *   3. it spans 2+ sections          -> common.<group>.<slug>
 *   4. otherwise                     -> <section>.<slug>
 *
 * Output: scripts/i18n/hardcoded-key-proposal.json -- REVIEW BEFORE APPLYING.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..", "..")
const invFile = path.join(__dirname, "hardcoded-inventory.json")
const localeFile = path.join(rootDir, "src/locales/en/en.json")
const outFile = path.join(__dirname, "hardcoded-key-proposal.json")

/** Longest prefix wins. Targets must land inside ALLOWED_TOP_LEVEL. */
const SECTION_RULES = [
  ["src/app/[locale]/lender/components/ExploreSection/", "marketList.lender.explore"],
  ["src/app/[locale]/lender/market/", "marketDetails.lender"],
  ["src/app/[locale]/lender/", "marketList.lender"],
  ["src/app/[locale]/borrower/market/", "marketDetails.borrower"],
  ["src/app/[locale]/borrower/create-market/", "borrower.createMarket"],
  ["src/app/[locale]/borrower/edit-policy/", "borrower.editPolicy"],
  ["src/app/[locale]/borrower/edit-lenders-list/", "borrower.editLenders"],
  ["src/app/[locale]/borrower/policy/", "borrower.policies"],
  ["src/app/[locale]/borrower/invitation/", "borrower.invitation"],
  ["src/app/[locale]/borrower/profile/", "borrower.profile"],
  ["src/app/[locale]/borrower/notifications/", "notifications"],
  ["src/app/[locale]/borrower/", "marketList.borrower"],
  ["src/app/[locale]/admin/", "admin"],
  ["src/app/[locale]/agreement/", "agreement"],
  ["src/app/[locale]/profile/", "profile"],
  ["src/components/Profile/LenderProfilePage/", "profile.lender"],
  ["src/components/Profile/ProfilePage/", "profile.borrower"],
  ["src/components/Profile/", "profile"],
  ["src/components/Header/", "header"],
  ["src/components/Footer/", "footer"],
  ["src/components/Sidebar/", "nav"],
  ["src/components/MarketParameters/", "marketParameters"],
  ["src/components/WrapDebtToken/", "marketDetails.lender.wrapDebtToken"],
  ["src/components/PaginatedMarketRecordsTable/", "marketDetails.shared.records"],
  ["src/components/ToUReacceptanceModal/", "agreement.reacceptance"],
  ["src/components/AdsBanners/", "marketDetails.shared.banners"],
  ["src/components/MarketHeader/", "marketDetails.shared.header"],
  ["src/components/MarketDetailSkeletons", "marketDetails.shared"],
  ["src/components/MarketCycleChip/", "marketDetails.shared"],
  ["src/components/PeriodicNoticeBanner/", "marketDetails.shared"],
  ["src/components/PendingAprReductionBanner/", "marketDetails.shared"],
  ["src/components/CookieBanner/", "common.consent"],
  ["src/components/HotjarConsent/", "common.consent"],
  ["src/components/WrongNetworkAlert/", "auth"],
  ["src/components/AuthWrapper/", "auth"],
  ["src/components/MobileConnectWallet/", "auth"],
  ["src/components/MobileSelectNetwork/", "auth"],
  ["src/components/Mobile/", "marketList.shared"],
  ["src/components/MarketsTableAccordion/", "marketList.shared"],
  ["src/components/MarketsFilterSelect/", "marketList.shared"],
  ["src/components/SmallFilterSelect/", "marketList.shared"],
  ["src/components/Toasts/", "notifications"],
  ["src/components/Notifications/", "notifications"],
  ["src/components/HelpModal/", "modals.shared.help"],
  ["src/components/TxModalComponents/", "modals.shared.tx"],
  ["src/components/DateRange/", "common.dateRange"],
  ["src/components/ECharts/", "marketDetails.shared.charts"],
]

const STOPWORDS = new Set([
  "a","an","the","of","to","for","in","on","at","by","and","or","is","are","be",
  "this","that","with","from","your","you",
])

const ENTITIES = {
  "&apos;": "’", "&quot;": '"', "&copy;": "©", "&amp;": "&",
  "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–",
}
const decodeEntities = (s) =>
  Object.entries(ENTITIES).reduce((acc, [k, v]) => acc.split(k).join(v), s)

/** Never keyed: decorative glyphs, proper nouns, format acronyms. */
const EXCLUDE_EXACT = new Map([
  ["⇤", "decorative glyph beside the download link"],
  ["Ethereum", "network proper noun"],
  ["Plasma", "network proper noun"],
  ["CSV", "file-format acronym"], ["PDF", "file-format acronym"],
  ["PNG", "file-format acronym"], ["SVG", "file-format acronym"],
  ["True", "parameter value, not prose"], ["False", "parameter value, not prose"],
])
const isNotProse = (t) => !/[A-Za-z]{2}/.test(t)

/** Hand-picked names where the generated slug reads badly. Date placeholders ARE
 *  keyed on purpose: date format is locale-sensitive. */
const OVERRIDES = new Map([
  ["01/02/1980", "common.placeholders.dateExample"],
  ["e.g. 25/12/2024", "common.placeholders.dateExampleHint"],
  ["e.g. 25/12/2024 14:30 UTC", "common.placeholders.dateTimeExampleHint"],
  ["NOT LOGGED IN", "auth.notLoggedIn"],
  ["Fire icon", "common.labels.fireIconAlt"],
  ["Admin Panel", "admin.title"],
  ["Pending Invitations", "admin.invites.pendingTitle"],
  ["Registered Borrowers", "admin.borrowers.registeredTitle"],
  ["Pending Registration", "admin.borrowers.pendingRegistration"],
  ["Privacy Policy", "common.links.privacyPolicy"],
  ["Cookies Settings", "common.buttons.cookiesSettings"],
  ["Close", "common.buttons.close"],
  ["Max", "common.buttons.max"],
  ["Prev", "common.buttons.prev"],
  ["Apply", "common.buttons.apply"],
  ["Discard", "common.buttons.discard"],
  ["Onboard", "common.buttons.onboard"],
  ["Details", "common.fields.details"],
  ["Currency", "common.fields.currency"],
  ["Supply", "common.fields.supply"],
  ["Filters", "common.labels.filters"],
  ["Active", "common.filters.active"],
  ["Healthy", "common.labels.healthy"],
  ["Copied", "common.states.copied"],
  ["Profile", "common.buttons.profile"],
  ["View Profile", "common.buttons.viewProfile"],
  ["Withdrawal Cycle", "common.placeholders.withdrawalCycle"],
])

/** Words that cannot end a self-contained UI string: the sentence continues in a
 *  sibling node. */
const CONNECTOR_END_RE =
  /\b(of|to|until|for|and|or|is|are|was|were|be|the|a|an|in|on|at|by|with|from|that|than|no|any|your|this|these|into|as)$/i

const sectionFor = (file) => {
  for (const [prefix, section] of SECTION_RULES) if (file.startsWith(prefix)) return section
  return "common.labels"
}

/** camelCase reduction of the wording -- readable and greppable, not a serial number. */
function slug(text) {
  const words = text
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  const meaningful = words.filter((w) => !STOPWORDS.has(w.toLowerCase()))
  const picked = (meaningful.length ? meaningful : words).slice(0, 5)
  if (!picked.length) return "label"
  let out = picked
    .map((w, i) => {
      const lower = w.toLowerCase()
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join("")
    .slice(0, 46)
  if (/^\d/.test(out)) out = `n${out}` // a key segment must not start with a digit
  return out
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out)
    else out[p] = v
  }
  return out
}
const normalize = (t) => t.replace(/\s+/g, " ").trim()

const inventory = JSON.parse(fs.readFileSync(invFile, "utf8"))
const locale = flatten(JSON.parse(fs.readFileSync(localeFile, "utf8")))

const fileLines = new Map()
const linesOf = (file) => {
  if (!fileLines.has(file)) {
    fileLines.set(file, fs.readFileSync(path.join(rootDir, file), "utf8").split("\n"))
  }
  return fileLines.get(file)
}

/**
 * A text node is a sentence FRAGMENT when it has a sibling AND does not read as a
 * self-contained unit. Having a sibling alone is not enough:
 * `<Button>Confirm{spinner}</Button>` is a complete label beside an icon. What marks
 * a real fragment is grammar -- it begins mid-sentence or ends on a connector.
 */
function isFragment(entry) {
  if (entry.kind !== "jsxText") return false
  const ls = linesOf(entry.file)
  const after = ls[entry.endLine - 1].slice(entry.endColumn - 1).trimStart()
  const before = ls[entry.line - 1].slice(0, entry.column - 1).trimEnd()
  const siblingAfter = (after.startsWith("<") && !after.startsWith("</")) || after.startsWith("{")
  const siblingBefore = before.endsWith("}") || /<\/[A-Za-z][\w.]*>$/.test(before)
  if (!siblingAfter && !siblingBefore) return false
  const text = normalize(entry.text)
  if (/^[a-z]/.test(text) || /^[.,;:!?)]/.test(text)) return true
  // A sentence that ends in terminal punctuation is self-contained whatever its
  // last word is: "All markets you have a position in." ends on "in", but it is a
  // complete sentence, not a fragment waiting for a sibling.
  if (/[.!?]$/.test(text)) return false
  return CONNECTOR_END_RE.test(text.replace(/[\s,;:]+$/, ""))
}

// Reuse is case-insensitive on purpose: `Search by Name` and `Search By Name` are
// the same string with a casing slip; the locale file's wording wins.
const existingByValue = new Map()
for (const [k, v] of Object.entries(locale)) {
  if (typeof v !== "string") continue
  const n = normalize(v).toLowerCase()
  if (!existingByValue.has(n)) existingByValue.set(n, k)
}

const groups = new Map()
const deferred = []
const excluded = []
for (const entry of inventory.entries) {
  const text = decodeEntities(normalize(entry.text))
  const enriched = { ...entry, text }
  if (isFragment(enriched)) {
    deferred.push({ ...enriched, reason: "sentence fragment: needs <Trans>" })
    continue
  }
  // An override is an explicit decision to key this string, so it outranks the
  // not-prose heuristic -- `01/02/1980` has no letters at all, yet date format is
  // locale-sensitive and must be translatable.
  if (!OVERRIDES.has(text)) {
    const reason = EXCLUDE_EXACT.get(text) ?? (isNotProse(text) ? "not prose" : null)
    if (reason) { excluded.push({ ...enriched, reason }); continue }
  }
  if (!groups.has(text)) groups.set(text, [])
  groups.get(text).push(enriched)
}

/** The JSX element a text node sits inside, found by scanning backwards. */
function elementAt(file, line, column) {
  const ls = linesOf(file)
  let head = ls[line - 1].slice(0, column - 1)
  for (let i = line - 1; i >= 0 && i > line - 40; i -= 1) {
    if (i < line - 1) head = ls[i]
    const found = [...head.matchAll(/<([A-Z][A-Za-z0-9.]*)/g)]
    if (found.length) return found[found.length - 1][1]
  }
  return ""
}

function commonGroupFor(sites) {
  const attrs = new Set(sites.filter((s) => s.kind === "attr").map((s) => s.attr))
  if (attrs.has("placeholder")) return "placeholders"
  if (attrs.has("alt") || attrs.has("aria-label")) return "labels"
  if (attrs.has("label") || attrs.has("headerName")) return "fields"
  // Text inside a Button or Link is an action, not a field label.
  const elements = new Set(
    sites.filter((s) => s.kind === "jsxText").map((s) => elementAt(s.file, s.line, s.column)),
  )
  if ([...elements].some((e) => /Button|Link/.test(e))) return "buttons"
  return "labels"
}

const taken = new Set(Object.keys(locale))
function uniqueKey(base) {
  if (!taken.has(base)) { taken.add(base); return base }
  for (let i = 2; i < 60; i += 1) {
    const c = `${base}${i}`
    if (!taken.has(c)) { taken.add(c); return c }
  }
  throw new Error(`no free key for ${base}`)
}

const proposal = []
const stats = { reuse: 0, override: 0, common: 0, scoped: 0 }
for (const [text, sites] of [...groups.entries()].sort()) {
  const existing = existingByValue.get(text.toLowerCase())
  /**
   * Reuse is only safe when it does not couple two sections. Pointing a `Cancel`
   * on a lender market page at `agreement.page.cancel` "reuses" a key, but it is
   * exactly the coupling rule 4 exists to prevent -- and it bypasses the
   * spans-2+-sections check below. When reuse would cross a section boundary the
   * string is promoted to `common.*` instead; the pre-existing duplicate is left
   * for the atom-collapsing pass to fold in.
   */
  const siteSections = new Set(sites.map((s) => sectionFor(s.file)))
  const reusable =
    existing &&
    (existing.startsWith("common.") ||
      [...siteSections].every((sec) => sec.split(".")[0] === existing.split(".")[0]))
  if (reusable) { proposal.push({ text, key: existing, origin: "reuse", sites }); stats.reuse += 1; continue }
  const crossSectionAtom = Boolean(existing)
  const override = OVERRIDES.get(text)
  if (override) { taken.add(override); proposal.push({ text, key: override, origin: "override", sites }); stats.override += 1; continue }
  const sections = siteSections
  let key, origin
  if (sections.size > 1 || crossSectionAtom) {
    key = uniqueKey(`common.${commonGroupFor(sites)}.${slug(text)}`); origin = "common"; stats.common += 1
  } else {
    key = uniqueKey(`${[...sections][0]}.${slug(text)}`); origin = "scoped"; stats.scoped += 1
  }
  proposal.push({ text, key, origin, sites })
}

const deep = proposal.filter((p) => p.key.split(".").length > 6)
const keyedSites = proposal.reduce((n, p) => n + p.sites.length, 0)

fs.writeFileSync(outFile, `${JSON.stringify({
  stats: {
    distinctStrings: proposal.length, keyedSites, totalSites: inventory.entries.length,
    ...stats, keysDeeperThan6: deep.length,
    deferredFragments: deferred.length, excluded: excluded.length,
  },
  proposal, deferred, excluded,
}, null, 2)}\n`)

console.log(`wrote ${path.relative(rootDir, outFile)}`)
console.log(`  distinct strings      : ${proposal.length}`)
console.log(`  sites to rewrite      : ${keyedSites} of ${inventory.entries.length}`)
console.log(`  reuse an existing key : ${stats.reuse}`)
console.log(`  hand-named override   : ${stats.override}`)
console.log(`  promoted to common.*  : ${stats.common}`)
console.log(`  section-scoped        : ${stats.scoped}`)
console.log(`  keys deeper than 6    : ${deep.length}`)
for (const d of deep) console.log(`      ${d.key}`)
console.log(`  DEFERRED (fragments)  : ${deferred.length}  -> need <Trans>, by hand`)
console.log(`  excluded (not prose)  : ${excluded.length}`)
