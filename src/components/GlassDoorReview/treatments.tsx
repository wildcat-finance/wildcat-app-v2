"use client"

// Temporary: the metric review page (product#917). Remove with the page.
// The sixteen display treatments A–P from the design handoff (treatments.js),
// ported to React: each one a tile over one index datum. Markup, sizes and
// colours follow the reference; clicking a tile chooses it for its card.
// The tiles sit in one view per card (CardTreatments), not inside metrics.

import * as React from "react"
import { useId, useState } from "react"

import gd from "@/components/GlassDoor/analytics.module.css"
import {
  AnalyticsCard,
  AnalyticsPanel,
  CardSpec,
  ChipKey,
} from "@/components/GlassDoor/card"

import s from "./review.module.css"
import {
  cardName,
  choiceText,
  chosenTreatment,
  designText,
  DESIGN_TREATMENT,
  drawable,
  IndexDatum,
  Tone,
  TREATMENT_CARDS,
  TREATMENT_CODES,
  TreatmentCode,
  TreatmentPicks,
  TREATMENTS,
} from "./treatmentData"
import t from "./treatments.module.css"

const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ")

const FILL: Record<Tone, string> = {
  STRONG: "#28CA7C",
  WATCH: "#D7A820",
  PROBLEM: "#F1464B",
  LIMITED: "#8A8C9F",
  CONTEXT: "#4112B5",
}
const CELL = { keep: "#D4D6DD", grace: "#D7A820", past: "#F1464B" }
const TONE_CLASS: Record<Tone, string> = {
  STRONG: t.strong,
  WATCH: t.watch,
  PROBLEM: t.problem,
  LIMITED: t.limited,
  CONTEXT: t.context,
}
const FLAG: Record<Tone, string> = {
  STRONG: "CLEARED",
  WATCH: "REVIEW",
  PROBLEM: "EXCEPTION",
  LIMITED: "NO DATA",
  CONTEXT: "REVIEW",
}

const pct = (value: number) => `${value}%`
const medShort = (d: IndexDatum) =>
  d.rail >= 0 && d.railMed >= 0 ? String(d.railMed) : "—"

const Badge = ({ tone }: { tone: Tone }) => (
  <span className={cx(t.badge, TONE_CLASS[tone])}>{tone}</span>
)
const Name = ({ d }: { d: IndexDatum }) => (
  <div className={t.name}>{d.name}</div>
)
const Muted = ({ children }: { children: React.ReactNode }) => (
  <div className={t.muted}>{children}</div>
)
const Unavailable = ({ d, fallback }: { d: IndexDatum; fallback: string }) => (
  <div className={t.unavailable}>{d.unavailable || fallback}</div>
)
const NO_RAIL = "No 0–100 rail for this index."

const cellColor = (index: number, past: number, grace: number) => {
  if (index < past) return CELL.past
  if (index < past + grace) return CELL.grace
  return CELL.keep
}

const stripColor = (index: number, bad: number, late: number) => {
  if (index < bad) return CELL.past
  if (index < bad + late) return CELL.grace
  return "#28CA7C"
}

/**
 * Colour by which way is better: a higher worst incident is worse, and a
 * measure with no better direction (utilization) stays neutral. The handoff
 * colours every positive difference green.
 */
const differenceClass = (difference: number | null, d: IndexDatum) => {
  if (difference === null || difference === 0 || !d.better) return t.faint
  const good = d.better === "higher" ? difference > 0 : difference < 0
  return good ? t.good : t.bad
}

