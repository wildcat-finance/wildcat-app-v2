/// Imports an MLA downloaded from Google Docs as "Web page (.html)": its HTML
/// becomes the formatted agreement, and its text the plain text that is
/// signed. Google Docs draws clause numbers with CSS counters, so they are not
/// in the HTML's text; each list item's number is worked out here from its
/// list's `start` attribute and the stylesheet's `content` rule for the list,
/// so the signed text numbers its clauses as the reader sees them.

import { escapeHtml, normaliseTemplateText } from "./mlaTemplateText"
import {
  parseHtmlParagraphs,
  prettifyHtmlBody,
  splitHtmlBody,
} from "./mlaTextSync"

type LabelPart = { text: string } | { counter: string; style: string }

type ListItem = { start: number; end: number; label: string }

const STYLE_SHEET = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi
const LABEL_RULE =
  /\.(lst-kix_[a-z0-9]+-\d+)\s*>\s*li:before\s*\{[^}]*?content:\s*([^;}]*)/gi
const CONTENT_PART =
  /"((?:[^"\\]|\\[\s\S])*)"|counter\(\s*([\w-]+)\s*(?:,\s*([\w-]+)\s*)?\)/g
const CSS_ESCAPE = /\\(?:([0-9a-fA-F]{1,6})\s?|([\s\S]))/g
const LIST_CLASS = /\blst-kix_[a-z0-9]+-\d+\b/i
const LIST_TAG = /<(\/?)(ol|ul|li)\b([^>]*)>/gi
const CLASS_ATTRIBUTE = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
const START_ATTRIBUTE = /\bstart\s*=\s*["']?(-?\d+)/i
const GOOGLE_REDIRECT =
  /(\bhref\s*=\s*")https:\/\/www\.google\.com\/url\?q=([^"&]*)[^"]*"/gi
const LINK_TARGET = /^(?:https?:|mailto:)/i
const BULLET = String.fromCharCode(0x2022)

const fromCodePoint = (code: number) =>
  code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : String.fromCharCode(0xfffd)

const unescapeCss = (text: string) =>
  text.replace(CSS_ESCAPE, (_, hex?: string, char?: string) =>
    hex ? fromCodePoint(parseInt(hex, 16)) : char ?? "",
  )

/// How the stylesheet labels the items of each list class: Google Docs
/// writes `.lst-kix_<list>-<level>>li:before{content:"(" counter(…) ") "}`.
const findLabelFormats = (html: string) => {
  const formats = new Map<string, LabelPart[]>()
  Array.from(html.matchAll(STYLE_SHEET), (sheet) => sheet[1]).forEach((css) => {
    Array.from(css.matchAll(LABEL_RULE)).forEach(([, listClass, content]) => {
      formats.set(
        listClass,
        Array.from(
          content.matchAll(CONTENT_PART),
          ([, text, counter, style]) =>
            counter
              ? { counter, style: style ?? "decimal" }
              : { text: unescapeCss(text) },
        ),
      )
    })
  })
  return formats
}

const toLatin = (value: number) => {
  let letters = ""
  for (let rest = value; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    letters = String.fromCharCode(97 + ((rest - 1) % 26)) + letters
  }
  return letters
}

const ROMAN: [number, string][] = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
]

const toRoman = (value: number) => {
  let numeral = ""
  let rest = value
  ROMAN.forEach(([amount, symbol]) => {
    while (rest >= amount) {
      numeral += symbol
      rest -= amount
    }
  })
  return numeral
}

/// A counter's value as a CSS list style writes it.
export const formatCounter = (value: number, style: string) => {
  if (value < 1) return String(value)
  switch (style) {
    case "lower-latin":
    case "lower-alpha":
      return toLatin(value)
    case "upper-latin":
    case "upper-alpha":
      return toLatin(value).toUpperCase()
    case "lower-roman":
      return toRoman(value)
    case "upper-roman":
      return toRoman(value).toUpperCase()
    case "decimal-leading-zero":
      return String(value).padStart(2, "0")
    default:
      return String(value)
  }
}

