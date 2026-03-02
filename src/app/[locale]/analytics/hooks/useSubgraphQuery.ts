import { useState, useEffect, useRef } from "react"

import { SUBGRAPH_URL } from "../constants"

export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export async function querySubgraph<T>(query: string): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Subgraph HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message || "Subgraph error")
  return json.data as T
}

export function useSubgraphQuery<T>(
  queryFn: () => Promise<T>,
  label: string,
  deps: unknown[] = [],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    setState({ data: null, loading: true, error: null })
    queryFn()
      .then((data) => {
        if (mounted.current) setState({ data, loading: false, error: null })
      })
      .catch((e: Error) => {
        console.error(`[${label}] Query failed:`, e)
        if (mounted.current)
          setState({
            data: null,
            loading: false,
            error: e.message || "Unknown error",
          })
      })
    return () => {
      mounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export async function querySubgraphAll<T>(
  buildQuery: (skip: number) => string,
  entityKey: string,
): Promise<T[]> {
  const PAGE_SIZE = 1000
  let all: T[] = []
  let skip = 0
  // Pagination requires sequential fetches
  // eslint-disable-next-line no-await-in-loop
  for (let done = false; !done; ) {
    // eslint-disable-next-line no-await-in-loop
    const data = await querySubgraph<Record<string, T[]>>(buildQuery(skip))
    const page = data[entityKey]
    all = all.concat(page)
    if (page.length < PAGE_SIZE) {
      done = true
    } else {
      skip += PAGE_SIZE
    }
  }
  return all
}
