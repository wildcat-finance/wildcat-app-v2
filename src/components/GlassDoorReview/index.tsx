"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
import { useGetMarket } from "@/hooks/useGetMarket"
import { useMarketMla } from "@/hooks/useMarketMla"
import { ROUTES } from "@/routes"

import { borrowerTreatmentData } from "./borrowerTreatmentData"
import { CardWorkspace } from "./CardWorkspace"
import { SPEC_METRICS } from "./catalogue"
import { Decisions } from "./Decisions"
import { treatmentCardOf } from "./design"
import { REVIEW_NAV_ID } from "./gate"
import { CardSet, cardFor, MetricItem } from "./MetricItem"
import { MetricNav, ReviewView, useSlot } from "./MetricNav"
import { groupOf, recordGap, ReviewData, Source } from "./metrics"
import { optionsOn, resetOptions, setOption } from "./options"
import { PagePreview } from "./PagePreview"
import s from "./review.module.css"
import {
  changeChoice,
  contextFor,
  publicationContext,
  changeComparison,
  emptyReview,
  loadReview,
  markReviewed,
  REVIEW_KEY,
  ReviewConfiguration,
  ReviewContexts,
} from "./reviewState"
import {
  chosenTreatment,
  cardScope,
  ReviewScope,
  treatmentData,
  TreatmentCode,
  treatmentIssue,
} from "./treatmentData"

