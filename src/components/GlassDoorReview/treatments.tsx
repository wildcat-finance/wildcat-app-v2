"use client"

// Temporary: the metric review page (product#917). Remove with the page.
// The sixteen display treatments A–P from the design handoff (treatments.js),
// ported to React: each one a tile over one index datum. Markup, sizes and
// colours follow the reference; clicking a tile chooses it for its card.
// The tiles sit in one view per card (CardTreatments), not inside metrics.

import * as React from "react"
import { useId, useState } from "react"

import { Dialog, DialogContent } from "@mui/material"

import gd from "@/components/GlassDoor/analytics.module.css"
import {
  AnalyticsCard,
  AnalyticsPanel,
  CardSpec,
  ChipKey,
} from "@/components/GlassDoor/card"
import { ordinal } from "@/components/GlassDoor/helpers"

import s from "./review.module.css"
import {
  DESIGN_TREATMENT,
  drawable,
  IndexDatum,
  Tone,
  TreatmentCode,
  TREATMENTS,
  treatmentIssue,
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
  d.rail >= 0 && d.railMed >= 0 ? d.medText ?? String(d.railMed) : "—"
/** The value beside a rail: the rail's own reading when it is not the headline. */
const railValue = (d: IndexDatum) => d.railValue ?? d.value
/** H's bands, named by which way is better; a measure is only above or below. */
const bandWords = (d: IndexDatum) => {
  if (d.better === "higher") return "weak · fair · strong"
  if (d.better === "lower") return "strong · fair · weak"
  return "below · near · above the median"
}

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
          <span className={cx(t.value, t.valueSm)}>{railValue(d)}</span>
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
          {`${d.rankHigher ?? "better than"} ${position} of ${population}`}
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
          unordered share of the record: the segments show proportions, not when
          each part happened
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
          <span className={cx(t.value, t.valueSm)}>{railValue(d)}</span>
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
        <Muted>{`bands: ${bandWords(d)} · tick = ${medShort(d)}`}</Muted>
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
          <span>{d.rankHigher ? "lowest" : "weakest"}</span>
          <span>middle half</span>
          <span>{d.rankHigher ? "highest" : "strongest"}</span>
        </div>
        <div className={t.claim}>
          {`sits in the ${ordinal(
            Math.round(share),
          )} percentile: ${position} of ${population} ${
            d.rankHigher ? "sit lower" : "are weaker"
          }`}
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
      ["this one", railValue(d)],
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
    // Only compared values: a part with no protocol median is left out.
    const rows: [string, string, string][] = d.sideBySide?.length
      ? d.sideBySide
      : [["value", railValue(d), medShort(d)]]
    return (
      <>
        <Name d={d} />
        <div className={t.sbsHead}>
          <span>{d.id.startsWith("3.") ? "THIS BORROWER" : "THIS MARKET"}</span>
          <span>
            {d.id.startsWith("3.") ? "BORROWER MEDIAN" : "MARKET MEDIAN"}
          </span>
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
            fallback="This index has no series in this publication, so there is no trend to plot."
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

/** The actual specimen, shared by comparison, metrics and page preview. */

export const ReferencePreview = ({
  code,
  datum,
}: {
  code: TreatmentCode
  datum: IndexDatum
}) =>
  code === "J" && drawable(code, datum) ? (
    <div className={t.visual}>{BODY[code](datum)}</div>
  ) : null

export const CardPreview = ({
  spec,
  datum,
  code,
  comparison = true,
}: {
  spec?: CardSpec

  datum?: IndexDatum

  code?: TreatmentCode

  comparison?: boolean
}) => {
  const [open, setOpen] = useState(false)

  const [chip, setChip] = useState<ChipKey>("median")

  const panelId = useId()

  const issue = code && datum ? treatmentIssue(code, datum) : undefined

  const native = !code || (spec && DESIGN_TREATMENT[spec.id] === code)

  const displayed = spec && !comparison ? { ...spec, compare: "" } : spec

  let preview: React.ReactNode = (
    <p className={t.unavailable}>No card at this snapshot.</p>
  )
  if (issue)
    preview = (
      <p className={t.unavailable} role="status">
        {issue}
      </p>
    )
  else if (native && displayed)
    preview = (
      <div className={gd.root}>
        <AnalyticsCard
          spec={displayed}
          open={open}
          controls={panelId}
          onToggle={() => setOpen(!open)}
        />
      </div>
    )
  else if (code && datum)
    preview = (
      <div className={t.visual}>
        {BODY[code](comparison ? datum : { ...datum, median: "" })}
        {spec ? (
          <button
            type="button"
            className={s.resetLink}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
          >
            Details
          </button>
        ) : null}
      </div>
    )
  return (
    <div className={t.specimen} data-treatment={code ?? "design"}>
      {preview}
      {displayed ? (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ "aria-label": `Card ${displayed.id} details` }}
        >
          <DialogContent className={gd.root}>
            <AnalyticsPanel
              id={panelId}
              spec={displayed}
              chip={chip}
              onChip={setChip}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

/** Gallery inspection never changes the chosen configuration. */

export const TreatmentTile = ({
  code,
  datum,
  chosen,
  spec,
  comparison = true,
  shortlisted,
  onShortlist,
  onChoose,
}: {
  code: TreatmentCode

  datum: IndexDatum

  chosen: boolean

  spec?: CardSpec

  comparison?: boolean

  shortlisted?: boolean

  onShortlist?: (code: TreatmentCode) => void

  onChoose: (code: TreatmentCode) => void
}) => {
  const issue = treatmentIssue(code, datum)

  return (
    <article
      className={cx(t.candidate, chosen && t.candidateChosen)}
      aria-label={`${datum.id}-${code} ${TREATMENTS[code].label}`}
    >
      <div className={t.candidateHead}>
        <b>
          {code} · {TREATMENTS[code].label}
        </b>
        {chosen ? <span>Chosen</span> : null}
      </div>

      <CardPreview
        spec={spec}
        datum={datum}
        code={code}
        comparison={comparison}
      />

      <div className={t.actions}>
        {onShortlist ? (
          <button
            type="button"
            className={s.button}
            aria-pressed={Boolean(shortlisted)}
            disabled={Boolean(issue)}
            onClick={() => onShortlist(code)}
          >
            {shortlisted ? "Remove from comparison" : "Compare"}
          </button>
        ) : null}

        <button
          type="button"
          className={s.button}
          aria-label={`Choose ${datum.id}-${code}, ${TREATMENTS[code].label}`}
          disabled={Boolean(issue) || chosen}
          onClick={() => onChoose(code)}
        >
          {chosen ? "Chosen" : "Choose"}
        </button>
      </div>
    </article>
  )
}
