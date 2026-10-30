import * as React from "react"

import styles from "./analytics.module.css"
import { count, hours, lifeShare, percent, score } from "./format"
import { Tone } from "./rules"

// The charts on the two pages, from the design handoff (analytics-charts.js):
// flat shapes, neutrals plus the three status colours, labels in a legend
// when a segment is too thin, and a caption naming the metric ids.

export const C = {
  fg1: "#141414",
  fg2: "#30313E",
  fg3: "#8A8C9F",
  line: "#E6E7EB",
  ghost: "#D4D6DD",
  green: "#28CA7C",
  greenBg: "#D6F5D6",
  greenFg: "#1d8a1d",
  amber: "#D7A820",
  amberBg: "#FBEDC3",
  amberFg: "#9E7A11",
  red: "#F1464B",
  redBg: "#F7D7DA",
  redFg: "#C24647",
  blue: "#4971FF",
  blueBg: "#D2DDFF",
  thisOne: "#4112B5",
}
export const HATCH =
  "repeating-linear-gradient(45deg,#D7A820 0 2px,#FBEDC3 2px 4px)"
/** Members are drawn as marks only below this count (design language). */
export const MARK_LIMIT = 700

const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ")
/** One decimal, without a trailing ".0": "54.6", "48". */
const plain = (value: number) => score(value).replace(/\.0$/, "")
const share = (value: number, total: number) =>
  `${total > 0 ? Math.max(0, (100 * value) / total) : 0}%`

export type LegendItem = { color: string; text: string }

export const Legend = ({
  items,
  full = false,
}: {
  items: LegendItem[]
  full?: boolean
}) => (
  <div className={cx(styles.chLegend, full && styles.chFull)}>
    {items.map((item) => (
      <span key={item.text}>
        <i className={styles.chSwatch} style={{ background: item.color }} />
        {item.text}
      </span>
    ))}
  </div>
)

const Caption = ({
  children,
  full = false,
}: {
  children: React.ReactNode
  full?: boolean
}) => (
  <div className={cx(styles.chCaption, full && styles.chFull)}>{children}</div>
)

/** A visual whose data is not computed yet says so instead of approximating. */
export const Tbd = ({ children }: { children: React.ReactNode }) => (
  <div className={styles.chTbd}>{children}</div>
)

/**
 * Cards 2.1 and 3.1: the two lenses, as shares of recorded life. Penalty time
 * can outlast a shortfall, so the red segment is clipped to the short time and
 * the legend keeps the true share.
 */
export const TwoLensesBar = ({
  inOrder,
  pastAllowance,
  caption,
}: {
  inOrder: number
  pastAllowance: number
  caption?: string
}) => {
  const short = Math.max(0, 100 - inOrder)
  const red = Math.min(pastAllowance, short)
  const items = [
    { pct: inOrder, color: C.green, text: `in order ${percent(inOrder)}` },
    {
      pct: short - red,
      color: C.amberBg,
      text: `short, within grace ${lifeShare(short - red)}`,
    },
    {
      pct: red,
      color: C.red,
      text: `past allowance ${lifeShare(pastAllowance)}`,
    },
  ]
  return (
    <div className={styles.ch}>
      <div
        className={styles.chBar}
        role="img"
        aria-label={items.map((item) => item.text).join("; ")}
      >
        {items.map((item) => (
          <div
            key={item.color}
            style={{
              width: `${item.pct}%`,
              background: item.color,
              minWidth: item.pct > 0 && item.pct < 0.6 ? 2 : undefined,
            }}
          />
        ))}
      </div>
      <Legend items={items} />
      {caption ? <Caption>{caption}</Caption> : null}
      {pastAllowance > short ? (
        <Caption>
          penalty time ({lifeShare(pastAllowance)}) outlasted the shortfall: the
          penalty clock winds down after a cure instead of resetting
        </Caption>
      ) : null}
    </div>
  )
}

