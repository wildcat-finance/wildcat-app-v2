"use client"

// Temporary: the metric review page (product#917). Remove with the page.
// Every Glass Door metric for one borrower and one of their markets, with
// display toggles saved in this browser, so Andreas can choose what ships.

import * as React from "react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createPortal } from "react-dom"

import type {
  ReviewBorrower,
  ReviewBorrowerList,
  ReviewMarket,
} from "@/app/api/glassdoor/v1/review/borrowers/list"
import {
  AnalyticsResult,
  BorrowerAnalytics,
  MarketAnalytics,
  useBorrowerAnalytics,
  useMarketAnalytics,
} from "@/components/GlassDoor/api"
import {
  borrowerSpecs,
  lateShareRows,
} from "@/components/GlassDoor/borrowerSpecs"
import { CardSpec } from "@/components/GlassDoor/card"
import { block, longDate } from "@/components/GlassDoor/format"
import { sameSnapshot } from "@/components/GlassDoor/MarketAnalytics"
import { marketSpecs } from "@/components/GlassDoor/marketSpecs"
import { marketTypeLabels } from "@/components/GlassDoor/typeLabels"
import { metric as metricLabel } from "@/components/GlassDoor/wording"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useMarketMla } from "@/hooks/useMarketMla"
import { ROUTES } from "@/routes"

import { SPEC_METRICS } from "./catalogue"
import { Chevron } from "./Chevron"
import { REVIEW_NAV_ID } from "./gate"
import { CardSet, MetricItem } from "./MetricItem"
import { MetricNav, useActiveMetric, useSlot } from "./MetricNav"
import {
  findMetric,
  GROUPS,
  Group,
  groupOf,
  metricsIn,
  recordGap,
  ReviewData,
  reviewReason,
  Source,
} from "./metrics"
import {
  countsText,
  DISPLAY_OPTIONS,
  isOn,
  loadPicks,
  loadShown,
  loadToggles,
  optionCounts,
  OptionKey,
  optionsOn,
  resetOptions,
  savePicks,
  saveShown,
  saveToggles,
  setOption,
  SHOWN_KEY,
  STORAGE_KEY,
  summary,
  summaryText,
  Toggles,
} from "./options"
import s from "./review.module.css"
import {
  choose,
  TREATMENT_KEY,
  TreatmentCode,
  treatmentData,
  treatmentLines,
  TreatmentPicks,
} from "./treatmentData"

const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ")

// v2 adds the summary, which starts collapsed.
const COLLAPSE_KEY = "glassdoor-review:collapsed:v2"
type Section = Group | "summary"
const SECTIONS: Section[] = [...GROUPS.map((group) => group.key), "summary"]
const DEFAULT_COLLAPSED: Section[] = ["summary"]

const CHAINS: Record<number, string> = { 1: "Ethereum", 9745: "Plasma" }
const chainName = (chainId?: number) =>
  chainId ? CHAINS[chainId] ?? `chain ${chainId}` : ""

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

const borrowerKey = (row: { chainId: number; address: string }) =>
  `${row.chainId}:${row.address}`

const borrowerLabel = (row: ReviewBorrower) =>
  [
    row.name ?? short(row.address),
    row.chainId === 1 ? null : chainName(row.chainId),
    `${row.markets.length} ${row.markets.length === 1 ? "market" : "markets"}`,
  ]
    .filter(Boolean)
    .join(" · ")

const marketLabel = (row: ReviewMarket) =>
  [
    row.symbol ?? short(row.address),
    row.name,
    row.status === "Closed" ? "finished" : null,
    row.state === "Ok" ? null : row.state,
  ]
    .filter(Boolean)
    .join(" · ")

/** Labels that would read the same get the short address. */
const distinct = <T extends { address: string }>(
  rows: T[],
  label: (row: T) => string,
) => {
  const labels = rows.map(label)
  return new Map(
    rows.map((row, index) => [
      row.address + ("chainId" in row ? `:${String(row.chainId)}` : ""),
      labels.filter((text) => text === labels[index]).length > 1
        ? `${labels[index]} · ${short(row.address)}`
        : labels[index],
    ]),
  )
}

