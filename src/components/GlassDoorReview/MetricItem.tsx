// Temporary: the metric review page (product#917). Remove with the page.
// One metric: its value beside its name, the displays the design can give it,
// and the spec behind a closed section.

import * as React from "react"
import { memo, useEffect, useId, useRef, useState } from "react"

import gd from "@/components/GlassDoor/analytics.module.css"
import {
  AnalyticsCard,
  AnalyticsPanel,
  CardSpec,
  ChipKey,
} from "@/components/GlassDoor/card"
import {
  DirectionPending,
  LateShareBars,
  LateShareRow,
  RankStrip,
  Tbd,
} from "@/components/GlassDoor/charts"
import { count, isNumber } from "@/components/GlassDoor/format"
import { metric as metricLabel } from "@/components/GlassDoor/wording"

import { SpecMetric } from "./catalogue"
import { Chevron } from "./Chevron"
import { cardsOf, DesignRole, designRole, HEADLINES } from "./design"
import {
  cardCopy,
  comparisonOf,
  comparisonText,
  groupOf,
  PLACES,
  recordGap,
  ReviewData,
  shownValue,
} from "./metrics"
import { availableOn, defaultOn, DISPLAY_OPTIONS, OptionKey } from "./options"
import s from "./review.module.css"
import {
  chosenTreatment,
  IndexDatum,
  TreatmentCode,
  TreatmentPicks,
  TREATMENTS,
} from "./treatmentData"
import { CardPreview } from "./treatments"

const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ")

/** Live cards for the selection, by card number, and the 3.12 rows. */
export type CardSet = {
  market?: Record<string, CardSpec>
  borrower?: Record<string, CardSpec>
  trouble?: LateShareRow[]
  /** A finished market drops card 2.6. */
  closed?: boolean
  /** Index datums for the display treatments, by market card number. */
  treatments?: Record<string, IndexDatum>
  picks?: TreatmentPicks
  comparisons?: Record<string, boolean>
}

const TROUBLE = "3.12"
const LOADING = "loading…"

