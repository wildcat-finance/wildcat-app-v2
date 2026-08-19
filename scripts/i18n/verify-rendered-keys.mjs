/**
 * Resolves every i18n key the code actually calls through a REAL i18next instance,
 * configured exactly as src/app/i18n.ts configures it (language "en", namespace
 * "en"). Offline, deterministic, no browser.
 *
 *   node scripts/i18n/verify-rendered-keys.mjs
 *
 * This answers a different question from check-i18n.mjs. That script asks "is the
 * key present in en.json". This one asks "what does the user actually see", and so
 * it catches four things static analysis cannot:
 *
 *   unresolved     the key renders as the raw key string
 *   objectValue    the key points at a section, so t() returns an object
 *   missingInterp  the value has a {{placeholder}} the call site never supplies,
 *                  so `{{marketName}}` renders literally
 *   htmlInT        the value carries markup but is rendered with t() rather than
 *                  <Trans>, so tags are escaped into view
 *
 * Plural keys are resolved with a numeric `count`, because filling `count` with a
 * placeholder string makes every plural base look unresolvable.
 *
 * Exits non-zero when anything is found, so it can gate CI.
 */
import { createInstance } from "i18next"
import { execFileSync } from "node:child_process"
import fs from "node:fs"

const en = JSON.parse(fs.readFileSync("src/locales/en/en.json", "utf8"))

// Same shape as src/app/i18n.ts: language "en", namespace "en".
const i18n = createInstance()
await i18n.init({
  lng: "en",
  resources: { en: { en } },
  fallbackLng: "en",
  supportedLngs: ["en"],
  defaultNS: "en",
  fallbackNS: "en",
  ns: ["en"],
})

function blankComments(src) {
  const out = src.split("")
  let i = 0, state = 0
  const tpl = []
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (state === 0) {
      if (c === "/" && n === "/") { state = 1; out[i] = out[i + 1] = " "; i += 2; continue }
      if (c === "/" && n === "*") { state = 2; out[i] = out[i + 1] = " "; i += 2; continue }
      if (c === "'") state = 3; else if (c === '"') state = 4; else if (c === "`") state = 5
      else if (c === "}" && tpl.length) { tpl.pop(); state = 5 }
      i += 1; continue
    }
    if (state === 1) { if (c === "\n") state = 0; else out[i] = " "; i += 1; continue }
    if (state === 2) {
      if (c === "*" && n === "/") { out[i] = out[i + 1] = " "; state = 0; i += 2; continue }
      if (c !== "\n") out[i] = " "
      i += 1; continue
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

/**
 * Extract the full text of the call starting at `t(` / `<Trans`, by matching the
 * opening delimiter. Prettier wraps long calls across lines, so anything that
 * assumes the argument object sits near the key will miss it.
 */
function callText(src, start, open, close) {
  const from = src.indexOf(open, start)
  if (from === -1) return ""
  let depth = 0, i = from, q = null
  for (; i < src.length && i < from + 4000; i += 1) {
    const c = src[i]
    if (q) { if (c === "\\") { i += 1; continue } if (c === q) q = null; continue }
    if (c === '"' || c === "'" || c === "`") { q = c; continue }
    if (c === open) depth += 1
    else if (c === close) { depth -= 1; if (!depth) return src.slice(from, i + 1) }
  }
  return src.slice(from, i)
}

/** Top-level property names of the first object literal in `text`. */
function optionKeys(text) {
  const open = text.indexOf("{")
  if (open === -1) return []
  let depth = 0, i = open, body = "", q = null
  for (; i < text.length; i += 1) {
    const c = text[i]
    if (q) { body += c; if (c === "\\") { body += text[++i] ?? ""; continue } if (c === q) q = null; continue }
    if (c === '"' || c === "'" || c === "`") { q = c; body += c; continue }
    if (c === "{") depth += 1
    else if (c === "}") { depth -= 1; if (!depth) break }
    body += c
  }
  // drop nested structures so only top-level props remain
  let flat = body.slice(1)
  for (let pass = 0; pass < 6; pass += 1) {
    flat = flat.replace(/\{[^{}]*\}/g, "").replace(/\([^()]*\)/g, "").replace(/\[[^\[\]]*\]/g, "")
  }
  return [
    ...flat.matchAll(/(?:^|,)\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)\s*(?=[:,}]|$)/g),
  ].map((m) => m[1])
}

// `-z` and a NUL split, never a newline split: git QUOTES paths containing
// non-ASCII bytes (this repo has 7, e.g. a directory spelled with a Cyrillic
// "\u0441omponents"). A quoted path fails to open, and a silent `continue` then
// hides every key and every hardcoded string in those files.
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "src"], { encoding: "utf8" })
  .split("\0").filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.(test|stories)\./.test(f))

