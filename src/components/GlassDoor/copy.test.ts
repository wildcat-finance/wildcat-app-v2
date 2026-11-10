/** @jest-environment node */

import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import frozen from "./__fixtures__/glassDoor.frozen.json"

// The live file is read from disk: importing it would give the frozen copy,
// as every other test gets (jest.config.ts).
const live = JSON.parse(
  readFileSync(
    path.join(__dirname, "..", "..", "locales", "en", "glassDoor.json"),
    "utf8",
  ),
)

// The checks on glassDoor.json, the master copy of every Glass Door word. An
// editor may change any sentence; these fail only when an edit would break
// the page: a text added or removed without the code, a {{placeholder}} the
// code does not fill, a missing plural form, or a reference to nothing.

type Node = string | { [key: string]: Node }

const PLURAL = /_(one|other)$/
const ORDINAL = /_ordinal_(one|two|few|other)$/
const ROOTS = ["metrics", "cards", "charts", "pages", "shared", "treatments"]

/** Every text by its dotted path; notes (keys starting with "_") are left out. */
const leaves = (node: Node, prefix = ""): Map<string, string> => {
  const found = new Map<string, string>()
  if (typeof node === "string") return found.set(prefix, node)
  Object.entries(node).forEach(([key, child]) => {
    if (key.startsWith("_")) return
    leaves(child, prefix ? `${prefix}.${key}` : key).forEach((value, at) =>
      found.set(at, value),
    )
  })
  return found
}

const placeholders = (sentence: string) =>
  new Set(
    [...sentence.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)].map(
      (match) => match[1],
    ),
  )
const references = (sentence: string) =>
  [...sentence.matchAll(/\$t\(([^)]+)\)/g)].map((match) => match[1].trim())

/** A plural form's key as the code asks for it. */
const base = (key: string) => key.replace(ORDINAL, "").replace(PLURAL, "")

const liveTexts = leaves(live as Node)
const frozenTexts = leaves(frozen as Node)

describe("glassDoor.json, the master copy", () => {
  it("holds the same texts as the frozen copy the tests read", () => {
    const missing = [...frozenTexts.keys()].filter((key) => !liveTexts.has(key))
    const added = [...liveTexts.keys()].filter((key) => !frozenTexts.has(key))
    // A text was added or removed: change the code that uses it, then copy
    // the live file over __fixtures__/glassDoor.frozen.json.
    expect({ missing, added }).toEqual({ missing: [], added: [] })
  })

  it("uses only the placeholders the page fills in", () => {
    const unknown = [...liveTexts].flatMap(([key, sentence]) => {
      const known = placeholders(frozenTexts.get(key) ?? "")
      return [...placeholders(sentence)]
        .filter((name) => !known.has(name))
        .map((name) => `${key}: {{${name}}} is not a value the page supplies`)
    })
    expect(unknown).toEqual([])
  })

  it("refers only to texts that exist", () => {
    const broken = [...liveTexts].flatMap(([key, sentence]) =>
      references(sentence)
        .filter((target) => !liveTexts.has(target))
        .map((target) => `${key}: $t(${target}) points at nothing`),
    )
    expect(broken).toEqual([])
  })

  it("has every plural form", () => {
    const keys = [...liveTexts.keys()]
    const incomplete = keys.flatMap((key) => {
      if (ORDINAL.test(key)) {
        const stem = key.replace(ORDINAL, "")
        return ["one", "two", "few", "other"]
          .filter((form) => !liveTexts.has(`${stem}_ordinal_${form}`))
          .map((form) => `${stem}_ordinal_${form} is missing`)
      }
      if (!PLURAL.test(key)) return []
      const stem = key.replace(PLURAL, "")
      return ["one", "other"]
        .filter((form) => !liveTexts.has(`${stem}_${form}`))
        .map((form) => `${stem}_${form} is missing`)
    })
    expect([...new Set(incomplete)]).toEqual([])
  })

  it("keeps no empty text", () => {
    expect([...liveTexts].filter(([, value]) => !value.trim())).toEqual([])
  })
})

// ---------- which texts the code asks for ----------

