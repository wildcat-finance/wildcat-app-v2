/// Keeps a custom MLA's HTML in step with edits to its plain text.
///
/// A custom MLA starts as a copy of a stored MLA: its HTML (what borrowers and
/// lenders read, often a Google Docs export whose clause numbers are drawn by
/// CSS) and its plain text (what they sign). The admin edits the plain text;
/// each changed paragraph is found in the HTML by its words and changed there
/// in place, so the HTML keeps its styling. Edits that cannot be placed that
/// way are reported for the admin to make in the HTML by hand.

const ch = (code: number) => String.fromCharCode(code)

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: ch(0xa0),
  ldquo: ch(0x201c),
  rdquo: ch(0x201d),
  lsquo: ch(0x2018),
  rsquo: ch(0x2019),
  ndash: ch(0x2013),
  mdash: ch(0x2014),
  hellip: ch(0x2026),
  bull: ch(0x2022),
  middot: ch(0xb7),
  sect: ch(0xa7),
  copy: ch(0xa9),
  reg: ch(0xae),
  trade: ch(0x2122),
}

/// Every way the two texts write a quotation mark or apostrophe; the market
/// MLA's plain text has backticks where its HTML has curly quotes.
const QUOTES = new Set(
  ['"', "'", "`", ...[0x2018, 0x2019, 0x201a, 0x201b, 0x201c, 0x201d]].map(
    (quote) => (typeof quote === "number" ? ch(quote) : quote),
  ),
)

/// A clause number or bullet that opens a plain-text paragraph. The HTML
/// usually draws these with CSS, so they are not part of its text.
const BULLETS = [0x2022, 0x25cf, 0x25cb, 0x25a0, 0x25aa, 0x25e6]
  .map(ch)
  .join("")
const ENUMERATOR = new RegExp(
  `^\\s*(?:[${BULLETS}*-]|\\(?(?:\\d+(?:\\.\\d+)+\\.?|\\d+[.)]|[a-z][.)]|[ivxlc]+[.)]))\\s+`,
  "i",
)

/// Elements whose content is not agreement text.
const SKIPPED = new Set(["head", "style", "script", "title"])

/// Elements that start or end a paragraph of text.
const BLOCK_TAGS = new Set([
  "html",
  "body",
  "div",
  "p",
  "li",
  "ul",
  "ol",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "br",
  "hr",
])