const readClass = (attributes: string) => {
  const match = attributes.match(CLASS_ATTRIBUTE)
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").match(LIST_CLASS)?.[0]
}

/// Where each list item of the body sits in the HTML, and the number or
/// bullet a reader sees in front of it.
const findListItems = (html: string): ListItem[] => {
  const formats = findLabelFormats(html)
  const { head, body } = splitHtmlBody(html)
  const counters = new Map<string, number>()
  const lists: {
    listClass?: string
    ordered: boolean
    next: number
    open?: ListItem
  }[] = []
  const items: ListItem[] = []

  const label = (listClass: string | undefined, ordered: boolean) => {
    const value = lists[lists.length - 1].next - 1
    const parts = listClass ? formats.get(listClass) : undefined
    if (!parts) return ordered ? `${value}.` : BULLET
    return parts
      .map((part) =>
        "text" in part
          ? part.text
          : formatCounter(counters.get(part.counter) ?? 1, part.style),
      )
      .join("")
      .trim()
  }

  Array.from(body.matchAll(LIST_TAG)).forEach((match) => {
    const at = head.length + (match.index ?? 0)
    const isClosing = match[1] === "/"
    const name = match[2].toLowerCase()
    const attributes = match[3]
    const list = lists[lists.length - 1]
    if (name !== "li") {
      if (isClosing) {
        if (list?.open) list.open.end = at
        lists.pop()
        return
      }
      const start = Number(attributes.match(START_ATTRIBUTE)?.[1] ?? 1)
      lists.push({
        listClass: readClass(attributes),
        ordered: name === "ol",
        next: name === "ol" ? start : 1,
      })
      return
    }
    if (!list) return
    // An item left open ends where the next one begins.
    if (list.open) {
      list.open.end = at
      list.open = undefined
    }
    if (isClosing) return
    list.next += 1
    if (list.listClass) {
      counters.set(
        list.listClass.replace("lst-kix_", "lst-ctn-kix_"),
        list.next - 1,
      )
    }
    list.open = {
      start: at,
      end: html.length,
      label: label(list.listClass, list.ordered),
    }
    items.push(list.open)
  })
  return items
}

/// The agreement's text as a reader sees it, one paragraph to a line with a
/// blank line between: each list item's first paragraph starts with its
/// number or bullet.
export const deriveAgreementText = (html: string) => {
  const items = findListItems(html)
  const labelled = new Set<ListItem>()
  return parseHtmlParagraphs(html)
    .map(({ text, segments }) => {
      const words = text.replace(/\s+/g, " ").trim()
      const at = segments[0]?.rawStart ?? -1
      const item = items.reduce<ListItem | undefined>(
        (innermost, candidate) =>
          candidate.start < at && at < candidate.end ? candidate : innermost,
        undefined,
      )
      if (!item?.label || labelled.has(item)) return words
      labelled.add(item)
      return `${item.label} ${words}`
    })
    .join("\n\n")
}

/// Links as Google Docs exports them go through a google.com redirect; each
/// is pointed at its target instead.
export const unwrapRedirectLinks = (html: string) =>
  html.replace(GOOGLE_REDIRECT, (link, opening: string, target: string) => {
    try {
      const url = decodeURIComponent(target)
      return LINK_TARGET.test(url) ? `${opening}${escapeHtml(url)}"` : link
    } catch {
      return link
    }
  })

/// An MLA's HTML and plain text from a Google Docs "Web page (.html)"
/// download, ready to check and register as a custom MLA.
export const importMlaHtml = (source: string) => {
  const html = prettifyHtmlBody(
    unwrapRedirectLinks(normaliseTemplateText(source)),
  )
  return { html, plaintext: deriveAgreementText(html) }
}