const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ")

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
    const borrowerById = borrowerReady
      ? byId(borrowerSpecs(borrowerReady))
      : undefined
    return {
      market: marketById,
      borrower: borrowerById,
      trouble: borrowerReady ? lateShareRows(borrowerReady) : undefined,
      closed: marketReady?.values.M77 === "Closed",
      treatments: {
        ...(marketReady && marketById
          ? treatmentData(marketReady, marketById)
          : {}),
        ...(borrowerReady && borrowerById
          ? borrowerTreatmentData(borrowerReady, borrowerById)
          : {}),
      },
    }
  }, [marketReady, borrowerReady, typeLabels])

  const [review, setReview] = useState<ReviewConfiguration>(emptyReview)
  const [loaded, setLoaded] = useState(false)
  const [storageError, setStorageError] = useState("")
  useEffect(() => {
    const read = () => {
      try {
        setReview(loadReview(window.localStorage))
        setLoaded(true)
        setStorageError("")
      } catch {
        setStorageError(
          "Saved configuration could not be read. Import a configuration or export your current choices before leaving.",
        )
      }
    }
    read()
    const sync = (event: StorageEvent) => {
      if (event.key === REVIEW_KEY || event.key === null) read()
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(REVIEW_KEY, JSON.stringify(review))
      setStorageError("")
    } catch {
      setStorageError(
        "This browser cannot save changes. Export your configuration before leaving.",
      )
    }
  }, [review, loaded])
  const [view, setView] = useState<ReviewView>("cards")
  const [card, setCard] = useState("2.1")
  const [previewScope, setPreviewScope] = useState<ReviewScope>("market")
  const [metricId, setMetricId] = useState("M18")
  const page = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLElement>(null)
  const navSlot = useSlot(REVIEW_NAV_ID)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = (next: ReviewView) => {
    setView(next)
    setMobileNavOpen(false)
    if (page.current) page.current.scrollTop = 0
    requestAnimationFrame(() => content.current?.focus({ preventScroll: true }))
  }
  const openCard = (next: string) => {
    setCard(next)
    navigate("cards")
  }
  const openMetric = (next: string) => {
    setMetricId(next)
    navigate("metrics")
  }
  const selectTreatment = (id: string, code?: TreatmentCode) => {
    if (
      code &&
      (!cards.treatments?.[id] || treatmentIssue(code, cards.treatments[id]))
    )
      return
    setLoaded(true)
    setReview((current) => changeChoice(current, id, code))
  }
  let activeScope = cardScope(card)
  if (view === "preview") activeScope = previewScope
  if (view === "metrics") activeScope = groupOf(metricId)
  const activeSource = data[activeScope]
  const publication =
    activeSource.status === "ok" ? activeSource.data.publication : undefined
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

  const borrowerName =
    borrower?.name ?? short(borrower?.address ?? queryBorrower ?? "")
  const marketName = market
    ? market.symbol ?? short(market.address)
    : marketReady?.market.symbol ?? short(queryMarket ?? "")
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

  const contexts: ReviewContexts = {
    market: marketReady
      ? publicationContext(
          marketReady.market,
          marketReady.publication,
          `${borrowerName} · ${marketName} (${chainName(chainId)})`,
        )
      : undefined,
    borrower: borrowerReady
      ? publicationContext(
          borrowerReady.borrower,
          borrowerReady.publication,
          `${borrowerName} (${chainName(chainId)})${
            borrowerReady.partial ? " · partial record" : ""
          }`,
        )
      : undefined,
  }
  const context = contextFor(card, contexts)
  const previewReason = (scope: ReviewScope) => {
    const gap = recordGap(data[scope], scope)
    return gap?.kind === "tbd" ? gap.reason : `Loading ${scope} analytics…`
  }
  const metric = SPEC_METRICS.find((entry) => entry.id === metricId)!
  const treatmentCard = treatmentCardOf(metric)
  const found = cardFor(card, data, cards)
  const nav = (
    <MetricNav
      view={view}
      card={card}
      metric={metricId}
      review={review}
      contexts={contexts}
      onView={navigate}
      onCard={openCard}
      onMetric={openMetric}
    />
  )
  const replaceReview = (next: ReviewConfiguration) => {
    setLoaded(true)
    setReview(next)
  }
  return (
    <div ref={page} className={s.page}>
      <header className={s.toolbar}>
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

        <div className={s.contextBar}>
          <button
            className={`${s.button} ${s.mobileNavButton}`}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            Browse
          </button>
          {cut ? (
            <details className={s.snapshot}>
              <summary>
                {chainName(chainId)} · Block {block(cut.block)}
              </summary>
              <div>
                {publication?.kind} · {longDate(cut.timestamp)}
              </div>
            </details>
          ) : null}
          {market && chainId ? (
            <Link
              href={`${ROUTES.lender.market}/${market.address}?chainId=${chainId}`}
              target="_blank"
              rel="noreferrer"
            >
              Live market ↗
            </Link>
          ) : null}
          {borrower && chainId ? (
            <Link
              href={`${ROUTES.lender.profile}/${borrower.address}?chainId=${chainId}#analytics`}
              target="_blank"
              rel="noreferrer"
            >
              Live borrower ↗
            </Link>
          ) : null}
        </div>
        {status.error || !marketReady || !listReady ? (
          <div
            role="status"
            className={cx(s.statusText, status.error && s.statusError)}
          >
            {status.text}
            {status.retry ? (
              <button className={s.button} onClick={status.retry}>
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {storageError ? (
          <p role="alert" className={s.error}>
            {storageError}
          </p>
        ) : null}
      </header>
      {mobileNavOpen ? <div className={s.mobileNav}>{nav}</div> : null}
      <main ref={content} tabIndex={-1} className={s.body}>
        {view === "cards" ? (
          <CardWorkspace
            card={card}
            datum={cards.treatments?.[card]}
            spec={"spec" in found ? found.spec : undefined}
            reason={"reason" in found ? found.reason : "No published data."}
            review={review}
            context={context}
            onCard={openCard}
            onChoose={selectTreatment}
            onComparison={(id, on) => {
              setLoaded(true)
              setReview((current) => changeComparison(current, id, on))
            }}
            onReviewed={(id, on) => {
              const snapshot = contextFor(id, contexts)
              if (snapshot) {
                setLoaded(true)
                setReview((current) => markReviewed(current, id, snapshot, on))
              }
            }}
            onPreview={() => {
              setPreviewScope(cardScope(card))
              navigate("preview")
            }}
          />
        ) : null}
        {view === "metrics" ? (
          <MetricItem
            key={metric.id}
            metric={metric}
            on={optionsOn(review.displays, metric.id)}
            data={data}
            cards={{
              ...cards,
              picks: review.picks,
              comparisons: review.comparisons,
            }}
            onToggle={(id, option, on) => {
              setLoaded(true)
              setReview((current) => ({
                ...current,
                displays: setOption(current.displays, [id], option, on),
              }))
            }}
            onReset={(id) =>
              setReview((current) => ({
                ...current,
                displays: resetOptions(current.displays, [id]),
              }))
            }
            treatmentCard={treatmentCard}
            treatment={
              treatmentCard
                ? chosenTreatment(review.picks, treatmentCard)
                : undefined
            }
            treatmentChanged={Boolean(
              treatmentCard && review.picks[treatmentCard],
            )}
            onOpenTreatments={openCard}
          />
        ) : null}
        {view === "decisions" ? (
          <Decisions
            review={review}
            contexts={contexts}
            datums={cards.treatments}
            onChange={replaceReview}
            onCard={openCard}
            onMetric={openMetric}
          />
        ) : null}
        {view === "preview" ? (
          <PagePreview
            market={marketReady}
            borrower={borrowerReady}
            scope={previewScope}
            onScope={setPreviewScope}
            marketReason={previewReason("market")}
            borrowerReason={previewReason("borrower")}
            borrowerName={borrowerName}
            typeLabels={typeLabels}
            cards={cards}
            review={review}
            onBack={() => navigate("cards")}
          />
        ) : null}
      </main>
      {navSlot ? (
        createPortal(nav, navSlot)
      ) : (
        <div className={s.fallbackNav}>{nav}</div>
      )}
    </div>
  )
}