/** Every display: its label above its box, so box tops line up. */
const Display = ({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) => (
  <div className={cx(s.display, className)}>
    <span className={s.displayLabel}>{label}</span>
    {children}
  </div>
)

/** A display the selection cannot draw, with the reason. */
const NoteDisplay = ({
  label,
  text,
  className = s.tbdDisplay,
}: {
  label: string
  text: string
  className?: string
}) => (
  <Display label={label} className={className}>
    <div className={cx(s.box, s.tbdBox)}>
      <span className={s.tbd}>{text}</span>
    </div>
  </Display>
)

/** The card's record, or why it cannot be drawn. */
export const cardFor = (
  card: string,
  data: ReviewData,
  cards: CardSet,
): { spec: CardSpec } | { reason: string } => {
  const market = card.startsWith("2.")
  const specs = market ? cards.market : cards.borrower
  if (!specs) {
    const gap = recordGap(
      market ? data.market : data.borrower,
      market ? "market" : "borrower",
    )
    return { reason: gap?.kind === "tbd" ? gap.reason : LOADING }
  }
  const spec = specs[card]
  if (spec) return { spec }
  if (card === "2.6" && cards.closed)
    return { reason: "Hidden: card 2.6 is not shown for finished markets" }
  return { reason: `Not built: card ${card} has no live version yet` }
}

const placesOf = (metric: SpecMetric) =>
  metric.cards.filter((card) => PLACES[card]).map((card) => PLACES[card])

/** The value beside the name; the unrounded value shows on hover or focus. */
const ValueInline = ({
  metric,
  data,
}: {
  metric: SpecMetric
  data: ReviewData
}) => {
  const tipId = useId()
  const shown = shownValue(metric, data)
  if (shown.kind === "loading")
    return <span className={s.valueNote}>{LOADING}</span>
  if (shown.kind === "tbd")
    return <span className={s.valueNote}>{shown.reason}</span>
  // Words read smaller than numbers (names, labels, type labels).
  const valueClass = cx(s.value, !isNumber(shown.raw) && s.valueText)
  const raw = shown.raw === undefined ? undefined : String(shown.raw)
  if (raw === undefined) return <span className={valueClass}>{shown.text}</span>
  return (
    <span className={s.valueTip}>
      <span
        className={valueClass}
        // Focusable so keyboard users can reach the tooltip too.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        aria-describedby={tipId}
      >
        {shown.text}
      </span>
      <span id={tipId} role="tooltip" className={s.tip}>
        raw computed value: {raw}
      </span>
    </span>
  )
}

const ComparisonDisplay = ({
  metric,
  data,
}: {
  metric: SpecMetric
  data: ReviewData
}) => {
  const comparison = comparisonOf(metric, data)
  const text = comparisonText(metric, data)
  if (!comparison) return <NoteDisplay label="Comparison" text={text} />
  const noun = groupOf(metric.id) === "market" ? "markets" : "borrowers"
  return (
    <Display label="Comparison" className={s.compareDisplay}>
      <div className={cx(gd.root, s.box)}>
        <span>{text}</span>
        {comparison.betterThan === undefined ? null : (
          <RankStrip
            position={comparison.betterThan}
            population={comparison.population}
            label={`Better than ${count(comparison.betterThan)} of ${count(
              comparison.population,
            )} graded ${noun}`}
          />
        )}
      </div>
    </Display>
  )
}

const ChartDisplays = ({
  role,
  data,
  cards,
}: {
  role: DesignRole
  data: ReviewData
  cards: CardSet
}) => (
  <>
    {role.charts.map((card) => {
      const label = `Chart · card ${card}`
      if (card === TROUBLE) {
        if (!cards.trouble) {
          const gap = recordGap(data.borrower, "borrower")
          return (
            <NoteDisplay
              key={card}
              label={label}
              text={gap?.kind === "tbd" ? gap.reason : LOADING}
            />
          )
        }
        return (
          <Display
            key={card}
            label={`${label} Trouble over time`}
            className={s.chartDisplay}
          >
            <div className={cx(gd.root, s.box)}>
              <div className={gd.troubleViews}>
                <div aria-label="Concentration" role="group">
                  {cards.trouble.length ? (
                    <LateShareBars rows={cards.trouble} />
                  ) : (
                    <Tbd>No funded market has recorded life yet.</Tbd>
                  )}
                </div>
                <div aria-label="Direction" role="group">
                  <DirectionPending />
                </div>
              </div>
            </div>
          </Display>
        )
      }
      const found = cardFor(card, data, cards)
      if (!("spec" in found))
        return <NoteDisplay key={card} label={label} text={found.reason} />
      const chart = found.spec.chart?.expanded ?? found.spec.chart?.collapsed
      if (!chart)
        return (
          <NoteDisplay
            key={card}
            label={label}
            text={`No chart: card ${card} draws none at this snapshot`}
          />
        )
      return (
        <Display key={card} label={label} className={s.chartDisplay}>
          <div className={cx(gd.root, s.box)}>{chart}</div>
        </Display>
      )
    })}
  </>
)

/** The handoff's copy of the cards the metric feeds (cards.json). */
const CopyLines = ({
  metric,
  part,
}: {
  metric: SpecMetric
  part: "tells" | "notTells"
}) => (
  <>
    {cardCopy(metric, part)
      .filter((line) => line.card !== TROUBLE)
      .map((line) => (
        <p key={line.card} className={s.cardLine}>
          {line.text ? (
            <>
              <b>
                Card {line.card} {line.name}:
              </b>{" "}
              {line.text}
            </>
          ) : (
            <span className={s.tbd}>
              Card {line.card}: no card copy in the design handoff.
            </span>
          )}
        </p>
      ))}
  </>
)

const Part = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className={s.part}>
    <dt className={s.partTitle}>{title}</dt>
    <dd className={s.partBody}>{children}</dd>
  </div>
)

/** Independent display switches, grouped above the previews they control. */
const OptionToggle = ({
  label,
  title,
  checked,
  onChange,
}: {
  label: string
  title: string
  checked: boolean
  onChange: (on: boolean) => void
}) => (
  <button
    type="button"
    role="switch"
    className={s.displayToggle}
    title={title}
    aria-checked={checked}
    onClick={() => onChange(!checked)}
  >
    <span className={s.switchTrack} aria-hidden="true" />
    <span>{label}</span>
  </button>
)

const OPTION_LABEL = new Map(
  DISPLAY_OPTIONS.map((option) => [option.key, option.label]),
)

