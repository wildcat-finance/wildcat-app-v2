// One portable configuration for previews, decisions and handoff.
import { Publication } from "@/components/GlassDoor/api"
import { block, longDate } from "@/components/GlassDoor/format"

import { SPEC_METRICS } from "./catalogue"
import {
  availableOn,
  loadPicks,
  loadToggles,
  OptionKey,
  optionsOn,
  Toggles,
} from "./options"
import {
  choose,
  cardScope,
  ReviewScope,
  referenceReason,
  TREATMENT_CARDS,
  TREATMENT_CODES,
  TreatmentCode,
  TreatmentPicks,
} from "./treatmentData"

export const REVIEW_KEY = "glassdoor-review:configuration:v1"
export type ReviewContext = { identity: string; label: string }
export type ReviewContexts = Partial<Record<ReviewScope, ReviewContext>>
export const contextFor = (card: string, contexts: ReviewContexts) =>
  contexts[cardScope(card)]
export const publicationContext = (
  entity: { chainId: number; address: string },
  publication: Publication,
  label: string,
): ReviewContext | undefined =>
  publication.cut
    ? {
        identity: `${entity.chainId}:${entity.address}:${publication.id}:${publication.cut.hash}`,
        label: `${label} · publication ${publication.kind} · block ${block(
          publication.cut.block,
        )} · ${longDate(publication.cut.timestamp)}`,
      }
    : undefined
export type ReviewConfiguration = {
  version: 1
  displays: Toggles
  picks: TreatmentPicks
  comparisons: Record<string, boolean>
  reviewed: Record<string, { selection: string; context: ReviewContext }>
}
export const emptyReview = (): ReviewConfiguration => ({
  version: 1,
  displays: {},
  picks: {},
  comparisons: {},
  reviewed: {},
})
export const selectionKey = (review: ReviewConfiguration, card: string) =>
  `${review.picks[card] ?? "design"}:${review.comparisons[card] !== false}`
export const isReviewed = (
  review: ReviewConfiguration,
  card: string,
  context?: ReviewContext,
) =>
  Boolean(
    context &&
      review.reviewed[card]?.selection === selectionKey(review, card) &&
      review.reviewed[card]?.context.identity === context.identity,
  )
export const changeChoice = (
  review: ReviewConfiguration,
  card: string,
  code?: TreatmentCode,
) => {
  const picks = code ? choose(review.picks, card, code) : { ...review.picks }
  if (!code) delete picks[card]
  if (picks[card] === review.picks[card]) return review
  const reviewed = { ...review.reviewed }
  delete reviewed[card]
  return { ...review, picks, reviewed }
}
export const changeComparison = (
  review: ReviewConfiguration,
  card: string,
  on: boolean,
) => {
  const reviewed = { ...review.reviewed }
  delete reviewed[card]
  return {
    ...review,
    comparisons: { ...review.comparisons, [card]: on },
    reviewed,
  }
}
export const markReviewed = (
  review: ReviewConfiguration,
  card: string,
  context: ReviewContext,
  on: boolean,
) => {
  const reviewed = { ...review.reviewed }
  if (on) reviewed[card] = { selection: selectionKey(review, card), context }
  else delete reviewed[card]
  return { ...review, reviewed }
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))
const fail = (): never => {
  throw new Error(
    "Invalid review configuration. Export a configuration from this page and try again.",
  )
}
/** Strict imports: reject unknown IDs, unsupported options and reference choices. */
export const parseReview = (
  text: string,
  allowLegacyReference = false,
): ReviewConfiguration => {
  if (text.length > 262144) throw new Error("The configuration exceeds 256 KB.")
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("Enter valid JSON.")
  }
  if (!object(raw) || raw.version !== 1) return fail()
  const result = emptyReview()
  if (
    !object(raw.displays) ||
    !object(raw.picks) ||
    !object(raw.comparisons) ||
    !object(raw.reviewed)
  )
    return fail()
  Object.entries(raw.displays).forEach(([id, options]) => {
    if (
      !SPEC_METRICS.some((metric) => metric.id === id) ||
      !Array.isArray(options) ||
      (!allowLegacyReference &&
        options.some((option) => !availableOn(id).includes(option)))
    )
      fail()
    result.displays[id] = availableOn(id).filter((option) =>
      (options as OptionKey[]).includes(option),
    )
  })
  Object.entries(raw.picks).forEach(([card, code]) => {
    if (
      !TREATMENT_CARDS.includes(card) ||
      !TREATMENT_CODES.includes(code as TreatmentCode) ||
      (!allowLegacyReference && referenceReason(card, code as TreatmentCode))
    )
      fail()
    result.picks = choose(result.picks, card, code as TreatmentCode)
  })
  Object.entries(raw.comparisons).forEach(([card, on]) => {
    if (!TREATMENT_CARDS.includes(card) || typeof on !== "boolean") fail()
    result.comparisons[card] = on as boolean
  })
  Object.entries(raw.reviewed).forEach(([card, entry]) => {
    if (
      !TREATMENT_CARDS.includes(card) ||
      !object(entry) ||
      typeof entry.selection !== "string" ||
      !object(entry.context) ||
      typeof entry.context.identity !== "string" ||
      typeof entry.context.label !== "string"
    )
      return fail()
    if (entry.selection === selectionKey(result, card))
      result.reviewed[card] = {
        selection: entry.selection,
        context: {
          identity: entry.context.identity,
          label: entry.context.label,
        },
      }
    return undefined
  })
  return result
}
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">
export const loadReview = (store: Store): ReviewConfiguration => {
  const saved = store.getItem(REVIEW_KEY)
  if (saved) return parseReview(saved, true)
  const review = emptyReview()
  const legacy = loadToggles(store)
  review.displays = Object.fromEntries(
    SPEC_METRICS.filter((metric) => legacy[metric.id]).map((metric) => [
      metric.id,
      optionsOn(legacy, metric.id),
    ]),
  )
  // Preserve legacy choices, including ones that now need a replacement.
  review.picks = loadPicks(store)
  return review
}
export const exportReview = (
  review: ReviewConfiguration,
  context?: ReviewContext,
  contexts?: ReviewContexts,
) => JSON.stringify({ ...review, context, contexts }, null, 2)