/// Elements that are removed whole when their paragraph is deleted.
const REMOVABLE_TAGS = new Set(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6"])

const TOKEN = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|[^<]+|</g
const ENTITY = /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/y

type Segment = {
  /* Where this run of text starts in the HTML */
  rawStart: number
  /* Where its decoded text starts in the paragraph's text */
  start: number
  decoded: string
  /* For each decoded character, its offset in the raw run; one extra entry
     for the end */
  rawOffsets: number[]
}

export type HtmlParagraph = {
  /* The paragraph's text as a reader sees it, entities decoded */
  text: string
  /* Runs of text between tags, in order */
  segments: Segment[]
  /* The element that holds exactly this paragraph, when it can be removed
     whole */
  element?: { start: number; end: number }
}

export type UnplacedEdit = {
  kind: "add" | "change" | "remove"
  /* The plain-text paragraph concerned */
  text: string
}

const toCodePoint = (code: number) =>
  Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : undefined

const decodeEntity = (entity: string) => {
  if (/^#x/i.test(entity)) return toCodePoint(parseInt(entity.slice(2), 16))
  if (entity.startsWith("#")) return toCodePoint(parseInt(entity.slice(1), 10))
  return NAMED_ENTITIES[entity]
}

const decodeText = (raw: string) => {
  let decoded = ""
  const rawOffsets: number[] = []
  let index = 0
  while (index < raw.length) {
    if (raw[index] === "&") {
      ENTITY.lastIndex = index
      const match = ENTITY.exec(raw)
      const value = match ? decodeEntity(match[1]) : undefined
      if (match && value !== undefined) {
        for (let unit = 0; unit < value.length; unit += 1) {
          rawOffsets.push(index)
        }
        decoded += value
        index += match[0].length
        // eslint-disable-next-line no-continue
        continue
      }
    }
    rawOffsets.push(index)
    decoded += raw[index]
    index += 1
  }
  rawOffsets.push(raw.length)
  return { decoded, rawOffsets }
}

/// Text made safe to place between HTML tags.
const encodeText = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(ch(0xa0), "&nbsp;")

/// The paragraphs of an agreement's HTML, in order: the text of each `p`,
/// `li` or heading (split at line breaks), and of each table row, its cells
/// joined by a space as the plain text writes them. Each comes with where
/// each run of its text sits in the HTML.
export const parseHtmlParagraphs = (html: string): HtmlParagraph[] => {
  type Building = HtmlParagraph & { open?: { name: string; start: number } }
  const paragraphs: HtmlParagraph[] = []
  let current: Building = { text: "", segments: [] }
  let skipping: string | undefined
  let inRow = false

  const finish = () => {
    if (current.text.trim()) {
      paragraphs.push({
        text: current.text,
        segments: current.segments,
        element: current.element,
      })
    }
    current = { text: "", segments: [] }
  }

  Array.from(html.matchAll(TOKEN)).forEach((match) => {
    const token = match[0]
    const index = match.index ?? 0
    const name = match[1]?.toLowerCase()
    const isClosing = token.startsWith("</")
    if (skipping) {
      if (isClosing && name === skipping) skipping = undefined
      return
    }
    if (token.startsWith("<!--")) return
    if (name) {
      if (!isClosing && SKIPPED.has(name)) {
        finish()
        if (!token.endsWith("/>")) skipping = name
        return
      }
      if (!BLOCK_TAGS.has(name)) return
      if (name === "tr") {
        if (isClosing && current.open?.name === "tr") {
          current.element = {
            start: current.open.start,
            end: index + token.length,
          }
        }
        finish()
        inRow = !isClosing
        if (inRow) current.open = { name, start: index }
        return
      }
      if (inRow) {
        // Cells, and paragraphs within them, run on as one line of text.
        if (current.text && !/\s$/.test(current.text)) current.text += " "
        return
      }
      if (isClosing && current.open?.name === name) {
        current.element = {
          start: current.open.start,
          end: index + token.length,
        }
      }
      finish()
      if (!isClosing && REMOVABLE_TAGS.has(name)) {
        current.open = { name, start: index }
      }
      return
    }
    const { decoded, rawOffsets } = decodeText(token)
    current.segments.push({
      rawStart: index,
      start: current.text.length,
      decoded,
      rawOffsets,
    })
    current.text += decoded
  })
  finish()
  return paragraphs
}

/// A paragraph reduced to what both texts agree on: no clause number or
/// bullet in front, one kind of quotation mark, single spaces. `map` gives,
/// for each character of `text`, its index in the original; its last entry is
/// where the original's content ends.
export const normaliseParagraph = (original: string) => {
  const start = original.match(ENUMERATOR)?.[0].length ?? 0
  let text = ""
  const map: number[] = []
  let space = -1
  let end = start
  for (let index = start; index < original.length; index += 1) {
    const char = original[index]
    if (/\s/.test(char)) {
      if (text && space < 0) space = index
    } else {
      if (space >= 0) {
        text += " "
        map.push(space)
        space = -1
      }
      text += QUOTES.has(char) ? '"' : char
      map.push(index)
      end = index + 1
    }
  }
  map.push(end)
  return { text, map }
}

type Hunk = { removed: number[]; added: number[] }

/// The lines that changed between two versions of a text, as runs of removed
/// and added line indices.
const diffLines = (before: string[], after: string[]): Hunk[] => {
  let start = 0
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start += 1
  }
  let endBefore = before.length
  let endAfter = after.length
  while (
    endBefore > start &&
    endAfter > start &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore -= 1
    endAfter -= 1
  }
  const n = endBefore - start
  const m = endAfter - start
  const common = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      common[i][j] =
        before[start + i] === after[start + j]
          ? common[i + 1][j + 1] + 1
          : Math.max(common[i + 1][j], common[i][j + 1])
    }
  }
  const hunks: Hunk[] = []
  let hunk: Hunk = { removed: [], added: [] }
  const flush = () => {
    if (hunk.removed.length > 0 || hunk.added.length > 0) hunks.push(hunk)
    hunk = { removed: [], added: [] }
  }
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && before[start + i] === after[start + j]) {
      flush()
      i += 1
      j += 1
    } else if (j < m && (i === n || common[i][j + 1] >= common[i + 1][j])) {
      hunk.added.push(start + j)
      j += 1
    } else {
      hunk.removed.push(start + i)
      i += 1
    }
  }
  flush()
  return hunks
}

const splitLines = (text: string) => text.replaceAll("\r\n", "\n").split("\n")