const useReviewBorrowers = () =>
  useQuery({
    queryKey: ["glassdoor-review", "borrowers"],
    queryFn: async () => {
      const response = await fetch("/api/glassdoor/v1/review/borrowers")
      if (!response.ok)
        throw new Error(`Review list answered ${response.status}`)
      return (await response.json()) as ReviewBorrowerList
    },
    staleTime: 60_000,
    retry: 1,
  })

type Query<T> = {
  isLoading: boolean
  isError: boolean
  data?: AnalyticsResult<T>
}

const toSource = <T,>(query: Query<T>, selected: boolean): Source<T> => {
  if (!selected) return { status: "none" }
  if (query.isLoading) return { status: "loading" }
  if (query.isError || !query.data) return { status: "error" }
  if (query.data.status === "ok") return { status: "ok", data: query.data.data }
  return { status: query.data.status }
}

const byId = (specs: CardSpec[]) =>
  Object.fromEntries(specs.map((spec) => [spec.id, spec]))

/** Scrolls a section or metric into view below the toolbar and focuses it. */
const jumpTo = (id: string) => {
  const target = document.getElementById(id)
  if (!target) return false
  target.scrollIntoView({ block: "start" })
  target.focus({ preventScroll: true })
  return true
}

/** A group's bulk switch per option: on when every metric has it on. */
const BulkToggle = ({
  label,
  ids,
  option,
  toggles,
  onChange,
}: {
  label: string
  ids: string[]
  option: OptionKey
  toggles: Toggles
  onChange: (ids: string[], option: OptionKey, on: boolean) => void
}) => {
  const ref = useRef<HTMLInputElement>(null)
  const onCount = ids.filter((id) => isOn(toggles, id, option)).length
  const all = onCount === ids.length
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = onCount > 0 && !all
  }, [onCount, all])
  return (
    <label className={s.toggle}>
      <input
        ref={ref}
        type="checkbox"
        checked={all}
        onChange={(event) => onChange(ids, option, event.target.checked)}
      />
      <span>
        {label} {onCount}/{ids.length}
      </span>
    </label>
  )
}

/** "Go to metric": pick a "Name (ID)" from the list, or type an id and Enter. */
const GoToMetric = ({ onGo }: { onGo: (id: string) => void }) => {
  const [text, setText] = useState("")
  const [missed, setMissed] = useState(false)
  const listId = useId()
  const go = (value: string) => {
    const id = findMetric(value)
    if (id) {
      onGo(id)
      setText("")
      setMissed(false)
      return
    }
    setMissed(true)
  }
  return (
    <span className={s.goto}>
      <input
        className={s.gotoInput}
        list={listId}
        value={text}
        placeholder="Go to metric: name or ID"
        aria-label="Go to metric"
        aria-invalid={missed || undefined}
        onChange={(event) => {
          const { value } = event.target
          setText(value)
          setMissed(false)
          // A pick from the list is a full label: go straight there.
          if (
            SPEC_METRICS.some(
              (metric) => metricLabel(metric.id) === value.trim(),
            )
          )
            go(value)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            go(text)
          }
        }}
      />
      <datalist id={listId}>
        {SPEC_METRICS.map((metric) => (
          <option key={metric.id} value={metricLabel(metric.id)}>
            {metricLabel(metric.id)}
          </option>
        ))}
      </datalist>
      {missed ? <span className={s.warn}>no match</span> : null}
    </span>
  )
}

type Status = { text: string; toggles: Toggles; undo?: Toggles }