const BODY: Record<TreatmentCode, (d: IndexDatum) => React.ReactNode> = {
  A: (d) => (
    <>
      <Name d={d} />
      <div className={t.valueRow}>
        <span className={t.value}>{d.value}</span>
        <Badge tone={d.verdict} />
      </div>
      <div className={t.unit}>{d.unit}</div>
      <Muted>{d.median}</Muted>
    </>
  ),
  B: (d) => {
    if (d.grace < 0)
      return <Unavailable d={d} fallback="Not countable out of 100." />
    const grace = Math.round(d.grace)
    const past = Math.round(d.past)
    return (
      <>
        <div className={t.cells} aria-hidden="true">
          {Array.from({ length: 100 }, (_, index) => (
            <span
              key={index}
              className={t.cell}
              style={{ background: cellColor(index, past, grace) }}
            />
          ))}
        </div>
        <div className={t.claim}>{d.countClaim}</div>
        <Muted>{d.countNote}</Muted>
      </>
    )
  },
  C: (d) => {
    if (d.rail < 0) return <Unavailable d={d} fallback={NO_RAIL} />
    const max = d.railMax || 100
    return (
      <>
        <div className={t.head}>
          <Name d={d} />
          <span className={cx(t.value, t.valueSm)}>{d.value}</span>
        </div>
        <div className={t.rail}>
          <div
            className={t.railFill}
            style={{
              width: pct(Math.min(100, (100 * d.rail) / max)),
              background: FILL[d.verdict],
            }}
          />
          {d.railMed >= 0 ? (
            <div
              className={t.railTick}
              style={{ left: pct((100 * d.railMed) / max) }}
            />
          ) : null}
        </div>
        <Muted>{d.median}</Muted>
      </>
    )
  },
  D: (d) => (
    <>
      <div className={t.sentence}>{d.sentence}</div>
      <Muted>{d.median}</Muted>
    </>
  ),
  E: (d) => {
    if (!d.rank)
      return (
        <Unavailable
          d={d}
          fallback="This index has no protocol-wide ranking in the snapshot."
        />
      )
    const [position, population] = d.rank
    return (
      <>
        <Name d={d} />
        <div className={t.rank} aria-hidden="true">
          {Array.from({ length: population }, (_, index) => (
            <span
              key={index}
              className={cx(t.rankBar, index === position && t.rankMe)}
            />
          ))}
        </div>
        <div className={t.claim}>
          {`better than ${position} of ${population}`}
        </div>
        <Muted>{d.median}</Muted>
      </>
    )
  },
  F: (d) => (
    <>
      <Name d={d} />
      {d.split ? (
        <div className={t.split}>
          {d.split.map(([width, color]) => (
            <span
              key={`${width}-${color}`}
              style={{ width: pct(width), background: color }}
            />
          ))}
        </div>
      ) : null}
      {d.parts.map(([key, value]) => (
        <div key={key} className={t.part}>
          <span>{key}</span>
          <b>{value}</b>
        </div>
      ))}
    </>
  ),
  G: (d) => {
    if (d.grace < 0)
      return (
        <>
          <Name d={d} />
          <Unavailable d={d} fallback="Not a share of the record." />
        </>
      )
    const late = Math.round(d.grace * 0.6)
    const bad = Math.round(d.past * 0.6)
    return (
      <>
        <Name d={d} />
        <div className={t.strip} aria-hidden="true">
          {Array.from({ length: 60 }, (_, index) => (
            <span
              key={index}
              style={{ background: stripColor(index, bad, late) }}
            />
          ))}
        </div>
        <Muted>
          unordered share of the record: the chain holds counts, not a
          day-by-day series, so position means nothing here
        </Muted>
        <div className={t.claim}>{d.countClaim}</div>
      </>
    )
  },
  H: (d) => {
    if (d.rail < 0) return <Unavailable d={d} fallback={NO_RAIL} />
    const max = d.railMax || 100
    const median = Math.max(0, d.railMed)
    const weak = median * 0.9
    const bands: [number, string][] = [
      [weak, "#EFF0F4"],
      [median - weak, "#E6E7EB"],
      [max - median, "#D4D6DD"],
    ]
    return (
      <>
        <div className={t.head}>
          <Name d={d} />
          <span className={cx(t.value, t.valueSm)}>{d.value}</span>
        </div>
        <div className={t.bullet}>
          <div className={t.bulletBands}>
            {bands.map(([width, color]) => (
              <span
                key={color}
                style={{ width: pct((100 * width) / max), background: color }}
              />
            ))}
          </div>
          <div
            className={t.bulletBar}
            style={{ width: pct(Math.min(100, (100 * d.rail) / max)) }}
          />
          {d.railMed >= 0 ? (
            <div
              className={t.bulletTick}
              style={{
                left: pct((100 * d.railMed) / max),
                background: FILL[d.verdict],
              }}
            />
          ) : null}
        </div>
        <Muted>{`bands: weak · fair · strong · tick = ${medShort(d)}`}</Muted>
      </>
    )
  },
  I: (d) => {
    if (!d.rank)
      return (
        <Unavailable
          d={d}
          fallback="No population ranking for this index in the snapshot."
        />
      )
    const [position, population] = d.rank
    const share = population ? (100 * position) / population : 0
    return (
      <>
        <Name d={d} />
        <div className={t.dist} aria-hidden="true">
          <div className={t.distLine} />
          <div className={t.distBox} />
          <div className={t.distMedian} />
          <div className={t.distMe} style={{ left: pct(share) }} />
        </div>
        <div className={t.distAxis}>
          <span>weakest</span>
          <span>middle half</span>
          <span>strongest</span>
        </div>
        <div className={t.claim}>
          {`sits in the ${Math.round(
            share,
          )}th percentile: ${position} of ${population} are weaker`}
        </div>
      </>
    )
  },
  J: (d) => {
    if (d.rail < 0) return <Unavailable d={d} fallback={NO_RAIL} />
    const max = d.railMax || 100
    const turn = Math.min(d.rail / max, 1)
    const arc = "M 12 62 A 47 47 0 0 1 106 62"
    return (
      <>
        <Name d={d} />
        <div className={t.dial}>
          <svg width="118" height="70" viewBox="0 0 118 70" aria-hidden="true">
            <path
              d={arc}
              fill="none"
              stroke="#F1464B"
              strokeWidth="9"
              strokeDasharray="44 148"
            />
            <path
              d={arc}
              fill="none"
              stroke="#D7A820"
              strokeWidth="9"
              strokeDasharray="30 148"
              strokeDashoffset="-46"
            />
            <path
              d={arc}
              fill="none"
              stroke="#28CA7C"
              strokeWidth="9"
              strokeDasharray="70 148"
              strokeDashoffset="-78"
            />
            <line
              x1="59"
              y1="62"
              x2={(59 - Math.cos(turn * Math.PI) * 40).toFixed(1)}
              y2={(62 - Math.sin(turn * Math.PI) * 40).toFixed(1)}
              stroke="#141414"
              strokeWidth="2.5"
            />
            <circle cx="59" cy="62" r="3.5" fill="#141414" />
          </svg>
          <div>
            <div className={cx(t.value, t.valueMd)}>{d.value}</div>
            <Badge tone={d.verdict} />
          </div>
        </div>
        <Muted>{d.median}</Muted>
      </>
    )
  },
  K: (d) => {
    const difference = d.rail >= 0 && d.railMed >= 0 ? d.rail - d.railMed : null
    let differenceText = "—"
    if (difference !== null)
      differenceText = `${difference > 0 ? "+" : ""}${difference.toFixed(1)}`
    const rows: [string, string, string?][] = [
      ["this one", d.value],
      ["typical", medShort(d)],
      ["difference", differenceText, differenceClass(difference, d)],
      ["evidence", d.evidence || "on-chain record"],
    ]
    return (
      <>
        <div className={cx(t.head, t.headLeft)}>
          <span className={t.dot} style={{ background: FILL[d.verdict] }} />
          <span className={cx(t.name, t.nameInline)}>{d.name}</span>
        </div>
        <div className={t.score}>
          {rows.map(([key, value, className]) => (
            <React.Fragment key={key}>
              <span className={t.scoreKey}>{key}</span>
              <b className={cx(t.scoreValue, className)}>{value}</b>
            </React.Fragment>
          ))}
        </div>
      </>
    )
  },
  L: (d) => (
    <>
      <Name d={d} />
      {d.buckets ? (
        <>
          {d.buckets.map(([label, value, width, color]) => (
            <div key={label} className={t.bucket}>
              <span className={t.bucketLabel}>{label}</span>
              <span
                className={t.bucketBar}
                style={{ width: pct(width), background: color }}
              />
              <span className={t.bucketValue}>{value}</span>
            </div>
          ))}
          <Muted>
            {d.bucketNote ??
              "green current · amber within allowance · red past allowance, the receivables-aging convention"}
          </Muted>
        </>
      ) : (
        <Unavailable
          d={d}
          fallback="This index has no aging dimension: nothing here is measured by how long it has been outstanding."
        />
      )}
    </>
  ),
  M: (d) => {
    if (!d.cov)
      return (
        <>
          <Name d={d} />
          <Unavailable
            d={d}
            fallback="No contractual threshold governs this index, so there is no headroom to draw. The market’s hard limits are the grace period, the payout window and the credit line."
          />
        </>
      )
    const [value, limit, limitLabel, headroom, note] = d.cov
    const over = value > limit
    return (
      <>
        <Name d={d} />
        <div className={t.cov}>
          <div className={t.covTrack} />
          <div
            className={t.covBar}
            style={{
              width: pct(Math.min(100, (100 * value) / (limit * 1.3))),
              background: over ? "#F1464B" : "#28CA7C",
            }}
          />
          <div className={t.covLimit} style={{ left: pct(100 / 1.3) }} />
        </div>
        <div className={t.covFoot}>
          <span>{`limit ${limitLabel}`}</span>
          <b className={over ? t.bad : t.good}>{headroom}</b>
        </div>
        <Muted>{note}</Muted>
      </>
    )
  },
  N: (d) => {
    const typical = medShort(d) === "—" ? d.median || "—" : medShort(d)
    const rows: [string, string, string][] = [
      ["value", d.value, typical],
      ...d.parts
        .slice(0, 2)
        .map(
          ([key, value]) =>
            [key, value, "not disclosed"] as [string, string, string],
        ),
    ]
    return (
      <>
        <Name d={d} />
        <div className={t.sbsHead}>
          <span>THIS MARKET</span>
          <span>MARKET AVERAGE</span>
        </div>
        {rows.map(([key, mine, theirs]) => (
          <div key={key} className={t.sbsRow}>
            <b>{mine}</b>
            <span className={t.sbsKey}>{key}</span>
            <span className={t.sbsTheirs}>{theirs}</span>
          </div>
        ))}
      </>
    )
  },
  O: (d) => {
    if (!d.trend)
      return (
        <>
          <Name d={d} />
          <Unavailable
            d={d}
            fallback="The snapshot holds one figure for this index, not a series, so there is no trend to plot."
          />
        </>
      )
    const [heights, from, to, note] = d.trend
    return (
      <>
        <Name d={d} />
        <div className={t.trend} aria-hidden="true">
          {heights.map((height, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={index} style={{ height: pct(height) }} />
          ))}
        </div>
        <div className={t.trendAxis}>
          <span>{from}</span>
          <span>{to}</span>
        </div>
        <Muted>{note}</Muted>
      </>
    )
  },
  P: (d) => (
    <>
      <div className={cx(t.head, t.headLeft)}>
        <span
          className={cx(
            t.flag,
            d.verdict === "WATCH" || d.verdict === "CONTEXT"
              ? t.flagWatch
              : TONE_CLASS[d.verdict],
          )}
        >
          {FLAG[d.verdict]}
        </span>
        <span className={cx(t.name, t.nameInline)}>{d.name}</span>
      </div>
      <div className={cx(t.sentence, t.sentenceSm)}>{d.sentence}</div>
      <div className={t.next}>
        <span>next step</span>
        <b>Open the raw ledger rows →</b>
      </div>
    </>
  ),
}

