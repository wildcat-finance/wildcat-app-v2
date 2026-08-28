/**
 * i18n invariant checker. The gate that makes the locales refactor verifiable
 * instead of vibes-based.
 *
 *   npm run i18n:check                    # the gate; any violation is fatal
 *   npm run i18n:check -- --staged        # read the Git index, for pre-commit
 *   npm run i18n:check -- --json          # scripts/i18n/check-report.json
 *   npm run i18n:check -- --write-baseline
 *
 * The refactor landed, so every rule is now enforced at zero and the ratcheting
 * baseline is gone. --write-baseline and the baseline comparison are kept for the
 * next multi-commit refactor that needs to land over a red-for-a-week period:
 * write a baseline, drop --strict, and the run fails only when a count goes UP.
 * Delete the file again when the counts are back to zero.
 *
 * Rules -- all fatal except duplicateValue and staleHomonym
 *   missingKey     ERROR  a key referenced in code that en.json does not define
 *   dynamicKey     ERROR  a key built by interpolation or concatenation
 *   defaultValue   ERROR  t("key", "fallback") -- masks a missing key
 *   legacySection  ERROR  top-level section outside the documented convention
 *   attrLiteral    ERROR  user-visible JSX attribute holding a hardcoded string
 *   depth          ERROR  key deeper than MAX_DEPTH
 *   duplicateValue WARN   the same English wording under more than one key,
 *                         unless its exact key set is declared below. Useful for
 *                         spotting reusable atoms, but not proof that keys share
 *                         translation context.
 *   orphanKey      ERROR  an en.json key no call site references
 *   staleHomonym   WARN   a KNOWN_DUPLICATES entry that stopped duplicating, or
 *                         lost one of its declared keys -- prune or update it
 *
 * A false positive on attrLiteral is fixed by widening NON_TRANSLATABLE or
 * SKIP_UI_RE in this file, with a comment saying why. Do not silence the rule.
 *
 * On attrLiteral: eslint-plugin-i18next's no-literal-string inspects JSX *text*
 * only in v6 (`markupOnly` is inert), so it never sees `placeholder="Enter amount"`.
 * The convention covers attributes explicitly, so that half lives here. The two
 * tools split the work; neither is redundant.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..", "..")
const localePath = "src/locales/en/en.json"
const baselineFile = path.join(__dirname, "i18n-baseline.json")
const reportFile = path.join(__dirname, "check-report.json")

const strict = process.argv.includes("--strict")
const staged = process.argv.includes("--staged")
const writeBaseline = process.argv.includes("--write-baseline")
const asJson = process.argv.includes("--json")

/** Sections docs/i18n-conventions.md allows at the top level. */
const ALLOWED_TOP_LEVEL = new Set([
  "common", "nav", "header", "footer", "auth", "validation", "notifications",
  "agreement", "modals", "marketList", "marketDetails", "marketParameters",
  "borrower", "lender", "admin", "profile",
])

/**
 * 6, not 5. `marketDetails.<role>.` spends two segments on placement before any
 * content and `borrower.profile.view.` spends three, so a 5-segment ceiling is
 * unreachable for role-scoped keys without inventing meaningless names. 7 is
 * still a smell -- that is a redundant grouping level.
 */
const MAX_DEPTH = 6

/**
 * Wording that appears under more than one key ON PURPOSE, normalised the way the
 * duplicateValue rule normalises (trimmed, lowercased).
 *
 * Each entry declares the EXACT key set that is allowed to carry the wording. That
 * matters: keying the allowlist on the value alone let one sanctioned wording
 * authorise an unlimited number of new duplicate keys anywhere outside common.*.
 * With the key set spelled out, a new key holding allowlisted wording still fails.
 *
 * kind "homonym"  two surfaces that happen to spell the same thing in English and
 *                 must stay free to diverge without a translator splitting a key.
 * kind "casing"   the SAME wording in two capitalisations, inherited from before
 *                 the refactor. Not a homonym and not sanctioned copy -- it is a
 *                 real inconsistency parked here so the rule can see it. Resolving
 *                 one means changing what a user reads, so it needs a copy
 *                 decision; collapsing the keys is the easy half.
 *
 * The duplicate check is advisory because equal English strings can require
 * different grammatical or product context in another locale. An entry here only
 * suppresses known noise; it is not required to make the gate pass.
 */