/** Card 2.1: lifetime (M18) against the trailing 90 days (M67). */
export const TrendPair = ({
  lifetime,
  trailing,
  caption,
}: {
  lifetime: number
  trailing: number
  caption: string
}) => (
  <div className={styles.ch}>
    <div
      className={styles.chCols}
      style={{ maxWidth: 320, height: 54 }}
      role="img"
      aria-label={`${score(lifetime)} lifetime; ${score(
        trailing,
      )} last 90 days`}
    >
      {[
        { value: lifetime, color: C.fg2, label: "lifetime" },
        { value: trailing, color: C.fg3, label: "last 90 d" },
      ].map((column) => (
        <div
          key={column.label}
          className={styles.chCol}
          style={{
            height: `${Math.max(0, Math.min(100, column.value))}%`,
            background: column.color,
          }}
        >
          {score(column.value)} {column.label}
        </div>
      ))}
    </div>
    <Caption>{caption}</Caption>
  </div>
)

export type IncidentRow = { label: string; hours: number; graceHours: number }

/** Card 2.2: each market's longest episode against its own allowance; 100% sits mid-track. */
export const WorstIncidentBars = ({ rows }: { rows: IncidentRow[] }) => (
  <div className={cx(styles.ch, styles.chRows)}>
    {rows.map((row) => {
      const pct = (100 * row.hours) / row.graceHours
      const shown = pct >= 1000 ? `${count(pct)}%` : `${score(pct)}%`
      return (
        <React.Fragment key={row.label}>
          <span className={styles.chRowsLabel} title={row.label}>
            {row.label}
          </span>
          <div
            className={styles.chTrack}
            role="img"
            aria-label={`${row.label}: ${shown} of its allowance`}
          >
            <div
              className={styles.chFill}
              style={{
                width: `${Math.min(100, pct / 2)}%`,
                background: pct > 100 ? C.red : C.green,
              }}
            />
            <div className={styles.chGate} style={{ left: "50%" }} />
            {pct > 200 ? <span className={styles.chClip}>clipped</span> : null}
          </div>
          <span className={styles.chRowsValue}>
            {`${shown} (${hours(row.hours).replace(/ h$/, "")} of ${hours(
              row.graceHours,
            )})`}
          </span>
        </React.Fragment>
      )
    })}
    <Caption full>
      red line = 100% of the market&apos;s own allowance (M15)
    </Caption>
  </div>
)

export type MarkGroup = { count: number; color: string; label: string }

/** Cards 2.3 and 2.9: one mark per member. */
export const MarkArray = ({
  groups,
  shape = "square",
  caption,
}: {
  groups: MarkGroup[]
  shape?: "square" | "dot"
  caption?: string
}) => (
  <div className={styles.ch}>
    <div
      className={styles.chMarks}
      role="img"
      aria-label={groups
        .map((group) => `${group.label} ${count(group.count)}`)
        .join("; ")}
    >
      {groups.flatMap((group) =>
        Array.from({ length: Math.max(0, group.count) }, (_, index) => (
          <span
            key={`${group.label}-${index}`}
            className={cx(styles.chMark, shape === "dot" && styles.chMarkDot)}
            style={{ background: group.color }}
          />
        )),
      )}
    </div>
    {caption ? <Caption>{caption}</Caption> : null}
  </div>
)

export type Segment = { label: string; value: number; color: string }

/** One stacked bar; labels sit in the legend because slivers are too thin. */
export const StackedBar = ({
  segments,
  caption,
  format = count,
}: {
  segments: Segment[]
  caption?: string
  format?: (value: number) => string
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <div className={styles.ch}>
      <div
        className={styles.chBar}
        role="img"
        aria-label={segments
          .map((segment) => `${segment.label} ${format(segment.value)}`)
          .join("; ")}
      >
        {segments.map((segment) => (
          <div
            key={segment.label}
            style={{
              width: share(segment.value, total),
              background: segment.color,
              minWidth:
                segment.value > 0 && (100 * segment.value) / total < 0.6
                  ? 2
                  : undefined,
            }}
          />
        ))}
      </div>
      <Legend
        items={segments.map((segment) => ({
          color: segment.color,
          text: `${segment.label} ${format(segment.value)}`,
        }))}
      />
      {caption ? <Caption>{caption}</Caption> : null}
    </div>
  )
}