const SOURCES = [__dirname, path.join(__dirname, "..", "GlassDoorReview")]
const sourceFiles = SOURCES.flatMap((folder) =>
  readdirSync(folder)
    .filter(
      (file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file),
    )
    .map((file) => path.join(folder, file)),
)

/** The end of a quoted literal that opens at `start`. */
const literalEnd = (source: string, start: number) => {
  const quote = source[start]
  let at = start + 1
  while (at < source.length && source[at] !== quote) {
    if (source[at] === "\\") at += 1
    else if (quote === "`" && source[at] === "$" && source[at + 1] === "{") {
      let depth = 1
      at += 2
      while (at < source.length && depth > 0) {
        if (source[at] === "{") depth += 1
        else if (source[at] === "}") depth -= 1
        at += 1
      }
      at -= 1
    }
    at += 1
  }
  return at
}

/** The first argument of the call whose "(" is at `open`. */
const firstArgument = (source: string, open: number) => {
  let depth = 0
  let at = open + 1
  while (at < source.length) {
    const char = source[at]
    if (char === '"' || char === "'" || char === "`")
      at = literalEnd(source, at)
    else if ("([{".includes(char)) depth += 1
    else if (")]}".includes(char)) {
      if (depth === 0) break
      depth -= 1
    } else if (char === "," && depth === 0) break
    at += 1
  }
  return source.slice(open + 1, at)
}

/** The quoted literals in a piece of source, with ${…} as a wildcard. */
const literalsIn = (source: string) => {
  const found: string[] = []
  let at = 0
  while (at < source.length) {
    if (`"'\``.includes(source[at])) {
      const end = literalEnd(source, at)
      found.push(source.slice(at + 1, end).replace(/\$\{[^}]*\}/g, "*"))
      at = end
    }
    at += 1
  }
  return found
}

/** Every path the code asks for, as written (a "*" stands for one segment). */
const asked = new Set<string>()
sourceFiles.forEach((file) => {
  const source = readFileSync(file, "utf8")
  const prefixes = new Map<string, string>([
    ["text", ""],
    ["textAt", ""],
    ["hasText", ""],
  ])
  ;[...source.matchAll(/const (\w+) = scoped\(\s*"([^"]+)"/g)].forEach(
    ([, name, prefix]) => prefixes.set(name, prefix),
  )
  prefixes.forEach((prefix, name) => {
    ;[...source.matchAll(new RegExp(`(?<![\\w.])${name}\\(`, "g"))].forEach(
      (match) => {
        const open = match.index + match[0].length - 1
        literalsIn(firstArgument(source, open)).forEach((literal) =>
          asked.add(prefix ? `${prefix}.${literal}` : literal),
        )
      },
    )
  })
  // A path built ahead of its call: `treatments.${cardKey(id)}.note`.
  literalsIn(source)
    .filter((literal) => ROOTS.some((root) => literal.startsWith(`${root}.`)))
    .forEach((literal) => asked.add(literal))
})

const matcher = (pattern: string) =>
  new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join("[^.]+")}$`,
  )
const askedPatterns = [...asked]
  // A path of wildcards alone (scoped's own `${prefix}.${key}`) names nothing.
  .filter(
    (pattern) =>
      /^[\w.*]+$/.test(pattern) &&
      pattern.includes(".") &&
      /\w/.test(pattern.replace(/\*/g, "")),
  )
  .map((pattern) => ({ pattern, matches: matcher(pattern) }))

describe("glassDoor.json against the code", () => {
  const keys = [...new Set([...liveTexts.keys()].map(base))]

  it("has no text the code never asks for", () => {
    const unused = keys.filter(
      (key) => !askedPatterns.some(({ matches }) => matches.test(key)),
    )
    expect(unused).toEqual([])
  })

  it("has every text the code asks for", () => {
    // A section's own path (the argument of scoped) counts when it has texts.
    const absent = askedPatterns
      .filter(
        ({ pattern, matches }) =>
          !keys.some(
            (key) => matches.test(key) || key.startsWith(`${pattern}.`),
          ),
      )
      .map(({ pattern }) => pattern)
    expect(absent).toEqual([])
  })
})
