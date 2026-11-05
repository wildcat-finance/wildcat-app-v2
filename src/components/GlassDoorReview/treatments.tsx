"use client"

// Temporary: the metric review page (product#917). Remove with the page.
// The sixteen display treatments A–P from the design handoff (treatments.js),
// ported to React: each one a tile over one index datum. Markup, sizes and
// colours follow the reference; clicking a tile chooses it for its card.

import * as React from "react"
import { useId, useState } from "react"

import { Chevron } from "./Chevron"
import s from "./review.module.css"
import {
  chosenTreatment,
  DESIGN_TREATMENT,
  IndexDatum,
  Tone,
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

const differenceClass = (difference: number | null) => {
  if (difference === null) return t.faint
  return difference < 0 ? t.bad : t.good
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
      ["difference", differenceText, differenceClass(difference)],
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
  onChoose,
}: {
  code: TreatmentCode
  datum: IndexDatum
  chosen: boolean
  /** The shipped pages use this treatment for the card. */
  design: boolean
  onChoose: (code: TreatmentCode) => void
}) => {
  const { label, summary } = TREATMENTS[code]
  return (
    <div className={cx(t.tile, chosen && t.tileChosen)}>
      <div className={t.tileHead}>
        <button
          type="button"
          className={cx(t.choose, t.tileLabel)}
          aria-pressed={chosen}
          aria-label={`Choose ${datum.id}-${code}, ${label}`}
          title={summary}
          onClick={() => onChoose(code)}
        >
          {`${code} · ${label.toUpperCase()}`}
        </button>
        <span className={t.tileRight}>
          {chosen ? <span className={t.tileMark}>chosen</span> : null}
          {design && !chosen ? (
            <span className={t.tileMarkMuted}>design default</span>
          ) : null}
          <span className={t.tileHelp} title={summary} aria-hidden="true">
            ?
          </span>
          <span className={t.tileCode}>{`${datum.id}-${code}`}</span>
        </span>
      </div>
      <div className={t.tileBody}>{BODY[code](datum)}</div>
    </div>
  )
}

/** A card's sixteen treatments, collapsed until asked for. */
export const TreatmentSection = ({
  card,
  datum,
  reason,
  picks,
  onChoose,
}: {
  card: string
  datum?: IndexDatum
  /** Why there is no datum yet (loading, or no live card). */
  reason?: string
  picks: TreatmentPicks
  onChoose: (card: string, code: TreatmentCode) => void
}) => {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const chosen = chosenTreatment(picks, card)
  let choice = "none chosen: the card as designed"
  if (chosen)
    choice = `chosen: ${card}-${chosen} ${TREATMENTS[chosen].label}${
      picks[card] ? "" : " (design default)"
    }`
  return (
    <div className={s.treatments}>
      <div className={s.subHead}>
        <h4 className={s.subTitle}>
          <button
            type="button"
            className={s.groupToggle}
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(!open)}
          >
            <Chevron />
            <span>{`Display treatments for card ${card} (A–P)`}</span>
          </button>
        </h4>
        <span className={cx(s.subNote, picks[card] && s.subNoteChanged)}>
          {choice}
        </span>
      </div>
      <div id={bodyId} className={s.subBody} hidden={!open}>
        {open && datum ? (
          <>
            <p className={s.subHint}>
              {`From this market's live values. Select a tile to choose it for card ${card}; select it again to go back to the design default. A tile that would need data the publication does not hold says so instead of drawing a shape.`}
            </p>
            <div className={t.grid}>
              {TREATMENT_CODES.map((code) => (
                <TreatmentTile
                  key={code}
                  code={code}
                  datum={datum}
                  chosen={chosen === code}
                  design={DESIGN_TREATMENT[card] === code}
                  onChoose={(next) => onChoose(card, next)}
                />
              ))}
            </div>
          </>
        ) : null}
        {open && !datum ? <p className={s.tbd}>{reason}</p> : null}
      </div>
    </div>
  )
}