/** Card 2.5: penalty share (M42) against the 5% amber threshold. */
export const ThresholdSliver = ({
  sharePct,
  thresholdPct = 5,
  caption,
}: {
  sharePct: number
  thresholdPct?: number
  caption?: string
}) => (
  <div className={styles.ch}>
    <div
      className={cx(styles.chTrack, styles.chTrackTall)}
      role="img"
      aria-label={`${percent(
        sharePct,
        2,
      )} against the ${thresholdPct}% threshold`}
    >
      <div
        className={styles.chFill}
        style={{
          width: `${Math.min(100, sharePct)}%`,
          minWidth: sharePct > 0 ? 2 : 0,
          background: C.red,
        }}
      />
      <div
        className={cx(styles.chGate, styles.chGateAmber)}
        style={{ left: `${thresholdPct}%` }}
      />
      <span
        className={styles.chGateLabel}
        style={{ left: `${thresholdPct + 1}%` }}
      >
        {thresholdPct}% amber threshold
      </span>
    </div>
    {caption ? <Caption>{caption}</Caption> : null}
  </div>
)

/** A fill this wide holds its label inside; a narrower one takes it below. */
const LABEL_FITS = 45

/** Card 2.6: the line's fill, with a grey ghost at the second basis. */
export const FillBar = ({
  pct,
  label,
  ghostPct,
  caption,
}: {
  pct: number
  label: string
  ghostPct?: number
  caption?: string
}) => {
  const inside = pct >= LABEL_FITS
  return (
    <div className={styles.ch}>
      <div
        className={cx(styles.chTrack, styles.chTrackTall)}
        role="img"
        aria-label={label}
      >
        {ghostPct !== undefined ? (
          <div
            className={styles.chFill}
            style={{
              width: `${Math.min(100, ghostPct)}%`,
              background: C.ghost,
            }}
          />
        ) : null}
        <div
          className={cx(styles.chFill, inside && styles.chFillLabelled)}
          style={{
            width: `${Math.min(100, pct)}%`,
            minWidth: pct > 0 ? 2 : 0,
            background: C.fg2,
          }}
        >
          {inside ? <span className={styles.chFillText}>{label}</span> : null}
        </div>
      </div>
      <div
        className={cx(styles.chFillOut, inside && styles.chFillOutNarrow)}
        aria-hidden="true"
      >
        {label}
      </div>
      {caption ? <Caption>{caption}</Caption> : null}
    </div>
  )
}

const BUCKET_LABELS = ["under 6 h", "6 to 24 h", "24 to 48 h", "over 48 h"]

/** Card 2.8: finished episodes by length; the red baseline is the grace period. */
export const Histogram = ({
  buckets,
  compact = false,
  caption,
}: {
  buckets: number[]
  compact?: boolean
  caption?: string
}) => {
  const max = Math.max(1, ...buckets)
  const colour = (index: number) => {
    if (index === 3) return compact ? C.redBg : C.red
    if (index === 2) return compact ? C.blueBg : C.fg3
    return compact ? C.blueBg : C.fg2
  }
  return (
    <div className={cx(styles.ch, compact && styles.chWide)}>
      <div
        className={cx(styles.chColsHist, compact && styles.chColsCompact)}
        style={{ height: compact ? 36 : 90 }}
        role="img"
        aria-label={buckets
          .map((value, index) => `${BUCKET_LABELS[index]}: ${count(value)}`)
          .join("; ")}
      >
        {buckets.map((value, index) => (
          <div
            key={BUCKET_LABELS[index]}
            className={cx(styles.chCol, styles.chColHist)}
            style={{
              height: `${Math.max(3, (100 * value) / max)}%`,
              background: colour(index),
              alignSelf: "end",
            }}
          >
            {compact ? null : (
              <span className={styles.chColN}>{count(value)}</span>
            )}
          </div>
        ))}
      </div>
      <div className={cx(styles.chAxis, compact && styles.chAxisCompact)}>
        {(compact ? buckets.map((value) => count(value)) : BUCKET_LABELS).map(
          (label, index) => (
            <span key={BUCKET_LABELS[index]}>{label}</span>
          ),
        )}
      </div>
      {!compact && caption ? <Caption>{caption}</Caption> : null}
    </div>
  )
}

