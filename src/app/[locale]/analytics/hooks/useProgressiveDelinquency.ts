"use client"

import { useState, useEffect } from "react"

import { querySubgraph, type AsyncState } from "./useSubgraphQuery"
import {
  type RawDelinquencyEvent,
  type DelinquencyDailyPoint,
  fmtDate,
  fmtDateShort,
} from "../constants"

// Pure function: tracks delinquent market count over time from raw events
export function processDelinquencyTimeline(
  raw: RawDelinquencyEvent[],
): DelinquencyDailyPoint[] {
  const delinquentSet = new Set<string>()
  const events: { ts: number; count: number }[] = []

  raw.forEach((evt) => {
    if (evt.isDelinquent) delinquentSet.add(evt.market.id)
    else delinquentSet.delete(evt.market.id)
    events.push({ ts: evt.blockTimestamp, count: delinquentSet.size })
  })

  const dayMap = new Map<string, { ts: number; count: number }>()
  events.forEach((e) => {
    const day = fmtDate(e.ts)
    dayMap.set(day, e)
  })

  return [...dayMap.entries()]
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([, v]) => ({
      date: fmtDate(v.ts),
      dateShort: fmtDateShort(v.ts),
      timestamp: v.ts,
      delinquentCount: v.count,
    }))
}

export function useProgressiveDelinquency(): AsyncState<
  DelinquencyDailyPoint[]
> {
  const [state, setState] = useState<AsyncState<DelinquencyDailyPoint[]>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    const PAGE_SIZE = 1000

    async function run() {
      try {
        let allEvents: RawDelinquencyEvent[] = []
        let skip = 0
        let done = false

        while (!done) {
          if (cancelled) return

          // eslint-disable-next-line no-await-in-loop
          const page = await querySubgraph<{
            delinquencyStatusChangeds: RawDelinquencyEvent[]
          }>(`{
            delinquencyStatusChangeds(first: ${PAGE_SIZE}, skip: ${skip}, orderBy: blockTimestamp, orderDirection: asc) {
              market { id } isDelinquent blockTimestamp
            }
          }`).then((d) => d.delinquencyStatusChangeds)

          allEvents = allEvents.concat(page)

          if (cancelled) return

          const processed = processDelinquencyTimeline(allEvents)
          setState({ data: processed, loading: false, error: null })

          if (page.length < PAGE_SIZE) {
            done = true
          } else {
            skip += PAGE_SIZE
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        console.error("[useProgressiveDelinquency] Failed:", e)
        if (!cancelled) {
          setState((prev) => ({
            data: prev.data,
            loading: false,
            error: msg,
          }))
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