/// The HTML after the edits that turned `fromText` into `toText`, given the
/// HTML that matched `fromText` and its parsed paragraphs. A changed
/// paragraph is changed in place when it is found in the HTML and the change
/// falls within one run of text; a deleted paragraph's element is removed.
/// New paragraphs, and changes that cross styled text, are returned as
/// unplaced.
export const carryTextEdits = (
  html: string,
  paragraphs: HtmlParagraph[],
  fromText: string,
  toText: string,
): { html: string; unplaced: UnplacedEdit[] } => {
  if (fromText === toText) return { html, unplaced: [] }
  const before = splitLines(fromText)
  const after = splitLines(toText)
  const beforeNormalised = before.map(normaliseParagraph)
  const paragraphsNormalised = paragraphs.map(({ text }) =>
    normaliseParagraph(text),
  )
  const edits: { from: number; to: number; text: string }[] = []
  const unplaced: UnplacedEdit[] = []

  // The paragraph of the HTML that holds line `index` of the old text: the
  // same occurrence of the same words.
  const locate = (index: number) => {
    const words = beforeNormalised[index].text
    let occurrence = beforeNormalised
      .slice(0, index)
      .filter(({ text }) => text === words).length
    const found = paragraphsNormalised.findIndex(({ text }) => {
      if (text !== words) return false
      occurrence -= 1
      return occurrence < 0
    })
    return found < 0 ? undefined : found
  }

  const change = (index: number, newLine: string) => {
    const oldWords = beforeNormalised[index]
    const newWords = normaliseParagraph(newLine)
    if (oldWords.text === newWords.text) return
    const found = locate(index)
    if (found === undefined) {
      unplaced.push({ kind: "change", text: newLine.trim() })
      return
    }
    const paragraph = paragraphs[found]
    const words = paragraphsNormalised[found]
    const length = Math.min(oldWords.text.length, newWords.text.length)
    let prefix = 0
    while (prefix < length && oldWords.text[prefix] === newWords.text[prefix]) {
      prefix += 1
    }
    let suffix = 0
    while (
      suffix < length - prefix &&
      oldWords.text[oldWords.text.length - 1 - suffix] ===
        newWords.text[newWords.text.length - 1 - suffix]
    ) {
      suffix += 1
    }
    const from = words.map[prefix]
    const to = words.map[words.text.length - suffix]
    const replacement = newLine.slice(
      newWords.map[prefix],
      newWords.map[newWords.text.length - suffix],
    )
    const segment = paragraph.segments.find(
      ({ start, decoded }) => start <= from && to <= start + decoded.length,
    )
    if (!segment) {
      unplaced.push({ kind: "change", text: newLine.trim() })
      return
    }
    edits.push({
      from: segment.rawStart + segment.rawOffsets[from - segment.start],
      to: segment.rawStart + segment.rawOffsets[to - segment.start],
      text: encodeText(replacement),
    })
  }

  const remove = (index: number) => {
    const found = locate(index)
    const element = found === undefined ? undefined : paragraphs[found].element
    if (!element) {
      unplaced.push({ kind: "remove", text: before[index].trim() })
      return
    }
    edits.push({ from: element.start, to: element.end, text: "" })
  }

  diffLines(before, after).forEach((hunk) => {
    const removed = hunk.removed.filter((index) => before[index].trim())
    const added = hunk.added.filter((index) => after[index].trim())
    removed.forEach((index, position) => {
      if (position < added.length) change(index, after[added[position]])
      else remove(index)
    })
    added.slice(removed.length).forEach((index) => {
      unplaced.push({ kind: "add", text: after[index].trim() })
    })
  })

  let result = html
  edits
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to, text }) => {
      result = result.slice(0, from) + text + result.slice(to)
    })
  return { html: result, unplaced }
}

/// The paragraphs of the plain text whose words appear nowhere in the HTML,
/// each counted once per occurrence.
export const findTextMissingFromHtml = (html: string, plaintext: string) => {
  const available = new Map<string, number>()
  parseHtmlParagraphs(html).forEach(({ text }) => {
    const words = normaliseParagraph(text).text
    available.set(words, (available.get(words) ?? 0) + 1)
  })
  return splitLines(plaintext).flatMap((line) => {
    const words = normaliseParagraph(line).text
    if (!words) return []
    const count = available.get(words) ?? 0
    if (count > 0) {
      available.set(words, count - 1)
      return []
    }
    return [{ words, line: line.trim() }]
  })
}

/// An HTML document split around its body's content; the whole of it is the
/// body when it has no `<body>` element.
export const splitHtmlBody = (html: string) => {
  const open = /<body\b[^>]*>/i.exec(html)
  const close = html.search(/<\/body\s*>/i)
  if (!open || close < open.index) return { head: "", body: html, tail: "" }
  const bodyStart = open.index + open[0].length
  return {
    head: html.slice(0, bodyStart),
    body: html.slice(bodyStart, close),
    tail: html.slice(close),
  }
}

const BLOCK_OPENING =
  /(?<!\n)(<(?:p|li|ol|ul|table|tr|h[1-6]|div|blockquote)\b)/gi

/// The HTML with each paragraph of its body on a line of its own, so it can
/// be read and edited. Whitespace between these elements does not render.
export const prettifyHtmlBody = (html: string) => {
  const { head, body, tail } = splitHtmlBody(html)
  return head + body.replace(BLOCK_OPENING, "\n$1") + tail
}