export type StateBox = {
  state: Tone
  label: string
  sub: string
  note?: string
  /** The state the market is in now. */
  live?: boolean
}

/** Card 2.4: the three right-now states side by side; the live one is marked. */
export const StateRow = ({ states }: { states: StateBox[] }) => (
  <div className={styles.chStates}>
    {states.map((box) => (
      <div
        key={box.label}
        className={cx(
          styles.chState,
          box.state === "green" && styles.chStateGreen,
          box.state === "amber" && styles.chStateAmber,
          box.state === "red" && styles.chStateRed,
          box.live && styles.chStateLive,
        )}
      >
        <div className={styles.chStateLabel}>{box.label}</div>
        <div className={styles.chStateSub}>{box.sub}</div>
        {box.note ? <div className={styles.chStateNote}>{box.note}</div> : null}
      </div>
    ))}
  </div>
)

export type WeightedMarket = { label: string; grade: number; days: number }

/** Card 3.1: width = Market age (M05), height = M18, dashed line = S05. */
export const AgeWeightedBars = ({
  markets,
  book,
}: {
  markets: WeightedMarket[]
  book: number
}) => (
  <div className={styles.ch}>
    <div
      className={styles.chWeighted}
      role="img"
      aria-label={`${markets
        .map(
          (market) =>
            `${market.label} ${score(market.grade)} over ${count(
              market.days,
            )} days`,
        )
        .join("; ")}; book ${score(book)}`}
    >
      <div className={styles.chWeightedLine} style={{ bottom: `${book}%` }} />
      <span
        className={styles.chWeightedLineLabel}
        style={{ bottom: `${book + 1}%` }}
      >
        {score(book)} book
      </span>
      {markets.map((market) => {
        const weak = market.grade < 85
        return (
          <div
            key={market.label}
            className={styles.chWeightedBar}
            style={{
              flex: market.days,
              height: `${Math.max(0, market.grade)}%`,
              background: weak ? C.amberBg : C.greenBg,
              color: weak ? C.amberFg : C.greenFg,
            }}
          >
            {score(market.grade)}
          </div>
        )
      })}
    </div>
    <div className={styles.chWeightedAxis}>
      {markets.map((market) => (
        <span
          key={market.label}
          style={{ flex: market.days }}
          title={`${market.label}, ${count(market.days)} days`}
        >
          {market.label}
          <br />
          {count(market.days)} d
        </span>
      ))}
    </div>
    <Caption>
      width = Market age (M05) · height = In order, cash there (M18) · line = In
      order, all markets (S05)
    </Caption>
  </div>
)

/** Card 3.4: markets now in three buckets; widths are counts, amounts whole-market debt. */
export const BucketBar = ({
  inOrder,
  within,
  withinDebt,
  past,
  pastDebt,
}: {
  inOrder: number
  within: number
  withinDebt: string
  past: number
  pastDebt: string
}) => {
  const total = inOrder + within + past
  const segments = [
    {
      n: inOrder,
      bg: C.greenBg,
      fg: C.greenFg,
      text: `in order: ${count(inOrder)} market${inOrder === 1 ? "" : "s"}`,
    },
    {
      n: within,
      bg: C.amberBg,
      fg: C.amberFg,
      text: `within allowance: ${withinDebt}`,
    },
    { n: past, bg: C.red, fg: "#fff", text: `past allowance: ${pastDebt}` },
  ]
  return (
    <div className={styles.ch}>
      <div
        className={cx(styles.chBar, styles.chBarTall)}
        role="img"
        aria-label={segments
          .filter((segment) => segment.n > 0)
          .map((segment) => segment.text)
          .join("; ")}
      >
        {segments.map((segment) => (
          <div
            key={segment.bg}
            className={styles.chBarSeg}
            style={{
              flex: segment.n ? segment.n : "0 0 3px",
              padding: segment.n ? undefined : 0,
              background: segment.bg,
              color: segment.fg,
            }}
            title={segment.n ? segment.text : undefined}
          >
            {segment.n ? segment.text : null}
          </div>
        ))}
      </div>
      <Caption>
        segment widths are market counts ({count(total)}); amounts are
        whole-market debt, not the shortfall
      </Caption>
    </div>
  )
}