export const MetricItem = memo(
  ({
    metric,
    on,
    data,
    cards,
    onToggle,
    onReset,
    treatmentCard,
    treatment,
    treatmentChanged,
    onOpenTreatments,
  }: {
    metric: SpecMetric
    on: OptionKey[]
    data: ReviewData
    cards: CardSet
    onToggle: (id: string, key: OptionKey, value: boolean) => void
    /** Back to this metric's design default. */
    onReset: (id: string) => void
    /** The market card this metric heads, when it has treatments. */
    treatmentCard?: string
    /** The treatment chosen for that card, if any. */
    treatment?: TreatmentCode
    treatmentChanged?: boolean
    onOpenTreatments: (card: string) => void
  }) => {
    const label = metricLabel(metric.id)
    const titleId = `metric-${metric.id}-title`
    const places = placesOf(metric)
    const role = designRole(metric)
    const metricCards = cardsOf(metric)
    const available = availableOn(metric.id)
    const design = defaultOn(metric.id)
    const removed = design.filter((key) => !on.includes(key))
    const added = on.filter((key) => !design.includes(key))
    const changes = [
      ...removed.map((key) => `−${OPTION_LABEL.get(key)}`),
      ...added.map((key) => `+${OPTION_LABEL.get(key)}`),
    ]
    const optionNote = (key: OptionKey) => {
      if (key === "card")
        return role.headline.length
          ? ` (its headline: card ${role.headline.join(", ")})`
          : " (it feeds these cards; none is its headline)"
      if (key === "value" && places.length)
        return ` (also shown in ${places.join(" and ")})`
      return ""
    }

    // One card panel open per metric, in its own row under the cards, so
    // opening it never moves the card or the other displays.
    const uid = useId()
    const scope = useRef<HTMLElement>(null)
    const panelRow = useRef<HTMLDivElement>(null)
    const userOpened = useRef(false)
    const [openCard, setOpenCard] = useState<string>()
    const [chip, setChip] = useState<ChipKey>("median")
    const [specOpen, setSpecOpen] = useState(true)
    const cardId = (card: string) => `${uid}card-${card.replace(".", "-")}`
    const panelId = `${uid}panel`
    const specId = `${uid}spec`
    const showCards = available.includes("card") && on.includes("card")
    const found = openCard ? cardFor(openCard, data, cards) : undefined
    const openSpec =
      showCards && found && "spec" in found ? found.spec : undefined
    const close = () => {
      const card = openCard
      setOpenCard(undefined)
      if (card) document.getElementById(cardId(card))?.focus()
    }
    const closeRef = useRef(close)
    closeRef.current = close
    useEffect(() => {
      if (!openSpec) return undefined
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
    }, [openSpec])
    useEffect(() => {
      if (!openSpec || !userOpened.current) return
      userOpened.current = false
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")
        ?.matches
      requestAnimationFrame(
        () =>
          panelRow.current?.scrollIntoView?.({
            block: "nearest",
            behavior: reduce ? "auto" : "smooth",
          }),
      )
    }, [openSpec])

    const cardTile = (card: string) => {
      const tile = cardFor(card, data, cards)
      const headline = role.headline.includes(card)
      const cardLabel = headline
        ? `Card ${card} · headline`
        : `Card ${card} · headline ${
            HEADLINES[card]?.join(", ") ?? "none"
          }; this metric feeds it`
      if (!("spec" in tile))
        return <NoteDisplay key={card} label={cardLabel} text={tile.reason} />
      return (
        <Display
          key={card}
          label={cardLabel}
          className={cx(s.cardDisplay, !headline && s.cardFeeds)}
        >
          <div className={cx(gd.root, s.cardSlot)}>
            {cards.picks?.[card] && cards.treatments?.[card] ? (
              <CardPreview
                spec={tile.spec}
                datum={cards.treatments[card]}
                code={chosenTreatment(cards.picks, card)}
                comparison={cards.comparisons?.[card] !== false}
              />
            ) : (
              <AnalyticsCard
                id={cardId(card)}
                controls={panelId}
                spec={
                  cards.comparisons?.[card] === false
                    ? { ...tile.spec, compare: "" }
                    : tile.spec
                }
                open={openSpec?.id === card}
                onToggle={() => {
                  userOpened.current = openCard !== card
                  setOpenCard(openCard === card ? undefined : card)
                  setChip("median")
                }}
              />
            )}
          </div>
        </Display>
      )
    }
    const control = (key: OptionKey, text: string) => (
      <OptionToggle
        label={text}
        title={`Design: ${design.includes(key) ? "on" : "off"}${optionNote(
          key,
        )}`}
        checked={on.includes(key)}
        onChange={(next) => onToggle(metric.id, key, next)}
      />
    )
    const hasCopy = cardCopy(metric, "tells").some(
      (line) => line.card !== TROUBLE,
    )

    return (
      <article
        ref={scope}
        id={`metric-${metric.id}`}
        className={s.metric}
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={s.metricHead}>
          <div className={s.titleRow}>
            <h1 id={titleId} className={s.metricName}>
              {label}
            </h1>
            {on.includes("value") ? (
              <ValueInline metric={metric} data={data} />
            ) : null}
          </div>
          <div className={s.metricTools}>
            <div
              className={s.options}
              role="group"
              aria-label={`Display options for ${label}`}
            >
              {control("value", "Value")}
              {available.includes("card") ? control("card", "Cards") : null}
              {available.includes("comparison")
                ? control("comparison", "Comparison")
                : null}
              {available.includes("chart") ? control("chart", "Charts") : null}
            </div>
            {treatmentCard ? (
              <button
                type="button"
                className={cx(s.treatmentPill, treatmentChanged && s.changed)}
                onClick={() => onOpenTreatments(treatmentCard)}
              >
                {`Review card ${treatmentCard} · ${
                  treatment
                    ? `${treatment} ${TREATMENTS[treatment].label}`
                    : "Original design"
                }`}
                <span aria-hidden="true"> →</span>
              </button>
            ) : null}
          </div>
          {changes.length ? (
            <p className={s.changedLine}>
              {`Changed from design: ${changes.join(", ")} `}
              <button
                type="button"
                className={s.resetLink}
                onClick={() => onReset(metric.id)}
              >
                Reset to design
              </button>
            </p>
          ) : null}
        </div>
        <div className={s.inspectionGrid}>
          {showCards ? (
            <section
              className={cx(s.inspectionSection, s.inspectionCards)}
              aria-label="Card previews"
            >
              <div className={s.displayRow}>{metricCards.map(cardTile)}</div>
              {openSpec ? (
                <div ref={panelRow} className={cx(gd.root, s.panelRow)}>
                  <AnalyticsPanel
                    id={panelId}
                    spec={openSpec}
                    chip={chip}
                    onChip={setChip}
                    onClose={close}
                  />
                </div>
              ) : null}
            </section>
          ) : null}
          {available.includes("comparison") && on.includes("comparison") ? (
            <section
              className={cx(s.inspectionSection, s.inspectionComparison)}
              aria-label="Metric comparison"
            >
              <ComparisonDisplay metric={metric} data={data} />
            </section>
          ) : null}
          {available.includes("chart") && on.includes("chart") ? (
            <section
              className={cx(s.inspectionSection, s.inspectionCharts)}
              aria-label="Chart previews"
            >
              <div className={s.displayRow}>
                <ChartDisplays role={role} data={data} cards={cards} />
              </div>
            </section>
          ) : null}
        </div>
        <div className={s.spec}>
          <div className={s.subHead}>
            <h4 className={s.subTitle}>
              <button
                type="button"
                className={s.groupToggle}
                aria-expanded={specOpen}
                aria-controls={specId}
                onClick={() => setSpecOpen(!specOpen)}
              >
                <Chevron />
                <span>Spec</span>
              </button>
            </h4>
          </div>
          <div id={specId} className={s.subBody} hidden={!specOpen}>
            {specOpen ? (
              <dl className={s.parts}>
                <Part title="What it is">
                  <p>{metric.what}</p>
                </Part>
                <Part title="How it is calculated">
                  <p>{metric.how}</p>
                  <p className={s.source}>Where to get it: {metric.where}</p>
                  <p className={s.source}>
                    Unit: {metric.unit} · Spec example (13 August 2026):{" "}
                    {metric.example}
                  </p>
                </Part>
                {hasCopy ? (
                  <>
                    <Part title="What its cards tell you">
                      <CopyLines metric={metric} part="tells" />
                    </Part>
                    <Part title="What its cards do not tell you">
                      <CopyLines metric={metric} part="notTells" />
                    </Part>
                  </>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>
      </article>
    )
  },
)