export const TreatmentTile = ({
  code,
  datum,
  chosen,
  design,
  canDraw,
  onChoose,
}: {
  code: TreatmentCode
  datum: IndexDatum
  chosen: boolean
  /** The design uses this treatment for the card. */
  design: boolean
  /** False when the tile can only say what data is missing. */
  canDraw: boolean
  onChoose: (code: TreatmentCode) => void
}) => {
  const { label, summary } = TREATMENTS[code]
  return (
    <div
      className={cx(t.tile, chosen && t.tileChosen, !canDraw && t.tileMuted)}
    >
      <div className={t.tileHead}>
        <button
          type="button"
          className={cx(t.choose, t.tileLabel)}
          aria-pressed={chosen}
          aria-label={`Choose ${datum.id}-${code}, ${label}`}
          title={summary}
          onClick={() => onChoose(code)}
        >
          {label.toUpperCase()}
        </button>
        <span className={t.tileRight}>
          {chosen ? <span className={t.markChosen}>Chosen</span> : null}
          {design ? <span className={t.markDesign}>Design</span> : null}
          {code === "J" ? (
            <span className={t.markNote}>Comparison only</span>
          ) : null}
          <span className={t.tileCode}>{`${datum.id}-${code}`}</span>
        </span>
      </div>
      <div className={t.tileBody}>{BODY[code](datum)}</div>
    </div>
  )
}

