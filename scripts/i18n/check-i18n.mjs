/**
 * i18n invariant checker. The gate that makes the locales refactor verifiable
 * instead of vibes-based.
 *
 *   npm run i18n:check                    # the gate; any violation is fatal
 *   npm run i18n:check -- --json          # scripts/i18n/check-report.json
 *   npm run i18n:check -- --write-baseline
 *
 * The refactor landed, so every rule is now enforced at zero and the ratcheting
 * baseline is gone. --write-baseline and the baseline comparison are kept for the
 * next multi-commit refactor that needs to land over a red-for-a-week period:
 * write a baseline, drop --strict, and the run fails only when a count goes UP.
 * Delete the file again when the counts are back to zero.
 *
 * Rules -- all fatal except staleHomonym
 *   missingKey     ERROR  a key referenced in code that en.json does not define
 *   dynamicKey     ERROR  a key built by interpolation or concatenation
 *   defaultValue   ERROR  t("key", "fallback") -- masks a missing key
 *   legacySection  ERROR  top-level section outside the documented convention
 *   attrLiteral    ERROR  user-visible JSX attribute holding a hardcoded string
 *   depth          ERROR  key deeper than MAX_DEPTH
 *   duplicateValue ERROR  identical wording outside common.* that is NOT a
 *                         deliberate homonym listed in KNOWN_HOMONYMS below
 *   orphanKey      ERROR  an en.json key no call site references
 *   staleHomonym   WARN   a KNOWN_HOMONYMS entry that no longer duplicates --
 *                         someone collapsed it, so prune the list
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
const localeFile = path.join(rootDir, "src/locales/en/en.json")
const baselineFile = path.join(__dirname, "i18n-baseline.json")
const reportFile = path.join(__dirname, "check-report.json")

const strict = process.argv.includes("--strict")
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
 * Wording that is duplicated outside common.* ON PURPOSE, normalised the way the
 * duplicateValue rule normalises (trimmed, lowercased). Each entry is copy that
 * two surfaces happen to spell the same in English and that must stay free to
 * diverge without a translator having to split a key first. Anything NOT listed
 * here is a real duplicate and fails the build.
 *
 * Reasons live in docs/i18n-conventions.md under "Deliberate duplicates". Adding
 * an entry is a decision, not a workaround: if the two sites would always change
 * together, collapse them into common.* instead.
 */
const KNOWN_HOMONYMS = new Map([
  ["deposit", "modal title vs the market page button vs the market-list row action"],
  ["withdraw", "modal title vs the page button"],
  ["connect wallet", "header button vs the dialog title it opens"],
  ["cancel invitation", "modal title vs the button that confirms it"],
  ["notifications", "header menu label vs the history page title"],
  ["markets", "a profile stat label vs the market-list page title"],
  ["fixed term", "withdraw buttonLocked vs marketTerm enum vs marketTypeChip enum"],
  ["open term", "marketTerm enum vs marketTypeChip enum"],
  ["periodic term", "marketTerm enum vs marketTypeChip enum"],
  ["unknown term", "marketTypeChip enum vs policyType enum"],
  ["open withdrawals", "the withdrawalAccess parameter value vs the section heading"],
  ["no", "two noMarkets.filter.beginning sentence fragments, not the yes/no atom"],
  ["for", "a sentence fragment used by two different assemblies"],
  ["edit borrower profile", "a borrower editing their own profile vs an admin editing someone else's record"],
  ["lender profile", "sidebar nav label vs the profile page heading"],
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

const locale = flatten(JSON.parse(fs.readFileSync(localeFile, "utf8")))
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
const allSourceFiles = git([
  "ls-files", "-z", "--cached", "--others", "--exclude-standard", "src",
])
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
    source = fs.readFileSync(path.join(rootDir, file), "utf8")
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
  process.exitCode = 1
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

/** Atom rule: identical wording twice outside common.* should be one key. */
const byValue = new Map()
for (const [key, value] of Object.entries(locale)) {
  if (typeof value !== "string" || key.startsWith("common.")) continue
  const normalized = value.trim().toLowerCase()
  if (normalized.length < 2) continue
  if (!byValue.has(normalized)) byValue.set(normalized, [])
  byValue.get(normalized).push(key)
}
const stillDuplicated = new Set()
for (const [value, keys] of byValue) {
  if (keys.length < 2) continue
  if (KNOWN_HOMONYMS.has(value)) { stillDuplicated.add(value); continue }
  violations.duplicateValue.push({ value, keys: keys.sort() })
}
violations.duplicateValue.sort((a, b) => b.keys.length - a.keys.length)
for (const [value, reason] of KNOWN_HOMONYMS) {
  if (!stillDuplicated.has(value)) violations.staleHomonym.push({ value, reason })
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
  duplicateValue: "error", orphanKey: "error", staleHomonym: "warn",
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
  process.exitCode = 0
} else {
  if (asJson) {
    // A file, not stdout: the payload is large enough that piping it races
    // process exit and truncates.
    fs.writeFileSync(reportFile, `${JSON.stringify({ counts, violations }, null, 2)}\n`)
    console.log(`wrote ${path.relative(rootDir, reportFile)}`)
  }

  let baseline = null
  if (!strict && fs.existsSync(baselineFile)) {
    baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8")).counts
  }

  let failed = false
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