/** Card 3.6: the share of the record from closed, fully repaid markets. */
export const CompletedBars = ({
  rows,
}: {
  rows: { label: string; settledPct: number; text: string }[]
}) => (
  <div className={cx(styles.ch, styles.chRows, styles.chRowsWide)}>
    {rows.map((row) => (
      <React.Fragment key={row.label}>
        <span className={styles.chRowsLabel} title={row.label}>
          {row.label}
        </span>
        <div className={cx(styles.chBar, styles.chBarMid)}>
          {row.settledPct > 0 ? (
            <>
              <div
                className={styles.chBarSeg}
                style={{
                  width: `${row.settledPct}%`,
                  background: C.fg2,
                  color: "#fff",
                }}
              >
                {row.text}
              </div>
              <div style={{ flex: 1, background: C.line }} />
            </>
          ) : (
            <div
              className={styles.chBarSeg}
              style={{ flex: 1, background: C.line, color: C.fg2 }}
            >
              {row.text}
            </div>
          )}
        </div>
      </React.Fragment>
    ))}
    <Caption full>
      dark = record from closed, fully repaid markets (S31, S32) · grey = live
      positions
    </Caption>
  </div>
)

export type LateShareRow = {
  label: string
  withinPct: number
  pastPct: number
  /** Late time per market (D17). */
  lateDays: string
}

/** Card 3.12 view 1: each market's late share, within and past the allowance. */
export const LateShareBars = ({
  rows,
  axisMax = 20,
}: {
  rows: LateShareRow[]
  axisMax?: number
}) => {
  const max = Math.max(
    axisMax,
    ...rows.map((row) => row.withinPct + row.pastPct),
  )
  return (
    <div
      className={cx(styles.ch, styles.chRows, styles.chRowsLate, styles.chWide)}
    >
      {rows.map((row) => (
        <React.Fragment key={row.label}>
          <span className={styles.chRowsLabel} title={row.label}>
            {row.label}
          </span>
          <div
            className={styles.chTrack}
            style={{ display: "flex", overflow: "hidden" }}
            title={`Late time per market (D17): ${row.lateDays}`}
            role="img"
            aria-label={`${row.label}: ${score(
              row.withinPct + row.pastPct,
            )}% of its life late, ${score(row.pastPct)}% past the allowance, ${
              row.lateDays
            } late`}
          >
            <div
              style={{
                width: share(row.withinPct, max),
                background: C.amberBg,
              }}
            />
            <div
              style={{
                width: share(row.pastPct, max),
                background: C.redFg,
                minWidth: row.pastPct > 0 ? 2 : 0,
              }}
            />
          </div>
          <span className={styles.chRowsValue}>
            <b>{score(row.withinPct + row.pastPct)}%</b>{" "}
            <span style={{ color: C.fg3 }}>
              ({score(row.pastPct)}) · {row.lateDays}
            </span>
          </span>
        </React.Fragment>
      ))}
      <Legend
        full
        items={[
          { color: C.amberBg, text: "within allowance" },
          { color: C.redFg, text: "past allowance" },
        ]}
      />
      <Caption full>
        axis 0 to {plain(max)}% · % of each market&apos;s own life late = H02 /
        H01 (quiet window included), split by M26 · days = Late time per market
        (D17)
      </Caption>
    </div>
  )
}

/** A comparison chip's rank: one bar per graded member, this one tall. */
export const RankStrip = ({
  position,
  population,
  label,
}: {
  position: number
  population: number
  label: string
}) => {
  const at = Math.min(Math.max(0, position), Math.max(0, population - 1))
  return (
    <div className={styles.ch}>
      <div
        role="img"
        aria-label={label}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          height: 26,
          maxWidth: population * 7,
        }}
      >
        {Array.from({ length: population }, (_, index) => (
          <span
            key={index}
            style={{
              flex: "1 1 0",
              minWidth: 1,
              height: index === at ? 26 : 12,
              borderRadius: 2,
              background: index === at ? C.thisOne : C.ghost,
            }}
          />
        ))}
      </div>
      <Caption>weakest to strongest</Caption>
    </div>
  )
}