const KNOWN_DUPLICATES = new Map([
  [
    "active markets",
    {
      kind: "casing",
      reason:
        "'Active markets' vs 'Active Markets' -- inherited from before the refactor; needs a copy decision, not a key decision",
      keys: [
      "borrower.profile.view.activeMarkets.title",
      "common.fields.activeMarkets",
      "common.labels.activeMarkets",
      ],
    },
  ],
  [
    "borrower name",
    {
      kind: "casing",
      reason:
        "'Borrower name' vs 'Borrower Name' -- inherited; needs a copy decision",
      keys: [
      "common.labels.borrowerName",
      "marketList.borrower.table.header.borrowerName",
      ],
    },
  ],
  [
    "cancel invitation",
    {
      kind: "homonym",
      reason:
        "modal title vs the button that confirms it",
      keys: [
      "admin.invites.cancelModal.confirm",
      "admin.invites.cancelModal.title",
      ],
    },
  ],
  [
    "connect wallet",
    {
      kind: "homonym",
      reason:
        "the common atom, the header button and the dialog title it opens",
      keys: [
      "common.labels.connectWallet",
      "header.button.connectWallet",
      "header.modal.title",
      ],
    },
  ],
  [
    "deposit",
    {
      kind: "homonym",
      reason:
        "the common atom, the modal title, the market page button and the market-list row action",
      keys: [
      "common.labels.deposit",
      "marketDetails.lender.modals.deposit.title",
      "marketDetails.lender.transactions.deposit.button",
      "marketList.shared.tables.other.depositBTN",
      ],
    },
  ],
  [
    "edit borrower profile",
    {
      kind: "homonym",
      reason:
        "a borrower editing their own profile vs an admin editing someone else's record",
      keys: [
      "admin.editBorrower.title",
      "nav.editBorrowerProfile",
      ],
    },
  ],
  [
    "fixed term",
    {
      kind: "homonym",
      reason:
        "withdraw buttonLocked vs marketTerm enum vs marketTypeChip enum",
      keys: [
      "marketDetails.lender.transactions.withdraw.buttonLocked",
      "marketParameters.marketTerm.FixedTerm.text",
      "marketParameters.marketTypeChip.FixedTerm",
      ],
    },
  ],
  [
    "for",
    {
      kind: "homonym",
      reason:
        "a sentence fragment used by two different assemblies",
      keys: [
      "borrower.editLenders.for",
      "borrower.editPolicy.for",
      ],
    },
  ],
  [
    "lender profile",
    {
      kind: "homonym",
      reason:
        "sidebar nav label vs the profile page heading",
      keys: [
      "nav.lenderProfile",
      "profile.lender.lenderProfile",
      ],
    },
  ],
  [
    "market history",
    {
      kind: "casing",
      reason:
        "'Market history' vs 'Market History' -- inherited; needs a copy decision",
      keys: [
      "common.labels.marketHistory",
      "marketDetails.shared.sidebar.marketHistory",
      ],
    },
  ],
  [
    "markets",
    {
      kind: "homonym",
      reason:
        "a profile stat label, a filter placeholder and the market-list page title",
      keys: [
      "borrower.profile.view.overallInfo.markets",
      "common.placeholders.markets",
      "marketList.shared.title",
      ],
    },
  ],
  [
    "minimum deposit",
    {
      kind: "casing",
      reason:
        "'Minimum deposit' vs 'Minimum Deposit' -- inherited; needs a copy decision",
      keys: [
      "common.fields.minimumDeposit",
      "common.labels.minimumDeposit",
      ],
    },
  ],
  [
    "no",
    {
      kind: "homonym",
      reason:
        "the yes/no atom vs two noMarkets.filter.beginning sentence fragments",
      keys: [
      "common.yesNo.no",
      "marketList.borrower.noMarkets.filter.beginning",
      "marketList.shared.noMarkets.filter.beginning",
      ],
    },
  ],
  [
    "notifications",
    {
      kind: "homonym",
      reason:
        "header menu label vs the history page title",
      keys: [
      "header.notifications.notifications",
      "notifications.history.title",
      ],
    },
  ],
  [
    "open",
    {
      kind: "homonym",
      reason:
        "the market-term filter value (sibling of marketList.shared.fixed) vs the periodic window-status value (sibling of scheduled/closed) -- two enums in different domains",
      keys: [
      "marketList.shared.open",
      "marketParameters.periodicTerm.windowStatus.open.text",
      ],
    },
  ],
  [
    "open term",
    {
      kind: "homonym",
      reason:
        "marketTerm enum vs marketTypeChip enum",
      keys: [
      "marketParameters.marketTerm.OpenTerm.text",
      "marketParameters.marketTypeChip.OpenTerm",
      ],
    },
  ],
  [
    "open withdrawals",
    {
      kind: "homonym",
      reason:
        "the withdrawalAccess parameter value vs the section heading",
      keys: [
      "marketDetails.shared.withdrawalRequests.openWithdrawals",
      "marketParameters.withdrawalAccess.open.text",
      ],
    },
  ],
  [
    "periodic term",
    {
      kind: "homonym",
      reason:
        "marketTerm enum vs marketTypeChip enum",
      keys: [
      "marketParameters.marketTerm.PeriodicTerm.text",
      "marketParameters.marketTypeChip.PeriodicTerm",
      ],
    },
  ],
  [
    "unknown term",
    {
      kind: "homonym",
      reason:
        "marketTypeChip enum vs policyType enum",
      keys: [
      "marketParameters.marketTypeChip.Unknown",
      "marketParameters.policyType.Unknown",
      ],
    },
  ],
  [
    "withdraw",
    {
      kind: "homonym",
      reason:
        "the common atom, the modal title and the page button",
      keys: [
      "common.buttons.withdraw",
      "marketDetails.lender.modals.withdraw.title",
      "marketDetails.lender.transactions.withdraw.button",
      ],
    },
  ],
  [
    "withdrawal cycle",
    {
      kind: "casing",
      reason:
        "'Withdrawal Cycle' as a market-list filter placeholder vs 'Withdrawal cycle' as the market-page detail row -- inherited; needs a copy decision",
      keys: [
      "common.placeholders.withdrawalCycle",
      "marketDetails.lender.transactions.withdraw.rows.cycle",
      ],
    },
  ],
  [
    "wrapper contract",
    {
      kind: "casing",
      reason:
        "'Wrapper contract' vs 'Wrapper Contract' -- inherited; needs a copy decision",
      keys: [
      "borrower.createMarket.wrapper.title",
      "common.fields.wrapperContract",
      ],
    },
  ],
])

