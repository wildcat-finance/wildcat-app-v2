// Temporary: the metric review page (product#917). Remove with the page.
//
// Display options per metric and their toggle states. States live in this
// browser only, under their own key, so the live analytics never read them.

import { metric as metricLabel } from "@/components/GlassDoor/wording"

import { SPEC_METRICS } from "./catalogue"
import { designDefault } from "./design"
import { GROUPS, groupOf } from "./metrics"

export type OptionKey = "value" | "card" | "chart" | "comparison"

export const DISPLAY_OPTIONS: { key: OptionKey; label: string }[] = [
  { key: "value", label: "Value" },
  { key: "card", label: "Card" },
  { key: "chart", label: "Chart" },
  { key: "comparison", label: "Comparison" },
]

/** A metric with no saved state starts from what the design shows for it. */
const DEFAULTS = new Map(
  SPEC_METRICS.map((metric) => [metric.id, designDefault(metric)]),
)
export const defaultOn = (id: string): OptionKey[] =>
  DEFAULTS.get(id) ?? ["value"]

export const STORAGE_KEY = "glassdoor-review:toggles:v1"

/** Options switched on, per metric id; a missing id uses its default. */
export type Toggles = Record<string, OptionKey[]>

/** Keeps known options only, in display order. */
const clean = (raw: unknown): Toggles => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([, on]) => Array.isArray(on))
      .map(([id, on]) => [
        id,
        DISPLAY_OPTIONS.map((option) => option.key).filter((key) =>
          (on as unknown[]).includes(key),
        ),
      ]),
  )
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

const browserStore = (): Store | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

/** Saved states, or none when storage is blocked or holds something else. */
export const loadToggles = (store: Store | undefined = browserStore()) => {
  try {
    const text = store?.getItem(STORAGE_KEY)
    return text ? clean(JSON.parse(text)) : {}
  } catch {
    return {}
  }
}

/** Writes the states; false when this browser refuses to store them. */
export const saveToggles = (
  toggles: Toggles,
  store: Store | undefined = browserStore(),
) => {
  if (!store) return false
  try {
    if (Object.keys(toggles).length)
      store.setItem(STORAGE_KEY, JSON.stringify(toggles))
    else store.removeItem(STORAGE_KEY)
    return true
  } catch {
    // Storage is a convenience here; the page works without it.
    return false
  }
}

export const optionsOn = (toggles: Toggles, id: string) =>
  toggles[id] ?? defaultOn(id)

export const isOn = (toggles: Toggles, id: string, key: OptionKey) =>
  optionsOn(toggles, id).includes(key)

export const setOption = (
  toggles: Toggles,
  ids: string[],
  key: OptionKey,
  on: boolean,
): Toggles => {
  const next = { ...toggles }
  ids.forEach((id) => {
    const current = new Set(optionsOn(toggles, id))
    if (on) current.add(key)
    else current.delete(key)
    next[id] = DISPLAY_OPTIONS.map((option) => option.key).filter((option) =>
      current.has(option),
    )
  })
  return next
}

export type SummaryLine = {
  id: string
  label: string
  options: string[]
  /** The options differ from the metric's design default. */
  changed: boolean
}

const sameOptions = (left: OptionKey[], right: OptionKey[]) =>
  left.length === right.length && left.every((key, i) => key === right[i])

/** Whether a metric shows exactly its design default. */
export const isDefault = (toggles: Toggles, id: string) =>
  sameOptions(optionsOn(toggles, id), defaultOn(id))

/** Back to the design default for some metrics. */
export const resetOptions = (toggles: Toggles, ids: string[]): Toggles => {
  const next = { ...toggles }
  ids.forEach((id) => delete next[id])
  return next
}

const lineOf = (toggles: Toggles, id: string): SummaryLine => {
  const on = optionsOn(toggles, id)
  return {
    id,
    label: metricLabel(id),
    options: DISPLAY_OPTIONS.filter((option) => on.includes(option.key)).map(
      (option) => option.label,
    ),
    changed: !sameOptions(on, defaultOn(id)),
  }
}

/**
 * Per group, in spec order: the metrics with an option on, and the metrics
 * with none (dropped).
 */
export const summary = (toggles: Toggles) =>
  GROUPS.map((group) => {
    const all = SPEC_METRICS.filter(
      (spec) => groupOf(spec.id) === group.key,
    ).map((spec) => lineOf(toggles, spec.id))
    return {
      ...group,
      lines: all.filter((line) => line.options.length > 0),
      off: all.filter((line) => line.options.length === 0),
    }
  })

/** How many metrics have each option on, and how many differ from the design. */
export const optionCounts = (toggles: Toggles) => ({
  options: DISPLAY_OPTIONS.map((option) => ({
    label: option.label,
    count: SPEC_METRICS.filter((spec) => isOn(toggles, spec.id, option.key))
      .length,
  })),
  changed: SPEC_METRICS.filter((spec) => lineOf(toggles, spec.id).changed)
    .length,
})

export const countsText = (toggles: Toggles) => {
  const counts = optionCounts(toggles)
  return `On: ${counts.options
    .map((option) => `${option.label} ${option.count}`)
    .join(" · ")}. Changed from the design default: ${counts.changed}.`
}

/** The summary as plain text, to paste into the issue. */
export const summaryText = (toggles: Toggles, context: string[] = []) =>
  [
    "Glass Door metric review: metrics and display options on (product#917)",
    ...context,
    countsText(toggles),
    ...summary(toggles).flatMap((group) => [
      "",
      `${group.title} (${group.lines.length} with an option on)`,
      ...group.lines.map(
        (line) =>
          `- ${line.label}: ${line.options.join(", ")}${
            line.changed ? " (changed)" : ""
          }`,
      ),
      `No display (${group.off.length}): ${
        group.off.length
          ? group.off.map((line) => line.label).join("; ")
          : "none"
      }`,
    ]),
  ].join("\n")
