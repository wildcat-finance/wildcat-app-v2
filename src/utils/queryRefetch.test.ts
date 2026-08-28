import { QueryClient, QueryObserver } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

import { refetchOnMountIfInvalidated } from "./queryRefetch"

const CHAIN_ID = 11155111
const BORROWER = "0xca732651410e915090d7a7d889a1e44ef4575fce"

describe("refetchOnMountIfInvalidated", () => {
  it("refetches an invalidated inactive query when it mounts", async () => {
    const client = new QueryClient()
    const queryKey = QueryKeys.Borrower.GET_OWN_MARKETS(CHAIN_ID, BORROWER)
    const queryFn = jest.fn().mockResolvedValue("fresh")
    client.setQueryData(queryKey, "cached")
    await client.invalidateQueries({ queryKey, refetchType: "none" })

    const observer = new QueryObserver(client, {
      queryKey,
      queryFn,
      refetchOnMount: refetchOnMountIfInvalidated,
    })
    let unsubscribe: () => void = () => undefined
    const refreshed = new Promise<void>((resolve) => {
      unsubscribe = observer.subscribe((result) => {
        if (result.data === "fresh") resolve()
      })
    })

    await refreshed
    unsubscribe()

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it("keeps a non-invalidated cached query on mount", () => {
    const client = new QueryClient()
    const queryKey = QueryKeys.Borrower.GET_OWN_MARKETS(CHAIN_ID, BORROWER)
    const queryFn = jest.fn().mockResolvedValue("fresh")
    client.setQueryData(queryKey, "cached")

    const observer = new QueryObserver(client, {
      queryKey,
      queryFn,
      refetchOnMount: refetchOnMountIfInvalidated,
    })
    const unsubscribe = observer.subscribe(() => undefined)

    expect(queryFn).not.toHaveBeenCalled()
    unsubscribe()
  })
})
