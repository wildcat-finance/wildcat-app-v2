// Temporary: the metric review page (product#917). Remove with the page.
// One metric: the five parts from the spec and its display options.

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
import { count } from "@/components/GlassDoor/format"
import { metric as metricLabel } from "@/components/GlassDoor/wording"

import { SpecMetric } from "./catalogue"
import { DesignRole, designRole } from "./design"
import {
  cardCopy,
  cardNumbers,
  comparisonOf,
  comparisonText,
  groupOf,
  PART_TBD,
  PLACES,
  recordGap,
  ReviewData,
  shownValue,
} from "./metrics"
import { defaultOn, DISPLAY_OPTIONS, OptionKey } from "./options"
import s from "./review.module.css"
import {
  IndexDatum,
  TREATMENT_CARDS,
  TreatmentCode,
  TreatmentPicks,
} from "./treatmentData"
import { TreatmentSection } from "./treatments"

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
}

/** The market card this metric heads, when the handoff draws treatments for it. */
export const treatmentCardOf = (metric: SpecMetric) =>
  designRole(metric).headline.find((card) => TREATMENT_CARDS.includes(card))

const TROUBLE = "3.12"
const LOADING = "loading…"

const isTbd = (text: string) => text.startsWith("TBD") || text === LOADING

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

const TbdDisplay = ({
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
const cardFor = (
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
    return { reason: "TBD: card 2.6 is hidden for finished markets" }
  return { reason: `TBD: card ${card} is not built` }
}

const placesOf = (metric: SpecMetric) =>
  metric.cards.filter((card) => PLACES[card]).map((card) => PLACES[card])

const ValueDisplay = ({
  metric,
  data,
}: {
  metric: SpecMetric
  data: ReviewData
}) => {
  const tipId = useId()
  const shown = shownValue(metric, data)
  // The value sits in the metric's header, beside its name.
  if (shown.kind === "loading")
    return <TbdDisplay label="Value" text={LOADING} className={s.headValue} />
  if (shown.kind === "tbd")
    return (
      <TbdDisplay label="Value" text={shown.reason} className={s.headValue} />
    )
  // The unrounded value the read API serves, on hover or keyboard focus.
  const raw = shown.raw === undefined ? undefined : String(shown.raw)
  return (
    <Display label="Value" className={s.headValue}>
      <div className={cx(s.box, s.valueBox)}>
        {raw === undefined ? (
          <span className={s.value}>{shown.text}</span>
        ) : (
          <span className={s.valueTip}>
            <span
              className={cx(
                s.value,
                typeof shown.raw === "string" && s.valueText,
              )}
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
        )}
      </div>
    </Display>
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
  if (!comparison) return <TbdDisplay label="Comparison" text={text} />
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
}) => {
  const numbers = role.charts
  if (!numbers.length)
    return (
      <TbdDisplay
        label="Chart"
        text="TBD: no chart in the design plots this metric"
      />
    )
  return (
    <>
      {numbers.map((card) => {
        const label = `Chart · card ${card}`
        if (card === TROUBLE) {
          if (!cards.trouble) {
            const gap = recordGap(data.borrower, "borrower")
            return (
              <TbdDisplay
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
          return <TbdDisplay key={card} label={label} text={found.reason} />
        const chart = found.spec.chart?.expanded ?? found.spec.chart?.collapsed
        if (!chart)
          return (
            <TbdDisplay
              key={card}
              label={label}
              text={`TBD: card ${card} has no chart`}
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
}

const CopyLines = ({
  metric,
  part,
}: {
  metric: SpecMetric
  part: "tells" | "notTells"
}) => {
  const lines = cardCopy(metric, part)
  return (
    <>
      <p className={s.tbd}>
        {`${PART_TBD}${lines.length ? "; the card copy:" : "."}`}
      </p>
      {lines.map((line) => (
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
              Card {line.card}: TBD: no card copy in the design handoff.
            </span>
          )}
        </p>
      ))}
    </>
  )
}

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

export const MetricItem = memo(
  ({
    metric,
    on,
    data,
    cards,
    onToggle,
    onReset,
    picks,
    onTreatment,
  }: {
    metric: SpecMetric
    on: OptionKey[]
    data: ReviewData
    cards: CardSet
    onToggle: (id: string, key: OptionKey, value: boolean) => void
    /** Back to this metric's design default. */
    onReset: (id: string) => void
    /** Chosen display treatment per market card. */
    picks: TreatmentPicks
    onTreatment: (card: string, code: TreatmentCode) => void
  }) => {
    const label = metricLabel(metric.id)
    const titleId = `metric-${metric.id}-title`
    const places = placesOf(metric)
    const numbers = cardNumbers(metric)
    const role = designRole(metric)
    const design = defaultOn(metric.id)
    const changed =
      design.length !== on.length || design.some((key) => !on.includes(key))
    const also = [
      ...(role.supporting.length
        ? [
            `card${
              role.supporting.length > 1 ? "s" : ""
            } ${role.supporting.join(", ")}`,
          ]
        : []),
      ...places,
    ]
    const comparison = comparisonText(metric, data)

    // One card panel open per metric, in its own row under the cards, so
    // opening it never moves the card or the other displays.
    const uid = useId()
    const scope = useRef<HTMLElement>(null)
    const panelRow = useRef<HTMLDivElement>(null)
    const userOpened = useRef(false)
    const [openCard, setOpenCard] = useState<string>()
    const [chip, setChip] = useState<ChipKey>("median")
    const cardId = (card: string) => `${uid}card-${card.replace(".", "-")}`
    const panelId = `${uid}panel`
    const showCards = on.includes("card")
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
      if (card === TROUBLE)
        return (
          <TbdDisplay
            key={card}
            label={`Card ${card}`}
            text="TBD: 3.12 Trouble over time is a chart section, not a seven-field card (see Chart)"
          />
        )
      const tile = cardFor(card, data, cards)
      if (!("spec" in tile))
        return (
          <TbdDisplay key={card} label={`Card ${card}`} text={tile.reason} />
        )
      return (
        <Display
          key={card}
          label={`Card ${card}${
            role.headline.includes(card) ? " · headline" : ""
          }`}
          className={s.cardDisplay}
        >
          <div className={cx(gd.root, s.cardSlot)}>
            <AnalyticsCard
              id={cardId(card)}
              controls={panelId}
              spec={tile.spec}
              open={openSpec?.id === card}
              onToggle={() => {
                userOpened.current = openCard !== card
                setOpenCard(openCard === card ? undefined : card)
                setChip("median")
              }}
            />
          </div>
        </Display>
      )
    }
    let cardTiles: React.ReactNode = null
    if (showCards)
      cardTiles = numbers.length ? (
        numbers.map(cardTile)
      ) : (
        <TbdDisplay
          label="Card"
          text={`TBD: no card uses this metric; it shows in ${places.join(
            " and ",
          )}`}
        />
      )
    const tiles = showCards || on.includes("comparison")
    const displays = tiles || on.includes("chart")
    const treatmentCard = treatmentCardOf(metric)
    const treatmentRecord = treatmentCard
      ? cardFor(treatmentCard, data, cards)
      : undefined

    // The result leads: the value sits in the header beside the name, the
    // other displays follow it, and the spec's five parts come last.
    return (
      <article
        ref={scope}
        id={`metric-${metric.id}`}
        className={s.metric}
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={s.metricHead}>
          <div className={s.metricTitle}>
            <h3 id={titleId} className={s.metricName}>
              {label}
            </h3>
            {/* How the design shows it; this sets its default toggles. */}
            <p className={s.tags}>
              {role.headline.map((card) => (
                <span key={card} className={cx(s.tag, s.tagStrong)}>
                  {`Card ${card} headline`}
                </span>
              ))}
              {role.charts.map((card) => (
                <span key={card} className={s.tag}>
                  {`Chart ${card}`}
                </span>
              ))}
              {role.compared ? <span className={s.tag}>Compared</span> : null}
              {also.length ? (
                <span className={s.tagText}>{`also on ${also.join(
                  " · ",
                )}`}</span>
              ) : null}
            </p>
          </div>
          {on.includes("value") ? (
            <ValueDisplay metric={metric} data={data} />
          ) : null}
          <div
            className={s.toggles}
            role="group"
            aria-label={`Display options for ${label}`}
          >
            {DISPLAY_OPTIONS.map((option) => {
              const inDesign = design.includes(option.key)
              const isOnNow = on.includes(option.key)
              return (
                <label
                  key={option.key}
                  className={cx(
                    s.toggle,
                    inDesign !== isOnNow && s.toggleChanged,
                  )}
                  title={`Design default: ${inDesign ? "on" : "off"}`}
                >
                  <input
                    type="checkbox"
                    checked={isOnNow}
                    onChange={(event) =>
                      onToggle(metric.id, option.key, event.target.checked)
                    }
                  />
                  <span>{option.label}</span>
                </label>
              )
            })}
            {changed ? (
              <button
                type="button"
                className={s.resetLink}
                onClick={() => onReset(metric.id)}
              >
                Reset to design
              </button>
            ) : null}
          </div>
        </div>
        {displays ? (
          <div className={s.displays}>
            {tiles ? (
              <div className={s.displayRow}>
                {cardTiles}
                {on.includes("comparison") ? (
                  <ComparisonDisplay metric={metric} data={data} />
                ) : null}
              </div>
            ) : null}
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
            {on.includes("chart") ? (
              <div className={s.displayRow}>
                <ChartDisplays role={role} data={data} cards={cards} />
              </div>
            ) : null}
          </div>
        ) : null}
        {treatmentCard ? (
          <TreatmentSection
            card={treatmentCard}
            datum={cards.treatments?.[treatmentCard]}
            reason={
              treatmentRecord && "reason" in treatmentRecord
                ? treatmentRecord.reason
                : LOADING
            }
            picks={picks}
            onChoose={onTreatment}
          />
        ) : null}
        <dl className={s.parts}>
          <Part title="How it is calculated">
            <p>{metric.how}</p>
            <p className={s.source}>Where to get it: {metric.where}</p>
            <p className={s.source}>
              Unit: {metric.unit} · Spec example (13 August 2026):{" "}
              {metric.example}
            </p>
          </Part>
          <Part title="Comparison">
            <p className={isTbd(comparison) ? s.tbd : undefined}>
              {comparison}
            </p>
          </Part>
          <Part title="What it means">
            <p>{metric.what}</p>
          </Part>
          <Part title="What it tells you">
            <CopyLines metric={metric} part="tells" />
          </Part>
          <Part title="What it does not tell you">
            <CopyLines metric={metric} part="notTells" />
          </Part>
        </dl>
      </article>
    )
  },
)
