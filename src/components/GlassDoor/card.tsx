import * as React from "react"
import { useEffect, useId, useRef, useState } from "react"

import styles from "./analytics.module.css"
import { Tone, Verdict } from "./rules"
import { CARDS, CHIPS } from "./wording"

// The seven-field analytics card, its expanded panel and the row that shares
// one panel (product#908 handoff, AnalyticsCard.tsx), wired to app data.

export type ChipKey = "median" | "markets" | "borrower"

export type CardSpec = {
  /** Card number from the spec, such as "2.1"; it selects the card's copy. */
  id: keyof typeof CARDS
  page: "market" | "borrower"
  /** Metric ids behind the card, as the spec lists them. */
  ids: string
  kind: "score" | "pct" | "count" | "text" | "state"
  value: string
  verdict: Verdict | null
  state?: Tone
  /** A chip beside the value: the 2.5 penalty flag, or FINISHED. */
  flag?: string
  flagTone?: "watch" | "neutral"
  sub: string
  compare: string
  /** Operands named, values substituted, one line per step. */
  formula: string
  numbers: string
  chips: Record<ChipKey, string>
  /** A visual under a chip's text, such as the rank under "vs all markets". */
  chipCharts?: Partial<Record<ChipKey, React.ReactNode>>
  chart?: { collapsed?: React.ReactNode; expanded?: React.ReactNode }
}

const VERDICT_CLASS: Record<Verdict, string> = {
  STRONG: styles.verdictStrong,
  WATCH: styles.verdictWatch,
  PROBLEM: styles.verdictProblem,
  LIMITED: styles.verdictLimited,
}
const STATE_CLASS: Record<Tone, string> = {
  green: styles.stateGreen,
  amber: styles.stateAmber,
  red: styles.stateRed,
  neutral: styles.stateNeutral,
}
const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ")

export const VerdictChip = ({ verdict }: { verdict: Verdict }) => (
  <span className={cx(styles.verdict, VERDICT_CLASS[verdict])}>{verdict}</span>
)

export const AnalyticsCard = ({
  spec,
  open,
  onToggle,
  id,
  controls,
}: {
  spec: CardSpec
  open: boolean
  onToggle: (button: HTMLButtonElement) => void
  id?: string
  controls?: string
}) => {
  const copy = CARDS[spec.id]
  return (
    <button
      type="button"
      id={id}
      className={cx(styles.card, open && styles.cardOpen)}
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      data-card={spec.id}
      onClick={(event) => onToggle(event.currentTarget)}
    >
      <span className={styles.cardHead}>
        <span className={styles.cardName}>{copy.name}</span>
        <span className={styles.help} title={copy.means} aria-hidden="true">
          ?
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? "⌃" : "⌄"}
        </span>
      </span>
      {spec.kind === "state" ? (
        <span
          className={cx(styles.state, STATE_CLASS[spec.state ?? "neutral"])}
        >
          {spec.value}
        </span>
      ) : (
        <span className={styles.valueRow}>
          <span
            className={cx(
              styles.value,
              spec.kind === "text" && styles.valueText,
            )}
          >
            {spec.value}
          </span>
          {spec.verdict ? <VerdictChip verdict={spec.verdict} /> : null}
          {spec.flag ? (
            <span
              className={cx(
                styles.verdict,
                spec.flagTone === "neutral"
                  ? styles.verdictLimited
                  : styles.verdictWatch,
              )}
            >
              {spec.flag}
            </span>
          ) : null}
        </span>
      )}
      {spec.sub ? <span className={styles.sub}>{spec.sub}</span> : null}
      {spec.compare ? (
        <span className={styles.compare}>{spec.compare}</span>
      ) : null}
      {spec.chart?.collapsed ? (
        <span className={styles.cardChart} aria-hidden="true">
          {spec.chart.collapsed}
        </span>
      ) : null}
    </button>
  )
}

