/**
 * Applies hardcoded-key-proposal.json: adds the new keys to en.json and rewrites
 * each hardcoded string into a `t("key")` call.
 *
 *   npm run i18n:apply-hardcoded -- --dry-run
 *   npm run i18n:apply-hardcoded                # only where `t` is already in scope
 *   npm run i18n:apply-hardcoded -- --wire-hook # also add useTranslation where missing
 *
 * Rewrites run bottom-up within each file so an edit never invalidates the source
 * range of an edit still to come.
 *
 * Three things this gets right, each a real failure the first time round:
 *
 *  1. `t` scope is per-FUNCTION, not per-file. Files define module-level helper
 *     components beside the main one; a string inside a helper has no `t` even
 *     though the file declares one, and rewriting it yields "Cannot find name 't'".
 *
 *  2. --wire-hook refuses any file where it cannot identify exactly one enclosing
 *     component, and when it adds the import it finds the line that COMPLETES the
 *     last import -- inserting after the last line merely starting with `import`
 *     splits a multi-line import and the file stops parsing.
 *
 *  3. `import { Trans } from "react-i18next"` satisfies a module-level import test
 *     while leaving useTranslation undefined, so the specifier list is extended
 *     rather than a second import added.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..", "..")
const proposalFile = path.join(__dirname, "hardcoded-key-proposal.json")
const localeFile = path.join(rootDir, "src/locales/en/en.json")

const dryRun = process.argv.includes("--dry-run")
const wireHook = process.argv.includes("--wire-hook")

const T_DECL_RE = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation\s*\(/g
const IMPORT_T_RE = /import\s*\{[^}]*\buseTranslation\b[^}]*\}\s*from\s+"react-i18next"/
const IMPORT_MODULE_RE = /import\s*\{([^}]*)\}\s*from\s+"react-i18next"/

/** Line ranges in which `t` is actually bound: from each declaration, walk forward
 *  counting braces; the scope ends where the enclosing block closes. */
function tScopes(src) {
  const scopes = []
  T_DECL_RE.lastIndex = 0
  let m
  while ((m = T_DECL_RE.exec(src))) {
    let depth = 0
    let i = m.index
    for (; i < src.length; i += 1) {
      const c = src[i]
      if (c === "{") depth += 1
      else if (c === "}") { depth -= 1; if (depth < 0) break }
    }
    scopes.push([
      src.slice(0, m.index).split("\n").length,
      src.slice(0, i).split("\n").length,
    ])
  }
  return scopes
}
const inScope = (scopes, line) => scopes.some(([a, b]) => line >= a && line <= b)

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
            `key collision: "${key}" needs "${parts.slice(0, i + 1).join(".")}" to be a section`,
          )
        }
        node[part] = {}
      }
      node = node[part]
    }
    const leaf = parts[parts.length - 1]
    if (typeof node[leaf] === "object" && node[leaf] !== null) {
      throw new Error(`key collision: "${key}" is both a leaf and a section`)
    }
    node[leaf] = flat[key]
  }
  return root
}

