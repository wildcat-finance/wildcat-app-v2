"use client"

import { useEffect, useState } from "react"

import { metricName } from "@/components/GlassDoor/text"

import { GROUPS, metricsIn } from "./metrics"
import s from "./review.module.css"
import {
  contextFor,
  isReviewed,
  ReviewConfiguration,
  ReviewContexts,
} from "./reviewState"
import { CARD_GROUPS, cardName, TREATMENT_CARDS } from "./treatmentData"

export type ReviewView = "cards" | "metrics" | "decisions" | "preview"

const metricLabel = (id: string) => `(${id}) ${metricName(id)}`

/** The element with this id once it is in the document. */
export const useSlot = (id: string) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const find = () => {
      const element = document.getElementById(id)
      if (element) setSlot(element)
      return Boolean(element)
    }
    if (find()) return undefined
    const observer = new MutationObserver(() => {
      if (find()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [id])
  return slot
}

export const MetricNav = ({
  view,
  card,
  metric,
  review,
  contexts,
  onView,
  onCard,
  onMetric,
}: {
  view: ReviewView
  card: string
  metric: string
  review: ReviewConfiguration
  contexts: ReviewContexts
  onView: (view: ReviewView) => void
  onCard: (card: string) => void
  onMetric: (metric: string) => void
}) => {
  const [query, setQuery] = useState("")
  const [changedOnly, setChangedOnly] = useState(false)
  const metricsMode = view === "metrics"
  const needle = query.toLowerCase().trim()
  const matches = (label: string) => label.toLowerCase().includes(needle)
  return (
    <nav className={s.nav} aria-label="Review navigation">
      <div className={s.navControls}>
        <div className={s.segmented} role="group" aria-label="Browse">
          <button
            type="button"
            aria-pressed={!metricsMode}
            onClick={() => {
              onView("cards")
              setQuery("")
            }}
          >
            Cards
          </button>
          <button
            type="button"
            aria-pressed={metricsMode}
            onClick={() => {
              onView("metrics")
              setQuery("")
            }}
          >
            Metrics
          </button>
        </div>
        <input
          className={s.navSearch}
          aria-label={metricsMode ? "Search metrics" : "Search cards"}
          placeholder={metricsMode ? "Search metrics" : "Search cards"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {!metricsMode ? (
          <button
            type="button"
            role="switch"
            className={`${s.displayToggle} ${s.navFilter}`}
            aria-checked={changedOnly}
            onClick={() => setChangedOnly(!changedOnly)}
          >
            <span>Changed only</span>
            <span className={s.switchTrack} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {metricsMode
        ? GROUPS.map((group) => {
            const entries = metricsIn(group.key).filter((entry) =>
              matches(metricLabel(entry.id)),
            )
            return entries.length ? (
              <section key={group.key}>
                <h2 className={s.navGroupName}>{group.title}</h2>
                <ul className={s.namedList}>
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        aria-current={metric === entry.id ? "page" : undefined}
                        onClick={() => onMetric(entry.id)}
                      >
                        {metricLabel(entry.id)}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          })
        : CARD_GROUPS.map((group) => {
            const entries = group.cards.filter(
              (entry) =>
                matches(`(${entry}) ${cardName(entry)}`) &&
                (!changedOnly ||
                  review.picks[entry] ||
                  review.comparisons[entry] === false),
            )
            return entries.length ? (
              <section key={group.key} aria-label={`${group.label} cards`}>
                <h2 className={s.navGroupName}>{group.label}</h2>
                <ul className={s.namedList}>
                  {entries.map((entry) => (
                    <li key={entry}>
                      <button
                        type="button"
                        aria-current={
                          view === "cards" && entry === card
                            ? "page"
                            : undefined
                        }
                        onClick={() => onCard(entry)}
                      >
                        <span>
                          ({entry}) {cardName(entry)}
                        </span>
                        {isReviewed(
                          review,
                          entry,
                          contextFor(entry, contexts),
                        ) ? (
                          <span aria-label="Reviewed">✓</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          })}
      <button
        type="button"
        className={s.navDecision}
        aria-current={view === "decisions" ? "page" : undefined}
        onClick={() => onView("decisions")}
      >
        Decisions{" "}
        <span>
          {
            TREATMENT_CARDS.filter((entry) =>
              isReviewed(review, entry, contextFor(entry, contexts)),
            ).length
          }
          /{TREATMENT_CARDS.length}
        </span>
      </button>
    </nav>
  )
}
