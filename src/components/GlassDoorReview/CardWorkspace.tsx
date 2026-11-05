import { useState } from "react"

import { CardSpec } from "@/components/GlassDoor/card"

import s from "./review.module.css"
import { isReviewed, ReviewConfiguration, ReviewContext } from "./reviewState"
import {
  cardName,
  cardScope,
  CARD_GROUPS,
  chosenTreatment,
  DESIGN_TREATMENT,
  IndexDatum,
  referenceReason,
  TREATMENT_CODES,
  TreatmentCode,
  treatmentIssue,
  TREATMENTS,
} from "./treatmentData"
import { CardPreview, ReferencePreview, TreatmentTile } from "./treatments"
import t from "./treatments.module.css"

export const CardWorkspace = ({
  card,
  datum,
  spec,
  reason,
  review,
  context,
  onCard,
  onChoose,
  onComparison,
  onReviewed,
  onPreview,
}: {
  card: string
  datum?: IndexDatum
  spec?: CardSpec
  reason: string
  review: ReviewConfiguration
  context?: ReviewContext
  onCard: (card: string) => void
  onChoose: (card: string, code?: TreatmentCode) => void
  onComparison: (card: string, on: boolean) => void
  onReviewed: (card: string, on: boolean) => void
  onPreview: () => void
}) => {
  const [view, setView] = useState<"compare" | "all">("compare")
  const [width, setWidth] = useState(260)
  const [shortlists, setShortlists] = useState<Record<string, TreatmentCode[]>>(
    {},
  )
  const chosen = chosenTreatment(review.picks, card)
  const available = datum
    ? TREATMENT_CODES.filter((code) => !treatmentIssue(code, datum))
    : []
  const missing = datum
    ? TREATMENT_CODES.filter(
        (code) => treatmentIssue(code, datum) && !referenceReason(card, code),
      )
    : []
  const reference = TREATMENT_CODES.filter((code) =>
    referenceReason(card, code),
  )
  const defaultCandidates = [
    ...new Set(
      [chosen, ...available].filter((code): code is TreatmentCode =>
        Boolean(code && code !== DESIGN_TREATMENT[card]),
      ),
    ),
  ].slice(0, 2)
  const compareLine = review.comparisons[card] !== false
  const hasSelection = Boolean(review.picks[card]) || !compareLine
  const candidates = (shortlists[card] ?? defaultCandidates)
    .filter((code) => !hasSelection || code !== chosen)
    .slice(hasSelection ? -1 : -2)
  const issue = chosen && datum ? treatmentIssue(chosen, datum) : undefined
  const canReview = Boolean(spec && datum && context && !issue)
  const shortlist = (code: TreatmentCode) => {
    if (hasSelection && code === chosen) return
    const next = candidates.includes(code)
      ? candidates.filter((entry) => entry !== code)
      : [...candidates, code].slice(-2)
    setShortlists((current) => ({ ...current, [card]: next }))
  }
  const group = CARD_GROUPS.find((entry) => entry.key === cardScope(card))!
  const position = group.cards.indexOf(card)
  return (
    <section
      className={t.workspace}
      aria-label={`${cardName(card)} (${card})`}
      style={{ "--preview-width": `${width}px` } as React.CSSProperties}
    >
      <div className={s.workspaceHead}>
        <h1>
          {cardName(card)} ({card})
        </h1>
        <div className={t.actions}>
          <button
            type="button"
            className={s.button}
            disabled={position === 0}
            onClick={() => onCard(group.cards[position - 1])}
          >
            Previous
          </button>
          <button
            type="button"
            className={s.button}
            disabled={position === group.cards.length - 1}
            onClick={() => onCard(group.cards[position + 1])}
          >
            Next
          </button>
          <button type="button" className={s.button} onClick={onPreview}>
            Page preview
          </button>
        </div>
      </div>
      <div className={s.workspaceTools}>
        <div className={s.segmented} role="group" aria-label="Treatment view">
          <button
            type="button"
            aria-pressed={view === "compare"}
            onClick={() => setView("compare")}
          >
            Compare
          </button>
          <button
            type="button"
            aria-pressed={view === "all"}
            onClick={() => setView("all")}
          >
            All treatments
          </button>
        </div>
        <label className={s.inlineField}>
          Card width{" "}
          <select
            aria-label="Card width"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          >
            <option value={220}>220 px</option>
            <option value={260}>260 px</option>
            <option value={320}>320 px</option>
          </select>
        </label>
        <label className={s.inlineField}>
          <input
            type="checkbox"
            checked={compareLine}
            onChange={(event) => onComparison(card, event.target.checked)}
          />
          Comparison line
        </label>
        <label className={s.inlineField}>
          <input
            type="checkbox"
            disabled={!canReview}
            checked={isReviewed(review, card, context)}
            onChange={(event) => onReviewed(card, event.target.checked)}
          />
          Reviewed
        </label>
      </div>
      {!datum || !spec ? (
        <p role="status">{reason}</p>
      ) : (
        <>
          {issue ? (
            <p role="status" className={s.error}>
              Chosen {chosen}: {issue} Choose another treatment to complete this
              review.
            </p>
          ) : null}
          {view === "compare" ? (
            <>
              <div className={t.compareRow}>
                <article className={t.candidate} aria-label="Original design">
                  <div className={t.candidateHead}>
                    <b>Original design</b>
                    {!hasSelection ? <span>Chosen</span> : null}
                  </div>
                  <CardPreview spec={spec} datum={datum} />
                  <div className={t.actions}>
                    <button
                      type="button"
                      className={s.button}
                      disabled={!review.picks[card] && compareLine}
                      onClick={() => {
                        onChoose(card)
                        onComparison(card, true)
                      }}
                    >
                      Restore design
                    </button>
                  </div>
                </article>
                {hasSelection ? (
                  <article
                    className={`${t.candidate} ${t.candidateChosen}`}
                    aria-label="Selected setup"
                  >
                    <div className={t.candidateHead}>
                      <b>
                        {chosen
                          ? `${chosen} · ${TREATMENTS[chosen].label}`
                          : "Design"}
                      </b>
                      <span>Chosen</span>
                    </div>
                    <CardPreview
                      spec={spec}
                      datum={datum}
                      code={chosen}
                      comparison={compareLine}
                    />
                  </article>
                ) : null}
                {candidates.map((code) => (
                  <TreatmentTile
                    key={`${card}-${code}`}
                    code={code}
                    datum={datum}
                    spec={spec}
                    chosen={code === chosen}
                    comparison={compareLine}
                    onChoose={(next) => onChoose(card, next)}
                  />
                ))}
              </div>
              <div
                className={t.shortlist}
                role="group"
                aria-label="Compare up to two treatments"
              >
                {available.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={s.button}
                    aria-pressed={
                      candidates.includes(code) ||
                      (hasSelection && chosen === code)
                    }
                    disabled={hasSelection && chosen === code}
                    onClick={() => shortlist(code)}
                  >
                    {code} · {TREATMENTS[code].label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={t.gallery}>
              {available.map((code) => (
                <TreatmentTile
                  key={`${card}-${code}`}
                  code={code}
                  datum={datum}
                  spec={spec}
                  chosen={code === chosen}
                  comparison={compareLine}
                  shortlisted={candidates.includes(code)}
                  onShortlist={shortlist}
                  onChoose={(next) => onChoose(card, next)}
                />
              ))}
            </div>
          )}
          {missing.length ? (
            <details className={t.referenceList}>
              <summary>Unavailable ({missing.length})</summary>
              {missing.map((code) => (
                <div key={code}>
                  <b>
                    {code} · {TREATMENTS[code].label}
                  </b>
                  <CardPreview datum={datum} code={code} />
                </div>
              ))}
            </details>
          ) : null}
          {reference.length ? (
            <details className={t.referenceList}>
              <summary>Reference only ({reference.length})</summary>
              {reference.map((code) => (
                <div key={code}>
                  <b>
                    {code} · {TREATMENTS[code].label}
                  </b>
                  <p>{referenceReason(card, code)}</p>
                  <ReferencePreview code={code} datum={datum} />
                </div>
              ))}
            </details>
          ) : null}
        </>
      )}
    </section>
  )
}