const Summary = ({
  toggles,
  picks,
  context,
  collapsed,
  onCollapse,
  onChange,
  onGo,
}: {
  toggles: Toggles
  /** Chosen display treatment per market card. */
  picks: TreatmentPicks
  /** Which selection and publication the review was made against. */
  context: string[]
  collapsed: boolean
  onCollapse: () => void
  onChange: (next: Toggles) => void
  /** Opens a metric, expanding its group if it is collapsed. */
  onGo: (id: string) => void
}) => {
  const link = (id: string, label: string) => (
    <a
      href={`#metric-${id}`}
      onClick={(event) => {
        event.preventDefault()
        onGo(id)
      }}
    >
      {label}
    </a>
  )
  const [status, setStatus] = useState<Status>()
  const groups = summary(toggles)
  const treatments = treatmentLines(picks)
  // A message belongs to the toggles it describes; any later change clears it.
  const shown = status?.toggles === toggles ? status : undefined
  const copy = async () => {
    setStatus(undefined)
    const copied = `Copied ${longDate(Date.now() / 1_000)}.`
    try {
      await navigator.clipboard.writeText(
        summaryText(
          toggles,
          [...context, copied],
          treatments.map((line) => line.text),
        ),
      )
      setStatus({ text: "Copied.", toggles })
    } catch {
      setStatus({
        text: "Copy failed: select the list below instead.",
        toggles,
      })
    }
  }
  const reset = () => {
    const { changed } = optionCounts(toggles)
    if (!changed) {
      setStatus({ text: "Already at the design defaults.", toggles })
      return
    }
    const next: Toggles = {}
    onChange(next)
    setStatus({
      text: `Reset ${changed} ${
        changed === 1 ? "metric" : "metrics"
      } to their design defaults.`,
      toggles: next,
      undo: toggles,
    })
  }
  const undo = () => {
    if (!shown?.undo) return
    onChange(shown.undo)
    setStatus({ text: "Restored.", toggles: shown.undo })
  }
  return (
    <section
      id="summary"
      className={cx(s.summary, collapsed && s.summaryCollapsed)}
      aria-labelledby="summary-title"
      tabIndex={-1}
    >
      <div className={s.summaryHead}>
        <h2 id="summary-title" className={s.summaryTitle}>
          <button
            type="button"
            className={s.groupToggle}
            aria-expanded={!collapsed}
            aria-controls="summary-body"
            onClick={onCollapse}
          >
            <Chevron />
            <span>Summary: metrics and display options on</span>
          </button>
        </h2>
        <div className={s.summaryActions}>
          <button type="button" className={s.button} onClick={copy}>
            Copy summary
          </button>
          <button type="button" className={s.button} onClick={reset}>
            Reset to design defaults
          </button>
          <span className={s.status} role="status">
            {shown?.text}
          </span>
          {shown?.undo ? (
            <button type="button" className={s.button} onClick={undo}>
              Undo
            </button>
          ) : null}
        </div>
      </div>
      <div id="summary-body" className={s.summaryBody} hidden={collapsed}>
        {context.map((line) => (
          <p key={line} className={s.summaryNote}>
            {line}
          </p>
        ))}
        <p className={s.counts}>{countsText(toggles)}</p>
        <div className={s.summaryGroups}>
          {groups.map((group) => (
            <div key={group.key}>
              <h3 className={s.partTitle}>
                {group.title} ({group.lines.length} with an option on)
              </h3>
              {group.lines.length ? (
                <ul className={s.summaryList}>
                  {group.lines.map((line) => (
                    <li
                      key={line.id}
                      className={line.changed ? s.lineChanged : s.lineDefault}
                    >
                      {link(line.id, line.label)}
                      <span>
                        {line.options.join(", ")}
                        {line.changed ? " (changed)" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className={s.offLine}>
                <b>No display ({group.off.length}):</b>{" "}
                {group.off.length
                  ? group.off.map((line, index) => (
                      <React.Fragment key={line.id}>
                        {index ? "; " : ""}
                        {link(line.id, line.label)}
                      </React.Fragment>
                    ))
                  : "none"}
              </p>
            </div>
          ))}
        </div>
        <div>
          <h3 className={s.partTitle}>
            Display treatments (A–P) per market card
          </h3>
          <ul className={s.summaryList}>
            {treatments.map((line) => (
              <li
                key={line.card}
                className={line.changed ? s.lineChanged : s.lineDefault}
              >
                <span>{line.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const GroupSection = ({
  group,
  toggles,
  shown,
  picks,
  data,
  cards,
  collapsed,
  onCollapse,
  onToggle,
  onBulk,
  onReset,
  onTreatment,
}: {
  group: { key: Group; title: string }
  toggles: Toggles
  /** The metrics chosen in the sidebar list; only these render. */
  shown: ReadonlySet<string>
  picks: TreatmentPicks
  data: ReviewData
  cards: CardSet
  collapsed: boolean
  onCollapse: (key: Group) => void
  onToggle: (id: string, key: OptionKey, on: boolean) => void
  onBulk: (ids: string[], key: OptionKey, on: boolean) => void
  onReset: (id: string) => void
  onTreatment: (card: string, code: TreatmentCode) => void
}) => {
  const metrics = metricsIn(group.key)
  const ids = metrics.map((metric) => metric.id)
  const visible = metrics.filter((metric) => shown.has(metric.id))
  let note: string | undefined
  if (!visible.length)
    note = `No ${group.key} metrics shown. Select their IDs in the metric list on the left, or use Go to metric above.`
  else if (collapsed)
    note = `${visible.length} shown ${
      visible.length === 1 ? "metric" : "metrics"
    } collapsed. Select the heading to expand.`
  const titleId = `group-${group.key}-title`
  const listId = `group-${group.key}-list`
  const reason = reviewReason(
    group.key === "market" ? data.market : data.borrower,
  )
  return (
    <section
      id={`group-${group.key}`}
      className={s.group}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className={s.groupHead}>
        <h2 id={titleId} className={s.groupTitle}>
          <button
            type="button"
            className={s.groupToggle}
            aria-expanded={!collapsed}
            aria-controls={listId}
            onClick={() => onCollapse(group.key)}
          >
            <Chevron />
            <span>
              {`${group.title} `}
              <span className={s.groupCount}>
                ({visible.length} of {metrics.length} shown)
              </span>
            </span>
          </button>
        </h2>
        <div className={s.bulk} role="group" aria-label={`All ${group.title}`}>
          <span>All in this group:</span>
          {DISPLAY_OPTIONS.map((option) => (
            <BulkToggle
              key={option.key}
              label={option.label}
              ids={ids}
              option={option.key}
              toggles={toggles}
              onChange={onBulk}
            />
          ))}
        </div>
      </div>
      {reason ? (
        <p className={s.banner} role="note">
          This {group.key} is under review, so its values are withheld: {reason}
        </p>
      ) : null}
      <div id={listId} className={s.groupList} hidden={collapsed}>
        {collapsed
          ? null
          : visible.map((metric) => (
              <MetricItem
                key={metric.id}
                metric={metric}
                on={optionsOn(toggles, metric.id)}
                data={data}
                cards={cards}
                onToggle={onToggle}
                onReset={onReset}
                picks={picks}
                onTreatment={onTreatment}
              />
            ))}
      </div>
      {note ? <p className={s.collapsedNote}>{note}</p> : null}
    </section>
  )
}

export const MetricReview = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const list = useReviewBorrowers()

  const chainId = Number(params.get("chainId")) || undefined
  const borrowerAddress = params.get("borrower")?.toLowerCase() || undefined
  const marketAddress = params.get("market")?.toLowerCase() || undefined
  const borrowers = list.data?.borrowers
  const listReady = Boolean(list.data)
  const borrower = borrowers?.find(
    (row) => row.chainId === chainId && row.address === borrowerAddress,
  )
  const market = borrower?.markets.find((row) => row.address === marketAddress)

  const select = useCallback(
    (next: { chainId?: number; borrower?: string; market?: string }) => {
      const query = new URLSearchParams()
      if (next.chainId) query.set("chainId", String(next.chainId))
      if (next.borrower) query.set("borrower", next.borrower)
      if (next.market) query.set("market", next.market)
      router.replace(`${pathname}?${query.toString()}`, { scroll: false })
    },
    [pathname, router],
  )

  // Each borrower reopens on the market last reviewed for it.
  const lastMarket = useRef(new Map<string, string>())
  useEffect(() => {
    if (borrower && market)
      lastMarket.current.set(borrowerKey(borrower), market.address)
  }, [borrower, market])
  const marketFor = (row?: ReviewBorrower) => {
    if (!row) return undefined
    const remembered = lastMarket.current.get(borrowerKey(row))
    return (
      row.markets.find((entry) => entry.address === remembered) ??
      row.markets[0]
    )
  }
  const marketForRef = useRef(marketFor)
  marketForRef.current = marketFor

  // The market selector only lists the borrower's markets; keep one chosen.
  useEffect(() => {
    const next = marketForRef.current(borrower)
    if (borrower && !market && next)
      select({
        chainId: borrower.chainId,
        borrower: borrower.address,
        market: next.address,
      })
  }, [borrower, market, select])

  // Arrowing through the borrower list waits briefly before loading each one.
  const currentKey = borrower ? borrowerKey(borrower) : ""
  const [pendingKey, setPendingKey] = useState<string>()
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => setPendingKey(undefined), [currentKey])
  useEffect(() => () => clearTimeout(pendingTimer.current), [])
  const chooseBorrower = (key: string) => {
    setPendingKey(key)
    clearTimeout(pendingTimer.current)
    pendingTimer.current = setTimeout(() => {
      const next = borrowers?.find((row) => borrowerKey(row) === key)
      select({
        chainId: next?.chainId,
        borrower: next?.address,
        market: marketForRef.current(next)?.address,
      })
    }, 300)
  }

  // Before the list arrives, a link's selection loads straight away.
  const queryChain = !listReady || borrower ? chainId : undefined
  const queryMarket = listReady ? market?.address : marketAddress
  const queryBorrower = listReady ? borrower?.address : borrowerAddress
  const marketQuery = useMarketAnalytics(
    queryMarket ? queryChain : undefined,
    queryMarket,
  )
  const borrowerQuery = useBorrowerAnalytics(
    queryBorrower ? queryChain : undefined,
    queryBorrower,
  )
  const {
    data: marketResult,
    isLoading: marketLoading,
    isError: marketError,
  } = marketQuery
  const {
    data: borrowerResult,
    isLoading: borrowerLoading,
    isError: borrowerError,
  } = borrowerQuery
  const sdk = useGetMarket({ address: queryMarket, chainId: queryChain })
  const sdkMarket = sdk.data ?? sdk.indexedMarket
  const mla = useMarketMla(sdkMarket?.address, sdkMarket?.chainId)
  const typeLabels = useMemo(
    () =>
      sdkMarket && !mla.isLoading
        ? marketTypeLabels(sdkMarket, mla.data)
        : undefined,
    [sdkMarket, mla.data, mla.isLoading],
  )
  const typeLabelsLoading =
    Boolean(queryMarket) &&
    !typeLabels &&
    (sdk.apiLoading || sdk.isLoading || mla.isLoading)

  const marketSelected = Boolean(queryMarket && queryChain)
  const borrowerSelected = Boolean(queryBorrower && queryChain)
  const marketSource = useMemo(
    () =>
      toSource<MarketAnalytics>(
        { data: marketResult, isLoading: marketLoading, isError: marketError },
        marketSelected,
      ),
    [marketResult, marketLoading, marketError, marketSelected],
  )
  const borrowerSource = useMemo(
    () =>
      toSource<BorrowerAnalytics>(
        {
          data: borrowerResult,
          isLoading: borrowerLoading,
          isError: borrowerError,
        },
        borrowerSelected,
      ),
    [borrowerResult, borrowerLoading, borrowerError, borrowerSelected],
  )
  const marketReady =
    marketSource.status === "ok" && !recordGap(marketSource, "market")
      ? marketSource.data
      : undefined
  const borrowerReady =
    borrowerSource.status === "ok" && !recordGap(borrowerSource, "borrower")
      ? borrowerSource.data
      : undefined

  const data: ReviewData = useMemo(
    () => ({
      market: marketSource,
      borrower: borrowerSource,
      typeLabels,
      typeLabelsLoading,
    }),
    [marketSource, borrowerSource, typeLabels, typeLabelsLoading],
  )

  const cards: CardSet = useMemo(() => {
    const matching =
      marketReady && borrowerReady && sameSnapshot(marketReady, borrowerReady)
        ? borrowerReady
        : undefined
    const marketCards = marketReady
      ? marketSpecs(marketReady, matching, typeLabels)
      : undefined
    const marketById = marketCards
      ? byId([...marketCards.rowA, ...marketCards.supporting])
      : undefined
    return {
      market: marketById,
      borrower: borrowerReady ? byId(borrowerSpecs(borrowerReady)) : undefined,
      trouble: borrowerReady ? lateShareRows(borrowerReady) : undefined,
      closed: marketReady?.values.M77 === "Closed",
      treatments:
        marketReady && marketById
          ? treatmentData(marketReady, marketById)
          : undefined,
    }
  }, [marketReady, borrowerReady, typeLabels])

  // Toggle states: loaded after mount, saved on change, and kept in step
  // with other tabs of this page.
  const [toggles, setToggles] = useState<Toggles>({})
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState<boolean>()
  // The metrics shown, chosen in the sidebar list: none until picked.
  const [shown, setShown] = useState<string[]>([])
  // The display treatment chosen per market card.
  const [picks, setPicks] = useState<TreatmentPicks>({})
  useEffect(() => {
    setToggles(loadToggles())
    setShown(loadShown())
    setPicks(loadPicks())
    setLoaded(true)
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        setToggles(loadToggles())
      if (event.key === SHOWN_KEY || event.key === null) setShown(loadShown())
      if (event.key === TREATMENT_KEY || event.key === null)
        setPicks(loadPicks())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  useEffect(() => {
    if (loaded) setSaved(saveToggles(toggles))
  }, [toggles, loaded])
  useEffect(() => {
    if (loaded) saveShown(shown)
  }, [shown, loaded])
  useEffect(() => {
    if (loaded) savePicks(picks)
  }, [picks, loaded])
  const shownSet = useMemo(() => new Set(shown), [shown])
  const onTreatment = useCallback(
    (card: string, code: TreatmentCode) =>
      setPicks((current) => choose(current, card, code)),
    [],
  )
  const onToggle = useCallback(
    (id: string, key: OptionKey, on: boolean) =>
      setToggles((current) => setOption(current, [id], key, on)),
    [],
  )
  const onReset = useCallback(
    (id: string) => setToggles((current) => resetOptions(current, [id])),
    [],
  )

  // Collapsed groups, remembered in this browser only.
  const [collapsed, setCollapsed] = useState<Section[]>(DEFAULT_COLLAPSED)
  const [collapseLoaded, setCollapseLoaded] = useState(false)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY)
      const raw: unknown = stored === null ? null : JSON.parse(stored)
      if (Array.isArray(raw))
        setCollapsed(SECTIONS.filter((key) => raw.includes(key)))
    } catch {
      // A convenience only: the groups start expanded, the summary collapsed.
    }
    setCollapseLoaded(true)
  }, [])
  useEffect(() => {
    if (!collapseLoaded) return
    try {
      window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed))
    } catch {
      // Not remembered; nothing else depends on it.
    }
  }, [collapsed, collapseLoaded])
  const onCollapse = useCallback(
    (key: Section) =>
      setCollapsed((current) =>
        current.includes(key)
          ? current.filter((entry) => entry !== key)
          : [...current, key],
      ),
    [],
  )
  // Going to a metric or the summary expands it first, then scrolls once it
  // renders.
  const [jump, setJump] = useState<{ target: string }>()
  const open = useCallback((section: Section, target: string) => {
    setCollapsed((current) => current.filter((entry) => entry !== section))
    setJump({ target })
  }, [])
  /** Shows a metric if it is hidden, then scrolls to it. */
  const goToMetric = useCallback(
    (id: string) => {
      setShown((current) => (current.includes(id) ? current : [...current, id]))
      open(groupOf(id), `metric-${id}`)
    },
    [open],
  )
  // The sidebar list shows or hides a metric; a newly shown one is scrolled to.
  const shownRef = useRef(shown)
  shownRef.current = shown
  const toggleShown = useCallback(
    (id: string) => {
      if (shownRef.current.includes(id))
        setShown((current) => current.filter((entry) => entry !== id))
      else goToMetric(id)
    },
    [goToMetric],
  )
  const showGroup = useCallback(
    (key: Group, show: boolean) => {
      setShown((current) => {
        const rest = current.filter((id) => groupOf(id) !== key)
        return show ? [...rest, ...metricsIn(key).map((m) => m.id)] : rest
      })
      if (show) open(key, `group-${key}`)
    },
    [open],
  )
  const goToSummary = useCallback(() => open("summary", "summary"), [open])
  const onCollapseSummary = useCallback(
    () => onCollapse("summary"),
    [onCollapse],
  )
  useEffect(() => {
    if (jump && jumpTo(jump.target)) setJump(undefined)
  }, [jump, collapsed])

  const onBulk = useCallback(
    (ids: string[], key: OptionKey, on: boolean) =>
      setToggles((current) => setOption(current, ids, key, on)),
    [],
  )

  // Jump targets land below the sticky toolbar, whatever its height.
  const page = useRef<HTMLDivElement>(null)
  const toolbar = useRef<HTMLElement>(null)
  useEffect(() => {
    const header = toolbar.current
    const scroller = page.current
    if (!header || !scroller || typeof ResizeObserver === "undefined")
      return undefined
    const measure = () =>
      scroller.style.setProperty("--toolbar-h", `${header.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // The metric list in the app's sidebar, which marks the metric in view.
  const navSlot = useSlot(REVIEW_NAV_ID)
  const activeMetric = useActiveMetric(
    page,
    toolbar,
    `${collapsed.join()}|${shown.join()}`,
  )
  const goToGroup = useCallback((key: Group) => {
    jumpTo(`group-${key}`)
  }, [])

  const publication =
    (marketSource.status === "ok" && marketSource.data.publication) ||
    (borrowerSource.status === "ok" && borrowerSource.data.publication) ||
    undefined
  const onCount = summary(toggles).reduce(
    (total, group) => total + group.lines.length,
    0,
  )
  const chains = [...new Set((borrowers ?? []).map((row) => row.chainId))]
  const borrowerLabels = useMemo(
    () => distinct(borrowers ?? [], borrowerLabel),
    [borrowers],
  )
  const marketLabels = useMemo(
    () => distinct(borrower?.markets ?? [], marketLabel),
    [borrower],
  )
  const labelOfBorrower = (row: ReviewBorrower) =>
    borrowerLabels.get(`${row.address}:${row.chainId}`) ?? borrowerLabel(row)
  const labelOfMarket = (row: ReviewMarket) =>
    marketLabels.get(row.address) ?? marketLabel(row)
  const selectedBorrowerKey = pendingKey ?? currentKey
  const selectedBorrower = borrowers?.find(
    (row) => borrowerKey(row) === selectedBorrowerKey,
  )
  const openMarkets = borrower?.markets.filter((row) => row.status !== "Closed")
  const finishedMarkets = borrower?.markets.filter(
    (row) => row.status === "Closed",
  )

  const borrowerName = borrower?.name ?? short(borrower?.address ?? "")
  const marketName = market ? market.symbol ?? short(market.address) : ""
  const cut = publication?.cut
  const publicationText = publication
    ? ` · publication ${publication.kind}${
        cut ? ` · block ${block(cut.block)} · ${longDate(cut.timestamp)}` : ""
      }`
    : ""

  let status: { text: string; error?: boolean; retry?: () => void }
  const failed = [
    marketSource.status === "error" && "market",
    borrowerSource.status === "error" && "borrower",
  ].filter(Boolean)
  if (list.isError && !listReady)
    status = {
      text: "The borrower list could not be loaded.",
      error: true,
      retry: () => {
        list.refetch()
      },
    }
  else if (!listReady)
    status = {
      text: borrowerAddress
        ? "Loading the borrower list and this selection…"
        : "Loading borrowers…",
    }
  else if (borrowerAddress && !borrower)
    status = {
      text: "The borrower in this link is not in the current publication. Pick one above.",
      error: true,
    }
  else if (!borrower)
    status = { text: "Select a borrower and one of their markets." }
  else if (!market)
    status = { text: `Choosing one of ${borrowerName}'s markets…` }
  else if (failed.length)
    status = {
      text: `The ${failed.join(" and ")} analytics could not be loaded.`,
      error: true,
      retry: () => {
        if (marketError) marketQuery.refetch()
        if (borrowerError) borrowerQuery.refetch()
      },
    }
  else if (
    marketSource.status === "loading" ||
    borrowerSource.status === "loading"
  )
    status = { text: `Loading ${borrowerName} · ${marketName}…` }
  else
    status = {
      text: `Showing ${borrowerName} · ${marketName}${
        market?.status === "Closed" ? " (finished market)" : ""
      } on ${chainName(chainId)}${publicationText}`,
    }

  const context =
    borrower && market
      ? [
          `Reviewed against ${borrowerName} · ${marketName} (${chainName(
            borrower.chainId,
          )})${publicationText.replace(/^ · /, ", ")}.`,
        ]
      : []

  return (
    <div ref={page} className={s.page}>
      <div className={s.intro}>
        <h1 className={s.title}>Glass Door metric review</h1>
      </div>
      <header ref={toolbar} className={s.toolbar}>
        <div className={s.selectors}>
          <label className={s.field}>
            <span className={s.fieldLabel}>Borrower</span>
            <select
              className={s.select}
              value={selectedBorrowerKey}
              title={selectedBorrower ? labelOfBorrower(selectedBorrower) : ""}
              onChange={(event) => chooseBorrower(event.target.value)}
            >
              <option value="">
                {list.isLoading ? "Loading borrowers…" : null}
                {list.isError && !listReady
                  ? "Borrower list unavailable"
                  : null}
                {listReady
                  ? `Select a borrower (${borrowers?.length ?? 0})`
                  : null}
              </option>
              {chains.map((chain) => (
                <optgroup key={chain} label={chainName(chain)}>
                  {borrowers
                    ?.filter((row) => row.chainId === chain)
                    .map((row) => (
                      <option key={borrowerKey(row)} value={borrowerKey(row)}>
                        {labelOfBorrower(row)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className={cx(s.field, s.fieldWide)}>
            <span className={s.fieldLabel}>Market</span>
            <select
              className={s.select}
              value={market?.address ?? ""}
              title={market ? labelOfMarket(market) : ""}
              disabled={!borrower}
              onChange={(event) =>
                select({
                  chainId,
                  borrower: borrower?.address,
                  market: event.target.value || undefined,
                })
              }
            >
              {borrower ? null : (
                <option value="">Select a borrower first</option>
              )}
              {openMarkets?.length ? (
                <optgroup label="Open">
                  {openMarkets.map((row) => (
                    <option key={row.address} value={row.address}>
                      {labelOfMarket(row)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {finishedMarkets?.length ? (
                <optgroup label="Finished">
                  {finishedMarkets.map((row) => (
                    <option key={row.address} value={row.address}>
                      {labelOfMarket(row)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
        </div>
        <div className={s.statusRow}>
          <span
            className={cx(s.statusText, status.error && s.statusError)}
            role="status"
          >
            {status.text}
          </span>
          {status.retry ? (
            <button type="button" className={s.button} onClick={status.retry}>
              Retry
            </button>
          ) : null}
          <span className={s.live}>
            {market && chainId ? (
              <Link
                href={`${ROUTES.lender.market}/${market.address}?chainId=${chainId}`}
                target="_blank"
                rel="noreferrer"
              >
                Live market analytics →
              </Link>
            ) : null}
            {borrower && chainId ? (
              <Link
                href={`${ROUTES.lender.profile}/${borrower.address}?chainId=${chainId}#analytics`}
                target="_blank"
                rel="noreferrer"
              >
                Live borrower analytics →
              </Link>
            ) : null}
          </span>
        </div>
        <nav className={s.jump} aria-label="Sections">
          <GoToMetric onGo={goToMetric} />
          {GROUPS.map((group) => (
            <a
              key={group.key}
              href={`#group-${group.key}`}
              onClick={(event) => {
                if (jumpTo(`group-${group.key}`)) event.preventDefault()
              }}
            >
              {`${group.title} (${
                metricsIn(group.key).filter((metric) => shownSet.has(metric.id))
                  .length
              } of ${metricsIn(group.key).length} shown)`}
            </a>
          ))}
          <a
            href="#summary"
            onClick={(event) => {
              event.preventDefault()
              goToSummary()
            }}
          >
            Summary ({onCount} metrics with an option on)
          </a>
          <span
            className={cx(s.saved, saved === false && s.warn)}
            role="status"
          >
            {saved === false
              ? "Not saved: this browser blocks storage. Copy the summary before leaving."
              : null}
          </span>
        </nav>
      </header>
      <main className={s.body}>
        {GROUPS.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            toggles={toggles}
            shown={shownSet}
            picks={picks}
            data={data}
            cards={cards}
            collapsed={collapsed.includes(group.key)}
            onCollapse={onCollapse}
            onToggle={onToggle}
            onBulk={onBulk}
            onReset={onReset}
            onTreatment={onTreatment}
          />
        ))}
        <Summary
          toggles={toggles}
          picks={picks}
          context={context}
          collapsed={collapsed.includes("summary")}
          onCollapse={onCollapseSummary}
          onChange={setToggles}
          onGo={goToMetric}
        />
      </main>
      {navSlot
        ? createPortal(
            <MetricNav
              toggles={toggles}
              shown={shown}
              active={activeMetric}
              collapsed={collapsed}
              onToggleShown={toggleShown}
              onShowGroup={showGroup}
              onGoGroup={goToGroup}
            />,
            navSlot,
          )
        : null}
    </div>
  )
}
