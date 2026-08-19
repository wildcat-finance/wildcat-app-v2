/**
 * Replays the reviewed key mapping onto the current tree: rewrites every call
 * site and rebuilds src/locales/en/en.json so each key sits at its new path.
 *
 *   npm run i18n:apply-rename -- --dry-run
 *   npm run i18n:apply-rename
 *
 * The report goes to scripts/i18n/rename-report.json (or --report <path>).
 *
 * Five things this gets right, each of which was a bug the first time round:
 *
 *  1. Test files ARE rewritten. This is the opposite of check-i18n.mjs, which
 *     skips them, and it is deliberate: three test files mock `t` as the identity
 *     function and assert on the literal key string, so they must move in step
 *     with the components or the suite goes red for an unrelated-looking reason.
 *
 *  2. Two literal shapes are rewritten, not one. Keys get parked in variables
 *     (`const key = cond ? "a.b" : "a.c"; t(key)`), and rewriting only the
 *     `t("literal")` shape leaves those dangling.
 *
 *  3. Plural bases are derived. en.json holds `foo.tx_one` / `foo.tx_other` so the
 *     mapping only ever contains suffixed keys, but call sites pass the base
 *     `foo.tx` with a count. Without deriving the base mapping the locale keys
 *     move and the call site is left behind.
 *
 *  4. Values are resolved with a real 3-way merge, so this branch's newer wording
 *     wins over the refactor branch's, and the refactor branch's typo fixes still
 *     land where this branch never touched the string.
 *
 *  5. A value collision aborts the whole run and writes nothing.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..", "..")
const localeFile = path.join(rootDir, "src/locales/en/en.json")
const mappingFile = path.join(__dirname, "legacy-key-mapping.json")

const argv = process.argv.slice(2)
const dryRun = argv.includes("--dry-run")
const reportArg = argv.indexOf("--report")
const reportFile =
  reportArg !== -1 && argv[reportArg + 1]
    ? path.resolve(rootDir, argv[reportArg + 1])
    : path.join(__dirname, "rename-report.json")

const MERGE_BASE = "265eecaa"
const LOCALES_TIP = "6d59dfc9"
const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"]

/** t("key") / t('key', {...}) / i18nKey="key" -- quote captured to preserve style. */
const CALL_SITE_RE = /(\bt\(\s*|i18nKey=\s*)(["'])([A-Za-z0-9_.\-]+)\2/g
/**
 * Any quoted literal. Safe because a replacement only happens when the literal is
 * EXACTLY a key present in the mapping.
 */
const BARE_LITERAL_RE = /(["'])([A-Za-z][A-Za-z0-9_.\-]*\.[A-Za-z0-9_.\-]+)\1/g

function git(args) {
  return execFileSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out)
    else out[p] = v
  }
  return out
}

function nest(flat) {
  const root = {}
  for (const key of Object.keys(flat).sort((a, b) => a.localeCompare(b))) {
    const parts = key.split(".")
    let node = root
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i]
      if (typeof node[part] !== "object" || node[part] === null) {
        if (node[part] !== undefined) {
          throw new Error(
            `key collision building en.json: "${key}" needs ` +
              `"${parts.slice(0, i + 1).join(".")}" to be a section, but a string lives there`,
          )
        }
        node[part] = {}
      }
      node = node[part]
    }
    const leaf = parts[parts.length - 1]
    if (typeof node[leaf] === "object" && node[leaf] !== null) {
      throw new Error(`key collision building en.json: "${key}" is both a leaf and a section`)
    }
    node[leaf] = flat[key]
  }
  return root
}

const localeAt = (ref) =>
  flatten(JSON.parse(git(["show", `${ref}:src/locales/en/en.json`])))

/** Requirement 1: include test files. */
// `-z` and a NUL split, never a newline split: git QUOTES paths containing
// non-ASCII bytes (this repo has 7, e.g. a directory spelled with a Cyrillic
// "\u0441omponents"). A quoted path fails to open, and a silent `continue` then
// hides every key and every hardcoded string in those files.
const sourceFiles = () =>
  git(["ls-files", "-z", "--cached", "--others", "--exclude-standard", "src"])
    .split("\0")
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))

const raw = JSON.parse(fs.readFileSync(mappingFile, "utf8"))
if (Object.keys(raw.conflicting ?? {}).length) {
  console.error(
    `legacy-key-mapping.json has ${Object.keys(raw.conflicting).length} conflicting ` +
      "targets. Resolve them before applying.",
  )
  process.exit(1)
}