const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"]
const CONTEXT_SUFFIX_RE = /_(male|female)$/

/**
 * Files exempt from the hardcoded-string rules. Mirrors the eslint override list
 * so the two tools cannot disagree about what counts as UI code. NOTE: this is
 * deliberately NOT applied to key resolution -- a hook or util can hold a key in
 * a constant, and skipping those files hides real missing keys.
 */
const SKIP_UI_RE =
  /^src\/(lib|store|providers|utils|hooks|theme)\/|^src\/app\/api\/|agreement\/components\/AgreementText\//

const STATIC_KEY_RE = /(\bt\(\s*|i18nKey=\s*)(["'])([A-Za-z0-9_.\-]+)\2/g
/**
 * Only genuine key CONSTRUCTION is a violation: an interpolated template literal
 * or string concatenation. `t(cond ? "a.b" : "c.d")` is fine -- both keys are
 * statically visible, which is all the convention requires.
 */
const DYNAMIC_KEY_RE =
  /\bt\(\s*(?:`[^`]*\$\{[^`]*`|["'][A-Za-z0-9_.\-]*["']\s*\+|[A-Za-z_$][\w$.]*\s*\+\s*["'])/g
/** Static prefix of an interpolated key: t(`policyType.${x}`) -> "policyType." */
const DYNAMIC_PREFIX_RE = /\bt\(\s*`([A-Za-z0-9_.\-]*?)\$\{/g
const DEFAULT_VALUE_RE = /\bt\(\s*(["'])[A-Za-z0-9_.\-]+\1\s*,\s*(["'])/g
/** Any key-shaped literal, wherever it appears -- keys get parked in variables. */
const ANY_KEY_LITERAL_RE = /(["'])([A-Za-z][A-Za-z0-9_\-]*(?:\.[A-Za-z0-9_\-]+)+)\1/g
/** A dotted literal that is a filename or a host, not an i18n key. */
const FILENAME_LIKE_RE =
  /\.(json|ts|tsx|js|jsx|mjs|cjs|css|scss|svg|png|jpg|jpeg|webp|gif|md|pdf|txt|html|ya?ml|finance|com|org|io|xyz|dev|app)$/i

const USER_VISIBLE_ATTRS = [
  "label", "placeholder", "title", "helperText", "alt", "aria-label",
  "headerName", "tooltip", "tooltipText", "subtitle", "buttonText",
  "emptyText", "errorText", "description", "heading", "caption",
]
const ATTR_LITERAL_RE = new RegExp(
  `\\b(${USER_VISIBLE_ATTRS.join("|")})=(["'])([^"']{2,})\\2`,
  "g",
)
/** Not prose: enum-ish single tokens, key/path shapes, format strings. */
const NON_PROSE_RE = /^(?:[a-z0-9_-]+|[A-Za-z0-9_.\-]*\.[A-Za-z0-9_.\-]+|[#/{$].*|%s|\d+)$/
/**
 * Deliberately never translated -- file-format acronyms and network proper nouns
 * read identically in every locale. Keeping this list makes the count mean
 * "strings that ought to be keys", not "strings already ruled out".
 */
const NON_TRANSLATABLE = new Set([
  "CSV", "PDF", "PNG", "SVG", "JSON", "XLSX", "Ethereum", "Plasma", "True", "False",
])

function git(args) {
  return execFileSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
}

function readRepoFile(file) {
  const relative = path.isAbsolute(file) ? path.relative(rootDir, file) : file
  return staged
    ? git(["show", `:${relative}`])
    : fs.readFileSync(path.join(rootDir, relative), "utf8")
}

function repoFileExists(file) {
  const relative = path.isAbsolute(file) ? path.relative(rootDir, file) : file
  if (!staged) return fs.existsSync(path.join(rootDir, relative))

  try {
    git(["cat-file", "-e", `:${relative}`])
    return true
  } catch {
    return false
  }
}

/**
 * Blank out comments, preserving byte offsets so reported line numbers stay
 * accurate. Commented-out JSX is common here, and a `t("…")` inside `{/* … *​/}`
 * is not a live call site. String and template state is tracked so "https://x"
 * and `${a}//b` are not mistaken for comments.
 */
function blankComments(src) {
  const out = src.split("")
  let i = 0
  let state = 0 // 0 code, 1 line, 2 block, 3 '…', 4 "…", 5 `…`
  const tpl = []
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (state === 0) {
      if (c === "/" && n === "/") { state = 1; out[i] = out[i + 1] = " "; i += 2; continue }
      if (c === "/" && n === "*") { state = 2; out[i] = out[i + 1] = " "; i += 2; continue }
      if (c === "'") state = 3
      else if (c === '"') state = 4
      else if (c === "`") state = 5
      else if (c === "}" && tpl.length) { tpl.pop(); state = 5 }
      i += 1
      continue
    }
    if (state === 1) { if (c === "\n") state = 0; else out[i] = " "; i += 1; continue }
    if (state === 2) {
      if (c === "*" && n === "/") { out[i] = out[i + 1] = " "; state = 0; i += 2; continue }
      if (c !== "\n") out[i] = " "
      i += 1
      continue
    }
    if (c === "\\") { i += 2; continue }
    if (state === 3 && c === "'") state = 0
    else if (state === 4 && c === '"') state = 0
    else if (state === 5) {
      if (c === "`") state = 0
      else if (c === "$" && n === "{") { tpl.push(1); state = 0; i += 2; continue }
    }
    i += 1
  }
  return out.join("")
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out)
    else out[p] = v
  }
  return out
}

/** Strip a CLDR plural or gender-context suffix to get the key authors write. */
function canonicalKey(key) {
  const base = key.replace(CONTEXT_SUFFIX_RE, "")
  for (const s of PLURAL_SUFFIXES) {
    if (base.endsWith(`_${s}`)) return base.slice(0, -(s.length + 1))
  }
  return base
}

const locale = flatten(JSON.parse(readRepoFile(localePath)))
const localeKeys = new Set(Object.keys(locale))
/**
 * i18next resolves t("a.b.count", { count }) against a.b.count_one / _other, so a
 * base key whose only definitions are suffixed is NOT missing.
 */
const resolvableKeys = new Set([...localeKeys].map(canonicalKey))
const localeTopLevel = new Set([...localeKeys].map((k) => k.split(".")[0]))

/**
 * Two file lists on purpose. Key resolution covers ALL source; the
 * hardcoded-string rules follow the eslint override list.
 */
// `-z` and a NUL split, never a newline split: git QUOTES paths containing
// non-ASCII bytes (this repo has 7, e.g. a directory spelled with a Cyrillic
// "\u0441omponents"). A quoted path fails to open, and a silent `continue` then
// hides every key and every hardcoded string in those files.
const allSourceFiles = git(
  staged
    ? ["ls-files", "-z", "--cached", "src"]
    : [
        "ls-files",
        "-z",
        "--cached",
        "--others",
        "--exclude-standard",
        "src",
      ],
)
  .split("\0")
  .filter((f) => /\.(tsx?|jsx?)$/.test(f))
  .filter((f) => !/(\.test\.[tj]sx?|\.stories\.[tj]sx?|\.d\.ts)$/.test(f))
const uiFiles = new Set(allSourceFiles.filter((f) => !SKIP_UI_RE.test(f)))

const violations = {
  missingKey: [], dynamicKey: [], defaultValue: [], legacySection: [],
  attrLiteral: [], depth: [], duplicateValue: [], orphanKey: [],
  staleHomonym: [],
}

const unreadable = []
const usedKeys = new Set()
const referencedLiterals = new Set()
const dynamicPrefixes = new Set()

for (const file of allSourceFiles) {
  let source
  try {
    source = readRepoFile(file)
  } catch (e) {
    // Never swallow this: an unreadable path means the file is not scanned, and a
    // silent skip understates every count.
    console.error(`check-i18n: cannot read ${file} (${e.code}) -- NOT SCANNED`)
    unreadable.push(file)
    continue
  }
  const text = blankComments(source)
  const lineAt = (index) => text.slice(0, index).split("\n").length

  for (const m of text.matchAll(STATIC_KEY_RE)) usedKeys.add(m[3])

  /**
   * Validate EVERY key-shaped literal, not only those written inside t(...).
   * This codebase parks keys in variables:
   *     const noticeKey = elapsed ? "a.b.c" : "a.b.d"; t(noticeKey)
   * Checking only t("literal") misses those, so a rename leaves them dangling
   * while the check still passes.
   */
  const usesI18n =
    /useTranslation|\bt\(|i18nKey|getFixedT/.test(text) || /i18n/i.test(file)
  for (const m of text.matchAll(ANY_KEY_LITERAL_RE)) {
    const key = m[2]
    referencedLiterals.add(key) // permissive on purpose: safer for orphan detection
    if (!usesI18n || FILENAME_LIKE_RE.test(key)) continue
    /**
     * A literal claims to be a key when its section exists, or when it has 3+
     * segments. The second clause is the important one: a key pointing at a
     * section the refactor REMOVED would otherwise be waved through precisely
     * because its section is gone.
     */
    if (!(localeTopLevel.has(key.split(".")[0]) || key.split(".").length >= 3)) continue
    usedKeys.add(key)
    if (!resolvableKeys.has(key) && !localeKeys.has(key)) {
      violations.missingKey.push({ file, line: lineAt(m.index), key })
    }
  }

  for (const m of text.matchAll(DYNAMIC_PREFIX_RE)) if (m[1]) dynamicPrefixes.add(m[1])
  for (const m of text.matchAll(DYNAMIC_KEY_RE)) {
    violations.dynamicKey.push({
      file, line: lineAt(m.index), snippet: m[0].replace(/\s+/g, " ").trim(),
    })
  }
  for (const m of text.matchAll(DEFAULT_VALUE_RE)) {
    violations.defaultValue.push({ file, line: lineAt(m.index), snippet: m[0].trim() })
  }

  if (!uiFiles.has(file)) continue
  for (const m of text.matchAll(ATTR_LITERAL_RE)) {
    const [, attr, , value] = m
    if (NON_PROSE_RE.test(value) || NON_TRANSLATABLE.has(value.trim())) continue
    violations.attrLiteral.push({ file, line: lineAt(m.index), attr, value })
  }
}

if (unreadable.length) {
  console.error(
    `\n${unreadable.length} file(s) could not be read, so their keys are invisible. ` +
      "Refusing to report counts that are known to be wrong.",
  )
  // The exit code is set at the bottom, from `failed`. Setting process.exitCode
  // here instead would be silently overwritten by it, which is how this guard
  // sat inert: the message printed and the run still said PASS. Do NOT use
  // process.exit() either -- it races the --json report write and buffered stdout.
}

// ------------------------------------------------------------- locale shape
const seenLegacy = new Set()
for (const key of localeKeys) {
  const top = key.split(".")[0]
  if (!ALLOWED_TOP_LEVEL.has(top) && !seenLegacy.has(top)) {
    seenLegacy.add(top)
    violations.legacySection.push({ section: top, keys: 0 })
  }
  if (key.split(".").length > MAX_DEPTH) {
    violations.depth.push({ key, depth: key.split(".").length })
  }
}
for (const v of violations.legacySection) {
  v.keys = [...localeKeys].filter((k) => k.split(".")[0] === v.section).length
}
violations.legacySection.sort((a, b) => b.keys - a.keys)

/**
 * Atom rule: identical wording under more than one key should be one key.
 *
 * This scans EVERY key, common.* included. Skipping common.* on both sides -- the
 * earlier shape of this rule -- made it blind to two real cases: duplicates inside
 * common.* (which is how two "cancel2"-style codemod leftovers survived), and a
 * feature key restating a common.* atom instead of pointing at it.
 */
const byValue = new Map()
for (const [key, value] of Object.entries(locale)) {
  if (typeof value !== "string") continue
  const normalized = value.trim().toLowerCase()
  if (normalized.length < 2) continue
  if (!byValue.has(normalized)) byValue.set(normalized, [])
  byValue.get(normalized).push(key)
}
const seenDuplicates = new Set()
for (const [value, keys] of byValue) {
  if (keys.length < 2) continue
  const allowed = KNOWN_DUPLICATES.get(value)
  if (!allowed) {
    violations.duplicateValue.push({ value, keys: keys.sort() })
    continue
  }
  seenDuplicates.add(value)
  const expected = new Set(allowed.keys)
  const unexpected = keys.filter((k) => !expected.has(k)).sort()
  if (unexpected.length) {
    violations.duplicateValue.push({
      value,
      keys: keys.sort(),
      unexpected,
      note: `allowlisted as ${allowed.kind}, but these keys are not in its declared set`,
    })
  }
}
violations.duplicateValue.sort((a, b) => b.keys.length - a.keys.length)
for (const [value, allowed] of KNOWN_DUPLICATES) {
  const observed = byValue.get(value) ?? []
  if (observed.length < 2) {
    violations.staleHomonym.push({ value, kind: allowed.kind, reason: allowed.reason })
    continue
  }
  const gone = allowed.keys.filter((k) => !observed.includes(k))
  if (gone.length) {
    violations.staleHomonym.push({ value, kind: allowed.kind, gone, reason: allowed.reason })
  }
}

/**
 * Orphans: defined but never referenced. A key counts as used when it appears as
 * a literal anywhere in source, when its canonical (plural-stripped) form is
 * referenced, or when an interpolated call site can reach it by prefix.
 */
for (const key of localeKeys) {
  const canonical = canonicalKey(key)
  if (usedKeys.has(key) || usedKeys.has(canonical)) continue
  if (referencedLiterals.has(key) || referencedLiterals.has(canonical)) continue
  if ([...dynamicPrefixes].some((p) => key.startsWith(p))) continue
  violations.orphanKey.push({ key })
}
violations.orphanKey.sort((a, b) => a.key.localeCompare(b.key))

// ----------------------------------------------------------------- reporting
const SEVERITY = {
  missingKey: "error", dynamicKey: "error", defaultValue: "error",
  legacySection: "error", attrLiteral: "error", depth: "error",
  duplicateValue: "warn", orphanKey: "error", staleHomonym: "warn",
}
const counts = Object.fromEntries(
  Object.entries(violations).map(([k, v]) => [k, v.length]),
)

if (writeBaseline) {
  fs.writeFileSync(
    baselineFile,
    `${JSON.stringify({
      $comment:
        "GENERATED by scripts/i18n/check-i18n.mjs --write-baseline. Counts may only " +
        "go DOWN. When every count is 0, run with --strict and delete this file.",
      counts,
    }, null, 2)}\n`,
  )
  console.log(`wrote ${path.relative(rootDir, baselineFile)}`)
  console.log(JSON.stringify(counts, null, 2))
  // Same reason as above: a baseline written from incomplete counts is worse
  // than no baseline, because every later run ratchets against it.
  process.exitCode = unreadable.length ? 1 : 0
} else {
  if (asJson) {
    // A file, not stdout: the payload is large enough that piping it races
    // process exit and truncates.
    fs.writeFileSync(reportFile, `${JSON.stringify({ counts, violations }, null, 2)}\n`)
    console.log(`wrote ${path.relative(rootDir, reportFile)}`)
  }

  let baseline = null
  if (!strict && repoFileExists(baselineFile)) {
    baseline = JSON.parse(readRepoFile(baselineFile)).counts
  }

  // An unreadable file makes every count a lower bound, so the run cannot pass.
  let failed = unreadable.length > 0
  const lines = []
  for (const [rule, items] of Object.entries(violations)) {
    const severity = SEVERITY[rule]
    const count = items.length
    const allowed = baseline?.[rule]

    let verdict
    if (strict) verdict = count === 0 ? "ok" : severity
    else if (allowed === undefined) verdict = count === 0 ? "ok" : severity
    else if (count > allowed) verdict = "regression"
    else if (count < allowed) verdict = "improved"
    else verdict = count === 0 ? "ok" : "held"

    if (verdict === "error" || verdict === "regression") failed = true

    const budget = allowed === undefined ? "" : ` (baseline ${allowed})`
    lines.push(`${verdict.toUpperCase().padEnd(11)} ${rule.padEnd(15)} ${count}${budget}`)

    const show = verdict === "error" || verdict === "regression" || severity === "error"
    if (!asJson && count && show) {
      for (const item of items.slice(0, 15)) {
        if (item.attr) lines.push(`              ${item.file}:${item.line}  ${item.attr}="${item.value}"`)
        else if (item.file) lines.push(`              ${item.file}:${item.line}  ${item.key ?? item.snippet}`)
        else if (item.section) lines.push(`              section "${item.section}" -- ${item.keys} keys`)
        else lines.push(`              ${JSON.stringify(item)}`)
      }
      if (count > 15) lines.push(`              ... and ${count - 15} more`)
    }
  }

  if (!asJson) {
    console.log(`i18n check ${strict ? "(strict)" : baseline ? "(vs baseline)" : "(no baseline)"}\n`)
    console.log(lines.join("\n"))
    console.log(failed ? "\nFAIL -- see docs/i18n-conventions.md for how to place a key." : "\nPASS")
  }

  // exitCode, not exit(): buffered stdout must flush first.
  process.exitCode = failed ? 1 : 0
}