/** Insert `const { t } = useTranslation()` into the single enclosing component. */
function wireUseTranslation(src) {
  const componentRe =
    /(?:export\s+)?(?:const\s+([A-Z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*\([^)]*\)\s*(?::[^=]+)?=>\s*\{|function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{|export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{)/g
  const matches = [...src.matchAll(componentRe)]
  if (matches.length !== 1) {
    return { changed: false, skipped: `${matches.length} candidate components` }
  }
  const at = matches[0].index + matches[0][0].length
  let next = `${src.slice(0, at)}\n  const { t } = useTranslation()\n${src.slice(at)}`

  if (IMPORT_T_RE.test(next)) return { src: next, changed: true }

  // react-i18next already imported for something else -> extend that specifier list
  const existing = next.match(IMPORT_MODULE_RE)
  if (existing) {
    const names = existing[1].split(",").map((n) => n.trim()).filter(Boolean)
      .concat("useTranslation").sort()
    return {
      src: next.replace(existing[0], `import { ${names.join(", ")} } from "react-i18next"`),
      changed: true,
    }
  }

  const lines = next.split("\n")
  let last = -1
  let multiline = false
  lines.forEach((l, i) => {
    if (multiline) {
      if (/^\}\s*from\s+["'][^"']+["'];?\s*$/.test(l)) { multiline = false; last = i }
      return
    }
    if (!/^import\b/.test(l)) return
    const completes =
      /\sfrom\s+["'][^"']+["'];?\s*$/.test(l) || /^import\s+["'][^"']+["'];?\s*$/.test(l)
    if (completes) last = i
    else multiline = true
  })
  if (last === -1) return { changed: false, skipped: "no import block" }
  lines.splice(last + 1, 0, 'import { useTranslation } from "react-i18next"')
  return { src: lines.join("\n"), changed: true }
}

const { proposal } = JSON.parse(fs.readFileSync(proposalFile, "utf8"))
const locale = flatten(JSON.parse(fs.readFileSync(localeFile, "utf8")))

const sitesByFile = new Map()
for (const entry of proposal) {
  for (const site of entry.sites) {
    if (!sitesByFile.has(site.file)) sitesByFile.set(site.file, [])
    sitesByFile.get(site.file).push({ ...site, key: entry.key, value: entry.text })
  }
}

const originals = new Map()
const readOriginal = (file) => {
  if (!originals.has(file)) {
    originals.set(file, fs.readFileSync(path.join(rootDir, file), "utf8"))
  }
  return originals.get(file)
}

const results = { files: 0, sites: 0, wired: 0, skipped: [] }
const addedKeys = {}

for (const [file, allSites] of sitesByFile) {
  let src
  try {
    src = readOriginal(file)
  } catch (e) {
    results.skipped.push({ file, sites: allSites.length, reason: `unreadable (${e.code})` })
    continue
  }
  let scopes = tScopes(src)

  if (!scopes.length) {
    if (!wireHook) {
      results.skipped.push({ file, sites: allSites.length, reason: "no `t` anywhere in file" })
      continue
    }
    const wired = wireUseTranslation(src)
    if (!wired.changed) {
      results.skipped.push({ file, sites: allSites.length, reason: wired.skipped })
      continue
    }
    src = wired.src
    scopes = tScopes(src)
    results.wired += 1
  }

  const shift = src.split("\n").length - readOriginal(file).split("\n").length
  const sites = allSites.filter((s) => inScope(scopes, s.line + shift))
  const outOfScope = allSites.length - sites.length
  if (outOfScope) {
    results.skipped.push({
      file, sites: outOfScope,
      reason: "site outside any `t` scope (module-level helper)",
    })
  }
  if (!sites.length) continue

  const lines = src.split("\n")
  const ordered = [...sites].sort(
    (a, b) => b.line - a.line || (b.column ?? 0) - (a.column ?? 0),
  )
  for (const site of ordered) {
    const line = site.line + shift
    const call = `t("${site.key}")`

    if (site.kind === "attr") {
      const idx = lines[line - 1].indexOf(site.whole)
      if (idx === -1) {
        results.skipped.push({ file, sites: 1, reason: `attr not found on line ${line}` })
        continue
      }
      lines[line - 1] =
        lines[line - 1].slice(0, idx) + `${site.attr}={${call}}` +
        lines[line - 1].slice(idx + site.whole.length)
      results.sites += 1
      addedKeys[site.key] = site.value
      continue
    }

    // jsxText: replace the node range, keeping its original surrounding whitespace
    const endLine = site.endLine + shift
    const leading = site.raw.match(/^\s*/)[0]
    const trailing = site.raw.match(/\s*$/)[0]
    const head = lines[line - 1].slice(0, site.column - 1)
    const tail = lines[endLine - 1].slice(site.endColumn - 1)
    const rebuilt = (head + leading + `{${call}}` + trailing + tail).split("\n")
    lines.splice(line - 1, endLine - line + 1, ...rebuilt)
    results.sites += 1
    addedKeys[site.key] = site.value
  }

  if (!dryRun) fs.writeFileSync(path.join(rootDir, file), lines.join("\n"))
  results.files += 1
}

let added = 0
for (const [key, value] of Object.entries(addedKeys)) {
  if (locale[key] === undefined) { locale[key] = value; added += 1 }
}
if (!dryRun) fs.writeFileSync(localeFile, `${JSON.stringify(nest(locale), null, 2)}\n`)

console.log(dryRun ? "DRY RUN -- nothing written\n" : "applied\n")
console.log(`files rewritten      : ${results.files}`)
console.log(`sites rewritten      : ${results.sites}`)
console.log(`useTranslation wired : ${results.wired}`)
console.log(`new locale keys      : ${added}`)
const skippedSites = results.skipped.reduce((n, s) => n + s.sites, 0)
console.log(`skipped              : ${skippedSites} sites in ${results.skipped.length} files`)
for (const s of results.skipped.slice(0, 40)) {
  console.log(`    ${String(s.sites).padStart(3)}  ${s.file}  (${s.reason})`)
}
