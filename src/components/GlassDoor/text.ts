import { createInstance } from "i18next"

import copy from "@/locales/en/glassDoor.json"

// Every word the Glass Door pages show lives in src/locales/en/glassDoor.json,
// the master copy. Code picks the sentence and supplies the numbers; it holds
// no reader-facing text of its own. The file uses the app's i18next syntax:
// {{value}} placeholders, _one / _other plural forms and $t(key) references.

type Copy = typeof copy

type Join<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`

/** A plural form's key without its suffix: "market_one" is asked for as "market". */
type Base<Key extends string> = Key extends `${infer Stem}_ordinal_${string}`
  ? Stem
  : Key extends `${infer Stem}_one`
    ? Stem
    : Key extends `${infer Stem}_other`
      ? Stem
      : Key

type Leaves<Node, Prefix extends string = ""> = {
  [Key in keyof Node & string]: Key extends `_${string}`
    ? never
    : Node[Key] extends string
      ? Join<Prefix, Base<Key>>
      : Leaves<Node[Key], Join<Prefix, Key>>
}[keyof Node & string]

/** Every text in the file, by its dotted path. */
export type TextKey = Leaves<Copy>

/** The keys under a prefix, without it. */
export type Under<Prefix extends string> = TextKey extends infer Key
  ? Key extends `${Prefix}.${infer Rest}`
    ? Rest
    : never
  : never

export type TextValues = Record<string, string | number | boolean>

const NAMESPACE = "glassDoor"
const i18n = createInstance()
// Inline resources with initImmediate off make this synchronous.
i18n.init({
  lng: "en",
  fallbackLng: "en",
  ns: [NAMESPACE],
  defaultNS: NAMESPACE,
  resources: { en: { [NAMESPACE]: copy } },
  initImmediate: false,
  interpolation: { escapeValue: false },
})

/**
 * A text by a path built at run time (a metric or card id). A path the file
 * does not hold is a bug: it throws outside production, where it shows the
 * path instead.
 */
export const textAt = (key: string, values?: TextValues): string => {
  const found = i18n.t(key, values as Record<string, unknown>)
  if (found === key && process.env.NODE_ENV !== "production")
    throw new Error(`glassDoor.json has no text at "${key}"`)
  return found
}

/** The text at a path in glassDoor.json, with its values filled in. */
export const text = (key: TextKey, values?: TextValues): string =>
  textAt(key, values)

/** `text` for one section: scoped("cards.card_2_1")("sub.contractKept"). */
export const scoped =
  <Prefix extends string>(prefix: Prefix) =>
  (key: Under<Prefix>, values?: TextValues): string =>
    textAt(`${prefix}.${key}`, values)

/** Whether the file holds a text at this path (for optional texts). */
export const hasText = (key: string) => i18n.exists(key)

/** A card's section in the file: "2.1" is "cards.card_2_1". */
export const cardKey = (card: string) => `card_${card.replace(".", "_")}`

export type CardCopy = {
  name: string
  means: string
  /** Both readers in one line: "[lender] … [borrower] …". */
  tells: string
  notTells: string
}

/** The card numbers the file has copy for. */
export const CARD_IDS = Object.keys(copy.cards)
  .filter((key) => key.startsWith("card_"))
  .map((key) => key.replace(/^card_/, "").replace("_", "."))

/** A card's name and its three explanations. */
export const cardCopy = (card: string): CardCopy => ({
  name: textAt(`cards.${cardKey(card)}.name`),
  means: textAt(`cards.${cardKey(card)}.means`),
  tells: textAt(`cards.${cardKey(card)}.tells`),
  notTells: textAt(`cards.${cardKey(card)}.notTells`),
})

/** The metric ids the file names. */
export const METRIC_IDS = Object.keys(copy.metrics)

/** A metric's name, or its id when the file does not name it. */
export const metricName = (id: string) =>
  hasText(`metrics.${id}.name`) ? textAt(`metrics.${id}.name`) : id

/** A metric as the pages write it: "Late within grace now (M21)". */
export const metricLabel = (id: string) =>
  text("shared.metricLabel", { name: metricName(id), id })

/** A metric's definition: what it is, how it is computed, where from, its unit. */
export const metricDefinition = (id: string) => ({
  name: metricName(id),
  what: textAt(`metrics.${id}.what`),
  how: textAt(`metrics.${id}.how`),
  where: textAt(`metrics.${id}.where`),
  unit: textAt(`metrics.${id}.unit`),
})