const mapping = new Map(Object.entries(raw.confident))

const current = flatten(JSON.parse(fs.readFileSync(localeFile, "utf8")))
const currentKeys = new Set(Object.keys(current))

// --- requirement 3: derive plural base mappings -----------------------------
const baseCandidates = new Map()
for (const [from, to] of mapping) {
  for (const suffix of PLURAL_SUFFIXES) {
    const tail = `_${suffix}`
    if (!from.endsWith(tail) || !to.endsWith(tail)) continue
    const baseFrom = from.slice(0, -tail.length)
    const baseTo = to.slice(0, -tail.length)
    if (!baseCandidates.has(baseFrom)) baseCandidates.set(baseFrom, new Set())
    baseCandidates.get(baseFrom).add(baseTo)
  }
}
/**
 * The inverse, and the one that actually bit: if the BASE key is mapped but the
 * suffixed variants are not, the call site (which uses the base) gets rewritten
 * while `foo.title_one` / `foo.title_other` stay behind in en.json, and the key
 * stops resolving. So for every mapped base, carry its en.json variants along.
 */
let pluralVariantsAdded = 0
for (const [from, to] of [...mapping]) {
  for (const suffix of PLURAL_SUFFIXES) {
    const vFrom = `${from}_${suffix}`
    if (currentKeys.has(vFrom) && !mapping.has(vFrom)) {
      mapping.set(vFrom, `${to}_${suffix}`)
      pluralVariantsAdded += 1
    }
  }
}

let pluralBasesAdded = 0
const pluralConflicts = []
for (const [baseFrom, targets] of baseCandidates) {
  if (mapping.has(baseFrom)) continue
  if (targets.size !== 1) {
    pluralConflicts.push({ baseFrom, targets: [...targets] })
    continue
  }
  mapping.set(baseFrom, [...targets][0])
  pluralBasesAdded += 1
}
if (pluralConflicts.length) {
  console.error("\nplural variants disagree on their destination base:")
  for (const c of pluralConflicts) console.error(`  ${c.baseFrom} -> ${c.targets.join(" | ")}`)
  console.error("Resolve in legacy-key-mapping.json, then re-run. Nothing written.")
  process.exit(1)
}

const base = localeAt(MERGE_BASE)
const refactored = localeAt(LOCALES_TIP)

const unreadableFiles = []
const usedKeys = new Map()
const rewrites = []
let filesRewritten = 0
let sitesRewritten = 0
let testFilesRewritten = 0

for (const file of sourceFiles()) {
  const abs = path.join(rootDir, file)
  let text
  try {
    text = fs.readFileSync(abs, "utf8")
  } catch (e) {
    console.error(`apply-key-rename: cannot read ${file} (${e.code}) -- NOT REWRITTEN`)
    unreadableFiles.push(file)
    continue
  }
  let touched = 0
  const note = (key) => {
    if (!usedKeys.has(key)) usedKeys.set(key, new Set())
    usedKeys.get(key).add(file)
  }

  let next = text.replace(CALL_SITE_RE, (whole, head, quote, key) => {
    note(key)
    const target = mapping.get(key)
    if (!target) return whole
    touched += 1
    return `${head}${quote}${target}${quote}`
  })
  // requirement 2: keys parked in variables
  next = next.replace(BARE_LITERAL_RE, (whole, quote, key) => {
    const target = mapping.get(key)
    if (!target) return whole
    note(key)
    touched += 1
    return `${quote}${target}${quote}`
  })

  if (touched) {
    filesRewritten += 1
    sitesRewritten += touched
    if (/\.test\.[tj]sx?$/.test(file)) testFilesRewritten += 1
    rewrites.push({ file, sites: touched })
    if (!dryRun) fs.writeFileSync(abs, next)
  }
}

if (unreadableFiles.length) {
  console.error(
    `\n${unreadableFiles.length} file(s) could not be read and were NOT rewritten. ` +
      "Aborting: a partial rename leaves dangling keys. Nothing written.",
  )
  process.exit(1)
}