const CALL = /\bt\(\s*"([A-Za-z0-9_.\-]+)"/g
const TRANS = /i18nKey=\s*"([A-Za-z0-9_.\-]+)"/g
// Keys parked in a variable and handed to t()/<Trans i18nKey={key}> later. Scoped
// to the sections en.json defines so ordinary dotted strings are not swept in.
const BARE = /"([A-Za-z][A-Za-z0-9_\-]*(?:\.[A-Za-z0-9_\-]+){2,})"/g
const SECTIONS = new Set(Object.keys(en))

const findings = { unresolved: [], objectValue: [], missingInterp: [], htmlInT: [] }
let checked = 0

for (const file of files) {
  let raw
  try { raw = fs.readFileSync(file, "utf8") } catch { continue }
  const src = blankComments(raw)
  const lineAt = (idx) => src.slice(0, idx).split("\n").length

  // bare literals first: report only ones that fail outright, since we cannot know
  // what options a later call site supplies
  BARE.lastIndex = 0
  let b
  while ((b = BARE.exec(src))) {
    const key = b[1]
    if (!SECTIONS.has(key.split(".")[0])) continue
    if (src.slice(Math.max(0, b.index - 12), b.index).match(/\bt\(\s*$|i18nKey=\s*$/)) continue
    if (!/useTranslation|\bt\(|i18nKey|Trans/.test(src)) continue
    const r = i18n.t(key, { count: 2 })
    if (typeof r !== "string" || r === key) {
      findings.unresolved.push({ file, line: lineAt(b.index), key, resolved: String(r) })
    }
  }

  for (const [re, isTrans] of [[CALL, false], [TRANS, true]]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(src))) {
      const key = m[1]
      checked += 1
      const line = lineAt(m.index)

      // what does the raw resource hold?
      const rawNode = key.split(".").reduce((n, p) => (n && typeof n === "object" ? n[p] : undefined), en)
      if (rawNode && typeof rawNode === "object") {
        const pluralish = Object.keys(rawNode).some((k) => /^(zero|one|two|few|many|other)$/.test(k))
        if (!pluralish) { findings.objectValue.push({ file, line, key }); continue }
      }

      // options passed at the call site
      const text = isTrans
        ? src.slice(m.index, m.index + 900)
        : callText(src, m.index, "(", ")")
      const valuesAt = isTrans ? text.indexOf("values={") : -1
      let opts = optionKeys(
        // `values={{ ... }}` is a JSX brace wrapping an object brace. Skip the JSX
        // one, or the object reads as a nested structure and gets flattened away.
        isTrans ? (valuesAt === -1 ? "" : text.slice(valuesAt + "values={".length)) : text,
      )
      const spread = /\.\.\./.test(text)

      // `count` drives pluralisation and must stay numeric -- filling it with a
      // placeholder string was making every plural base look unresolvable.
      const filled = Object.fromEntries(
        opts.filter((o) => o !== "count").map((o) => [o, `\u00ab${o}\u00bb`]),
      )
      if (opts.includes("count")) filled.count = 2
      const resolved = i18n.t(key, filled)

      if (typeof resolved !== "string" || resolved === key) {
        findings.unresolved.push({ file, line, key, resolved: String(resolved) })
        continue
      }
      const unfilled = [...resolved.matchAll(/\{\{\s*([A-Za-z_$][\w$]*)[^}]*\}\}/g)].map((x) => x[1])
      if (unfilled.length && !spread) findings.missingInterp.push({ file, line, key, unfilled, opts })
      if (!isTrans && /<[a-zA-Z][^>]*>/.test(resolved)) findings.htmlInT.push({ file, line, key, resolved: resolved.slice(0, 90) })
    }
  }
}

console.log(`resolved ${checked} call sites through a real i18next instance\n`)
for (const [name, label] of [
  ["unresolved", "key does not resolve (renders the raw key)"],
  ["objectValue", "key points at a section, not a string"],
  ["missingInterp", "placeholder in the value that the call site never supplies"],
  ["htmlInT", "value contains markup but is rendered with t() instead of <Trans>"],
]) {
  const rows = findings[name]
  console.log(`${label}: ${rows.length}`)
  for (const r of rows.slice(0, 25)) {
    const extra = r.unfilled ? `  missing {{${r.unfilled.join(", ")}}}  (passed: ${r.opts.join(", ") || "nothing"})`
      : r.resolved ? `  -> ${JSON.stringify(r.resolved)}` : ""
    console.log(`   ${r.file}:${r.line}  ${r.key}${extra}`)
  }
  if (rows.length > 25) console.log(`   ... and ${rows.length - 25} more`)
  console.log()
}

const problems = Object.values(findings).reduce((n, rows) => n + rows.length, 0)
if (problems === 0) console.log("PASS - every key resolves and every placeholder is supplied")
process.exitCode = problems === 0 ? 0 : 1