/** The live card, as the design draws it, with its panel. */
const LiveCard = ({ spec }: { spec: CardSpec }) => {
  const [open, setOpen] = useState(false)
  const [chip, setChip] = useState<ChipKey>("median")
  const panelId = useId()
  return (
    <>
      <div className={cx(gd.root, t.liveCard)}>
        <AnalyticsCard
          spec={spec}
          open={open}
          controls={panelId}
          onToggle={() => {
            setOpen(!open)
            setChip("median")
          }}
        />
      </div>
      {open ? (
        <div className={cx(gd.root, t.livePanel)}>
          <AnalyticsPanel
            id={panelId}
            spec={spec}
            chip={chip}
            onChip={setChip}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}
    </>
  )
}

/**
 * The sixteen treatments of one market card at a time: a row of the nine
 * cards, then the chosen card's live card beside its tiles. Tiles that can
 * be drawn from this market's data come first.
 */
export const CardTreatments = ({
  card,
  onCard,
  datums,
  specs,
  reason,
  picks,
  onChoose,
  onReset,
}: {
  /** The card on view; none until one is selected. */
  card?: string
  onCard: (card: string) => void
  datums?: Record<string, IndexDatum>
  /** The live market cards, by number. */
  specs?: Record<string, CardSpec>
  /** Why a card has no datum yet (loading, under review, hidden). */
  reason: (card: string) => string
  picks: TreatmentPicks
  onChoose: (card: string, code: TreatmentCode) => void
  /** Back to the design for one card. */
  onReset: (card: string) => void
}) => {
  const datum = card ? datums?.[card] : undefined
  const spec = card ? specs?.[card] : undefined
  const chosen = card ? chosenTreatment(picks, card) : undefined
  const changed = Boolean(card && picks[card])
  const codes = datum
    ? TREATMENT_CODES.filter((code) => drawable(code, datum))
    : []
  const missing = datum
    ? TREATMENT_CODES.filter((code) => !drawable(code, datum))
    : []
  const tile = (code: TreatmentCode) =>
    card && datum ? (
      <TreatmentTile
        key={code}
        code={code}
        datum={datum}
        chosen={chosen === code}
        design={DESIGN_TREATMENT[card] === code}
        canDraw={drawable(code, datum)}
        onChoose={(next) => onChoose(card, next)}
      />
    ) : null
  return (
    <div className={t.view}>
      <p className={t.intro}>
        A display treatment is one of 16 ways (A–P) to draw a market card&apos;s
        main figure; the product picks one per card. The tiles use this
        market&apos;s live values.
      </p>
      <div className={t.picker} role="group" aria-label="Market cards">
        {TREATMENT_CARDS.map((entry) => {
          const code = chosenTreatment(picks, entry)
          return (
            <button
              key={entry}
              type="button"
              className={cx(t.pick, picks[entry] && t.pickChanged)}
              aria-pressed={entry === card}
              aria-label={`Card ${entry} ${cardName(entry)}: ${
                code ? `${entry}-${code} chosen` : "no treatment chosen"
              }${picks[entry] ? ", changed from the design" : ""}`}
              onClick={() => onCard(entry)}
            >
              <span>{`${entry} ${cardName(entry)}`}</span>
              <span className={t.pickCode}>{code ?? "–"}</span>
            </button>
          )
        })}
      </div>
      {card ? (
        <div className={t.selected}>
          <div className={t.choiceRow}>
            <h3 className={t.cardTitle}>{`Card ${card} ${cardName(card)}`}</h3>
            <p className={t.choice}>
              {chosen ? "Chosen: " : "No treatment chosen: "}
              <b>{choiceText(card, chosen)}</b>
              {changed ? ` · design: ${designText(card)} ` : " (design)"}
              {changed ? (
                <button
                  type="button"
                  className={s.resetLink}
                  onClick={() => onReset(card)}
                >
                  Back to design
                </button>
              ) : null}
            </p>
          </div>
          {spec ? (
            <div className={t.reference}>
              <span className={t.referenceLabel}>Live card (design)</span>
              <LiveCard key={card} spec={spec} />
            </div>
          ) : null}
          {datum ? (
            <>
              <p className={t.hint}>
                {`Select a tile to choose it for card ${card}; select the chosen tile again to go back to the design.`}
              </p>
              <div className={t.grid}>{codes.map(tile)}</div>
              {missing.length ? (
                <>
                  <h4 className={t.groupTitle}>
                    {`Not drawable with this market's data (${missing.length})`}
                  </h4>
                  <p className={t.hint}>
                    These need data the publication does not hold for this card,
                    so each says what is missing instead of drawing a shape.
                  </p>
                  <div className={t.grid}>{missing.map(tile)}</div>
                </>
              ) : null}
            </>
          ) : (
            <p className={s.tbd}>{reason(card)}</p>
          )}
        </div>
      ) : (
        <p className={t.hint}>
          Select a card to compare its 16 treatments with the live card.
        </p>
      )}
    </div>
  )
}