export const AnalyticsPanel = ({
  spec,
  chip,
  onChip,
  onClose,
  id,
}: {
  spec: CardSpec
  chip: ChipKey
  onChip: (key: ChipKey) => void
  onClose: () => void
  id?: string
}) => {
  const copy = CARDS[spec.id]
  const nameId = useId()
  const chipTextId = useId()
  const chips: [ChipKey, string][] =
    spec.page === "market"
      ? [
          ["median", CHIPS.market.median],
          ["markets", CHIPS.market.markets],
          ["borrower", CHIPS.market.borrower],
        ]
      : [
          ["median", CHIPS.borrower.median],
          ["markets", CHIPS.borrower.borrowers],
          ["borrower", CHIPS.borrower.range],
        ]
  return (
    <section id={id} className={styles.panel} aria-labelledby={nameId}>
      <div className={styles.panelHead}>
        <h4 className={styles.panelTitle}>
          <span id={nameId}>{copy.name}</span>{" "}
          <span className={styles.panelId}>{spec.id}</span>{" "}
          <span className={styles.panelIds}>{spec.ids}</span>
        </h4>
        <button
          type="button"
          className={styles.panelClose}
          aria-label={`Close ${copy.name}`}
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className={styles.panelGrid}>
        <div className={styles.panelCalc}>
          <h5 className={styles.label}>How it is calculated</h5>
          <pre className={styles.formula}>
            {spec.formula.split("\n").map((line) => (
              <span key={line} className={styles.formulaLine}>
                {line}
              </span>
            ))}
          </pre>
          <p className={styles.numbers}>{spec.numbers}</p>
          {spec.chart?.expanded ? (
            <div className={styles.panelChart}>{spec.chart.expanded}</div>
          ) : null}
        </div>
        <div className={styles.panelRight}>
          <h5 className={styles.label}>What it means</h5>
          <p className={styles.means}>{copy.means}</p>
          <h5 className={styles.label}>What it tells you</h5>
          <p className={styles.tells}>{copy.tells}</p>
          <h5 className={styles.label}>What it does not tell you</h5>
          <p className={styles.notTells}>{copy.notTells}</p>
        </div>
        <div className={styles.panelCompare}>
          <h5 className={styles.label}>Comparison</h5>
          <div
            className={styles.chips}
            role="group"
            aria-label={`Compare ${copy.name}`}
          >
            {chips.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={cx(styles.chip, chip === key && styles.chipOn)}
                aria-pressed={chip === key}
                aria-controls={chipTextId}
                onClick={() => onChip(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <p id={chipTextId} className={styles.chipText} aria-live="polite">
            {spec.chips[chip]}
          </p>
          {spec.chipCharts?.[chip] ? (
            <div className={styles.panelChart}>{spec.chipCharts[chip]}</div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/** The grid's rendered column count, so a panel can follow its card's row. */
const useColumns = (
  grid: React.RefObject<HTMLDivElement | null>,
  fallback: number,
) => {
  const [columns, setColumns] = useState(fallback)
  useEffect(() => {
    const element = grid.current
    if (!element || typeof ResizeObserver === "undefined") return undefined
    const measure = () => {
      const tracks = getComputedStyle(element)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length
      if (tracks) setColumns(tracks)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [grid])
  return columns
}

/**
 * One row of cards with one shared panel; one open at a time. The panel sits
 * directly under the open card's visual row, so on narrow layouts it opens
 * next to the card rather than below every card.
 */
export const AnalyticsCardRow = ({
  specs,
  columns = 5,
  initialOpen,
  label,
}: {
  specs: CardSpec[]
  columns?: 4 | 5
  initialOpen?: string
  label: string
}) => {
  const [openId, setOpenId] = useState<string | undefined>(initialOpen)
  const [chip, setChip] = useState<ChipKey>("median")
  const opener = useRef<HTMLButtonElement | null>(null)
  const userOpened = useRef(false)
  const grid = useRef<HTMLDivElement>(null)
  const scope = useRef<HTMLDivElement>(null)
  const rowId = useId()
  const panelId = `${rowId}-panel`
  const tracks = useColumns(grid, specs.length)
  const openIndex = specs.findIndex((spec) => spec.id === openId)
  const open = specs[openIndex]
  const rowEnd =
    openIndex < 0
      ? -1
      : Math.min(
          specs.length - 1,
          Math.floor(openIndex / tracks) * tracks + tracks - 1,
        )
  const buttonId = (id: string) => `${rowId}-${id.replace(".", "-")}`
  const close = () => {
    const button =
      opener.current ??
      (openId ? document.getElementById(buttonId(openId)) : null)
    setOpenId(undefined)
    button?.focus()
  }
  const closeRef = useRef(close)
  closeRef.current = close
  // Escape anywhere in this row or its panel closes the panel.
  useEffect(() => {
    if (!openId) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        scope.current?.contains(event.target as Node)
      ) {
        event.preventDefault()
        closeRef.current()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [openId])
  // A panel the reader opened is brought into view; the default one is not.
  useEffect(() => {
    if (!openId || !userOpened.current) return
    userOpened.current = false
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      ?.matches
    requestAnimationFrame(
      () =>
        document.getElementById(panelId)?.scrollIntoView?.({
          block: "nearest",
          behavior: reduce ? "auto" : "smooth",
        }),
    )
  }, [openId, panelId])
  return (
    <div ref={scope} className={styles.rowScope}>
      <div
        ref={grid}
        className={cx(styles.grid, columns === 4 && styles.grid4)}
        role="group"
        aria-label={label}
      >
        {specs.map((spec, index) => (
          <React.Fragment key={spec.id}>
            <AnalyticsCard
              id={buttonId(spec.id)}
              controls={panelId}
              spec={spec}
              open={spec.id === openId}
              onToggle={(button) => {
                opener.current = button
                userOpened.current = spec.id !== openId
                setOpenId(spec.id === openId ? undefined : spec.id)
                setChip("median")
              }}
            />
            {open && index === rowEnd ? (
              <AnalyticsPanel
                id={panelId}
                spec={open}
                chip={chip}
                onChip={setChip}
                onClose={close}
              />
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
