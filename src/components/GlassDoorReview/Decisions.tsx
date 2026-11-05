import { useRef, useState } from "react"

import { changesFromDesign } from "./options"
import s from "./review.module.css"
import {
  contextFor,
  emptyReview,
  exportReview,
  isReviewed,
  parseReview,
  ReviewConfiguration,
  ReviewContexts,
} from "./reviewState"
import {
  CARD_GROUPS,
  cardName,
  choiceText,
  chosenTreatment,
  IndexDatum,
  TREATMENT_CARDS,
  treatmentIssue,
} from "./treatmentData"

export const Decisions = ({
  review,
  contexts,
  datums,
  onChange,
  onCard,
  onMetric,
}: {
  review: ReviewConfiguration
  contexts: ReviewContexts
  datums?: Record<string, IndexDatum>
  onChange: (review: ReviewConfiguration) => void
  onCard: (card: string) => void
  onMetric: (id: string) => void
}) => {
  const [message, setMessage] = useState("")
  const [importing, setImporting] = useState(false)
  const [text, setText] = useState("")
  const undo = useRef<ReviewConfiguration>()
  const changes = changesFromDesign(review.displays, review.picks)
  const copy = async (json: boolean) => {
    const decisions = TREATMENT_CARDS.map(
      (card) =>
        `${cardName(card)} (${card}): ${choiceText(
          card,
          chosenTreatment(review.picks, card),
        )}; comparison line ${
          review.comparisons[card] === false ? "off" : "on"
        }; ${
          isReviewed(review, card, contextFor(card, contexts))
            ? "reviewed"
            : "not reviewed at this snapshot"
        }`,
    )
    try {
      await navigator.clipboard.writeText(
        json
          ? exportReview(review, contexts.market, contexts)
          : [
              ...Object.values(contexts).flatMap((context) =>
                context ? [context.label] : [],
              ),
              "",
              ...decisions,
              "",
              "Metric inspection displays",
              ...changes.metrics.map((line) => `${line.label}: ${line.text}`),
            ].join("\n"),
      )
      setMessage(json ? "Configuration copied." : "Summary copied.")
    } catch {
      setMessage("Copy failed. Use Export JSON to save the configuration.")
    }
  }
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportReview(review, contexts.market, contexts)], {
        type: "application/json",
      }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "glassdoor-review.json"
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const replace = (next: ReviewConfiguration) => {
    undo.current = review
    onChange(next)
  }
  return (
    <section className={s.decisions} aria-label="Review decisions">
      <div className={s.workspaceHead}>
        <h1>Decisions</h1>
        <span>
          {
            TREATMENT_CARDS.filter((card) =>
              isReviewed(review, card, contextFor(card, contexts)),
            ).length
          }{" "}
          / {TREATMENT_CARDS.length} reviewed
        </span>
      </div>
      <div className={s.workspaceTools}>
        <button className={s.button} onClick={() => copy(false)}>
          Copy summary
        </button>
        <button className={s.button} onClick={() => copy(true)}>
          Copy configuration
        </button>
        <button className={s.button} onClick={download}>
          Export JSON
        </button>
        <button
          className={s.button}
          onClick={() => setImporting(!importing)}
          aria-expanded={importing}
        >
          Import JSON
        </button>
        <button
          className={s.button}
          onClick={() => {
            replace(emptyReview())
            setMessage("Reset to design.")
          }}
        >
          Reset everything to design
        </button>
        {undo.current ? (
          <button
            className={s.button}
            onClick={() => {
              if (undo.current) onChange(undo.current)
              undo.current = undefined
              setMessage("Restored.")
            }}
          >
            Undo
          </button>
        ) : null}
      </div>
      <p role="status">{message}</p>
      {importing ? (
        <form
          className={s.importForm}
          onSubmit={(event) => {
            event.preventDefault()
            try {
              const next = parseReview(text)
              replace(next)
              setImporting(false)
              setMessage("Configuration imported.")
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Import failed.",
              )
            }
          }}
        >
          <label>
            Review configuration
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={262145}
              rows={9}
            />
          </label>
          <button className={s.button} type="submit">
            Apply configuration
          </button>
          <button
            className={s.button}
            type="button"
            onClick={() => setImporting(false)}
          >
            Cancel
          </button>
        </form>
      ) : null}
      {CARD_GROUPS.map((group) => (
        <div className={s.tableScroll} key={group.key}>
          <table className={s.decisionTable}>
            <caption>{group.label}</caption>
            <thead>
              <tr>
                <th>Card</th>
                <th>Choice</th>
                <th>Comparison line</th>
                <th>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {group.cards.map((card) => {
                const code = chosenTreatment(review.picks, card)
                const issue =
                  code && datums?.[card]
                    ? treatmentIssue(code, datums[card])
                    : undefined
                return (
                  <tr key={card}>
                    <td>
                      <button
                        className={s.resetLink}
                        onClick={() => onCard(card)}
                      >
                        {cardName(card)} ({card})
                      </button>
                    </td>
                    <td>
                      {choiceText(card, code)}
                      {issue ? <p className={s.error}>{issue}</p> : null}
                    </td>
                    <td>{review.comparisons[card] === false ? "Off" : "On"}</td>
                    <td>
                      {isReviewed(review, card, contextFor(card, contexts)) &&
                      !issue
                        ? "Reviewed"
                        : "Pending"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      <details className={s.decisionDetails}>
        <summary>Metric inspection changes ({changes.metrics.length})</summary>
        <ul>
          {changes.metrics.map((line) => (
            <li key={line.id}>
              <button className={s.resetLink} onClick={() => onMetric(line.id)}>
                {line.label}
              </button>
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      </details>
      <details className={s.decisionDetails}>
        <summary>Last reviewed</summary>
        <ul>
          {Object.entries(review.reviewed).map(([card, entry]) => (
            <li key={card}>
              <b>
                {cardName(card)} ({card})
              </b>
              <span>{entry.context.label}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
