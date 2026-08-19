/**
 * Builds the hardcoded-string worklist: every user-visible literal with the exact
 * source range needed to rewrite it.
 *
 *   npm run i18n:inventory
 *
 * Two sources, because neither tool sees the other's half:
 *   - `i18next/no-literal-string` via `eslint --format json` reports JSX TEXT
 *     nodes and gives precise line/column ranges.
 *   - This file re-scans for user-visible ATTRIBUTE literals, which that rule does
 *     not inspect at all in v6 (`markupOnly` is inert).
 *
 * Output: scripts/i18n/hardcoded-inventory.json
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..", "..")
const outFile = path.join(__dirname, "hardcoded-inventory.json")
const eslintOut = path.join(__dirname, ".eslint-report.json")

const USER_VISIBLE_ATTRS = [
  "label", "placeholder", "title", "helperText", "alt", "aria-label",
  "headerName", "tooltip", "tooltipText", "subtitle", "buttonText",
  "emptyText", "errorText", "description", "heading", "caption",
]
const ATTR_RE = new RegExp(`\\b(${USER_VISIBLE_ATTRS.join("|")})=(["'])([^"']{2,})\\2`, "g")
const NON_PROSE_RE = /^(?:[a-z0-9_-]+|[A-Za-z0-9_.\-]*\.[A-Za-z0-9_.\-]+|[#/{$].*|%s|\d+)$/
const NON_TRANSLATABLE = new Set([
  "CSV", "PDF", "PNG", "SVG", "JSON", "XLSX", "Ethereum", "Plasma", "True", "False",
])
/** Mirrors check-i18n.mjs SKIP_UI_RE and the eslint override list. */
const SKIP_UI_RE =
  /^src\/(lib|store|providers|utils|hooks|theme)\/|^src\/app\/api\/|agreement\/components\/AgreementText\//

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })
  } catch (e) {
    return e.stdout ?? "" // eslint exits non-zero when it reports anything
  }
}

/** Blank out comments, preserving offsets. Commented-out JSX is common here, and a
 *  `label="X"` inside `{/* ... *​/}` is not a live string -- rewriting one adds a key
 *  nothing references, which then surfaces as an orphan. */
function blankComments(src) {
  const out = src.split("")
  let i = 0, state = 0
  const tpl = []
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (state === 0) {
      if (c === "/" && n === "/") { state = 1; out[i] = out[i + 1] = " "; i += 2; continue }
      if (c === "/" && n === "*") { state = 2; out[i] = out[i + 1] = " "; i += 2; continue }
      if (c === "'") state = 3
      else if (c === '"') state = 4
      else if (c === "`") state = 5
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

console.log("running eslint (about a minute)...")
run("npx", ["eslint", "src", "--ext", ".ts,.tsx", "--format", "json", "-o",
            path.relative(rootDir, eslintOut)])
const report = JSON.parse(fs.readFileSync(eslintOut, "utf8"))

const lineCache = new Map()
const lines = (rel) => {
  if (!lineCache.has(rel)) {
    lineCache.set(rel, fs.readFileSync(path.join(rootDir, rel), "utf8").split("\n"))
  }
  return lineCache.get(rel)
}
/** Slice a 1-indexed [line,col)-(endLine,endCol) range out of a file. */
function slice(rel, sl, sc, el, ec) {
  const ls = lines(rel)
  if (sl === el) return ls[sl - 1].slice(sc - 1, ec - 1)
  const out = [ls[sl - 1].slice(sc - 1)]
  for (let i = sl; i < el - 1; i += 1) out.push(ls[i])
  out.push(ls[el - 1].slice(0, ec - 1))
  return out.join("\n")
}

const entries = []
for (const fileReport of report) {
  const rel = path.relative(rootDir, fileReport.filePath)
  for (const m of fileReport.messages) {
    if (m.ruleId !== "i18next/no-literal-string") continue
    const raw = slice(rel, m.line, m.column, m.endLine, m.endColumn)
    const text = raw.trim()
    if (!text) continue
    entries.push({
      kind: "jsxText", file: rel,
      line: m.line, column: m.column, endLine: m.endLine, endColumn: m.endColumn,
      raw, text,
    })
  }
}

// `-z` + NUL split: git quotes non-ASCII paths (this repo has 7), and a quoted path
// fails to open, hiding every string in those files.
const tracked = run("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "src"])
  .split("\0")
  .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/(\.test\.|\.stories\.)/.test(f) && !SKIP_UI_RE.test(f))

const unreadable = []
for (const rel of tracked) {
  let src
  try {
    src = fs.readFileSync(path.join(rootDir, rel), "utf8")
  } catch (e) {
    console.error(`inventory: cannot read ${rel} (${e.code}) -- NOT SCANNED`)
    unreadable.push(rel)
    continue
  }
  blankComments(src).split("\n").forEach((lineText, idx) => {
    for (const m of lineText.matchAll(ATTR_RE)) {
      const [whole, attr, , value] = m
      if (NON_PROSE_RE.test(value) || NON_TRANSLATABLE.has(value.trim())) continue
      entries.push({ kind: "attr", file: rel, line: idx + 1, attr, whole, text: value })
    }
  })
}
if (unreadable.length) {
  console.error(`\n${unreadable.length} file(s) unreadable -- refusing to emit a partial inventory.`)
  process.exit(1)
}

fs.writeFileSync(outFile, `${JSON.stringify({
  counts: entries.reduce((a, e) => ({ ...a, [e.kind]: (a[e.kind] ?? 0) + 1 }), {}),
  entries,
}, null, 2)}\n`)
fs.rmSync(eslintOut, { force: true })

console.log(`wrote ${path.relative(rootDir, outFile)}`)
console.log(`  jsxText : ${entries.filter((e) => e.kind === "jsxText").length}`)
console.log(`  attr    : ${entries.filter((e) => e.kind === "attr").length}`)
console.log(`  total   : ${entries.length} in ${new Set(entries.map((e) => e.file)).size} files`)