// --- requirement 4: 3-way value merge ---------------------------------------
function resolveValue(oldKey) {
  const currentVal = current[oldKey]
  const baseVal = base[oldKey]
  const newKey = mapping.get(oldKey)
  // For an unmapped key look it up under its own path, so the refactor branch's
  // typo fixes are still recovered for keys its rename commits never touched.
  const refactoredVal = refactored[newKey ?? oldKey]

  if (currentVal !== baseVal) return { value: currentVal, from: "this-branch" }
  if (refactoredVal !== undefined && refactoredVal !== baseVal) {
    return { value: refactoredVal, from: "locales-refactor" }
  }
  return { value: currentVal, from: "unchanged" }
}

const nextLocale = {}
const provenance = { "this-branch": 0, "locales-refactor": 0, unchanged: 0 }
const renamed = []
const untouched = []
const collisions = []

for (const oldKey of Object.keys(current)) {
  const target = mapping.get(oldKey)
  const { value, from } = resolveValue(oldKey)
  const destination = target ?? oldKey
  if (nextLocale[destination] !== undefined && nextLocale[destination] !== value) {
    collisions.push({
      destination,
      oldKey,
      keeping: nextLocale[destination],
      dropping: value,
    })
    continue
  }
  nextLocale[destination] = value
  if (target) {
    provenance[from] += 1
    renamed.push({ from: oldKey, to: target, valueFrom: from })
  } else {
    untouched.push(oldKey)
  }
}

// --- requirement 5: abort on collision --------------------------------------
if (collisions.length) {
  console.error(
    `\n${collisions.length} value collision(s) -- two old keys map to one new key ` +
      "with different wording:",
  )
  for (const c of collisions.slice(0, 20)) {
    console.error(`  ${c.destination}`)
    console.error(`    via ${c.oldKey}`)
    console.error(`    keeping : ${JSON.stringify(c.keeping)}`)
    console.error(`    dropping: ${JSON.stringify(c.dropping)}`)
  }
  console.error("\nNothing was written. Fix legacy-key-mapping.json, then re-run.")
  process.exit(1)
}

if (!dryRun) {
  fs.writeFileSync(localeFile, `${JSON.stringify(nest(nextLocale), null, 2)}\n`)
}

// A key the code references that en.json does not define. Plural-aware.
const localeDefines = (flat, key) =>
  flat[key] !== undefined || PLURAL_SUFFIXES.some((s) => flat[`${key}_${s}`] !== undefined)
const missingInLocale = [...usedKeys.keys()].filter(
  (k) => !localeDefines(current, k) && !mapping.has(k),
)
const uncovered = [...usedKeys.keys()].filter((k) => !mapping.has(k)).sort()

console.log(dryRun ? "DRY RUN -- nothing written\n" : "applied\n")
console.log(`mapping entries               : ${mapping.size}`)
console.log(`  plural bases derived        : ${pluralBasesAdded}`)
console.log(`  plural variants derived     : ${pluralVariantsAdded}`)
console.log(`call sites rewritten          : ${sitesRewritten} across ${filesRewritten} files`)
console.log(`  of which test files         : ${testFilesRewritten}`)
console.log(`locale keys renamed           : ${renamed.length}`)
console.log(`  value from this branch      : ${provenance["this-branch"]}`)
console.log(`  value from locales-refactor : ${provenance["locales-refactor"]}`)
console.log(`  value unchanged             : ${provenance.unchanged}`)
console.log(`locale keys left in place     : ${untouched.length}`)
console.log(`code keys with no mapping     : ${uncovered.length}`)
console.log(`code keys missing from en.json: ${missingInLocale.length}`)

fs.writeFileSync(
  reportFile,
  `${JSON.stringify(
    {
      dryRun,
      stats: {
        mappingEntries: mapping.size,
        pluralBasesDerived: pluralBasesAdded,
        pluralVariantsDerived: pluralVariantsAdded,
        sitesRewritten,
        filesRewritten,
        testFilesRewritten,
        localeKeysRenamed: renamed.length,
        provenance,
        localeKeysLeftInPlace: untouched.length,
        codeKeysWithNoMapping: uncovered.length,
        codeKeysMissingFromLocale: missingInLocale.length,
      },
      rewrites: rewrites.sort((a, b) => b.sites - a.sites),
      renamed,
      localeKeysLeftInPlace: untouched.sort(),
      codeKeysWithNoMapping: uncovered,
      codeKeysMissingFromLocale: missingInLocale.sort(),
    },
    null,
    2,
  )}\n`,
)
console.log(`\nreport: ${path.relative(rootDir, reportFile)}`)
