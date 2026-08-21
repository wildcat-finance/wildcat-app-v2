// Client gate for the removed-borrower restriction (product#789).
// Reads GET /api/borrowers/[address]/restriction and mirrors the answer into
// a persisted last-known cache so a failed read keeps the previous state:
// downtime never re-enables a restricted borrower. The blocked surfaces are
// create market, profile editing, and market description editing; repayment
// and market termination are never gated here or anywhere else.
import { useEffect } from "react"

import { useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  getRestrictionKey,
  setLastKnownRestriction,
} from "@/store/slices/borrowerRestrictionSlice/borrowerRestrictionSlice"
import {
  BorrowerRestrictionState,
  computeRestrictionGateState,
  RestrictionGateState,
} from "@/utils/borrowerRestrictionState"

import { useSelectedNetwork } from "./useSelectedNetwork"

const RESTRICTION_REFETCH_INTERVAL = 60_000

export interface UseBorrowerRestrictionResult {
  gateState: RestrictionGateState
  restricted: boolean
  state: BorrowerRestrictionState | undefined
  isFetching: boolean
  refetch: () => void
}

export const useBorrowerRestriction = (
  addressOverride?: string,
  options?: { enabled?: boolean },
): UseBorrowerRestrictionResult => {
  const { address: connectedAddress } = useAccount()
  const { chainId } = useSelectedNetwork()
  const dispatch = useAppDispatch()

  const address = (addressOverride ?? connectedAddress)?.toLowerCase()
  const enabled = !!address && !!chainId && (options?.enabled ?? true)

  const lastKnown = useAppSelector((storeState) =>
    address && chainId
      ? storeState.borrowerRestriction[getRestrictionKey(address, chainId)]
      : undefined,
  )

  const query = useQuery({
    queryKey: ["borrower-restriction", chainId, address],
    enabled,
    queryFn: async (): Promise<BorrowerRestrictionState> => {
      const response = await fetch(
        `/api/borrowers/${address}/restriction?chainId=${chainId}`,
      )
      if (!response.ok) {
        throw new Error(`restriction read failed: ${response.status}`)
      }
      return response.json()
    },
    refetchOnWindowFocus: true,
    refetchInterval: RESTRICTION_REFETCH_INTERVAL,
    staleTime: RESTRICTION_REFETCH_INTERVAL,
  })

  useEffect(() => {
    if (query.isSuccess && query.data && address && chainId) {
      dispatch(setLastKnownRestriction({ address, chainId, state: query.data }))
    }
  }, [query.isSuccess, query.data, address, chainId, dispatch])

  const gateState = computeRestrictionGateState({
    queryEnabled: enabled,
    querySucceeded: query.isSuccess,
    state: query.data,
    lastKnown,
  })

  return {
    gateState,
    restricted: gateState === "blocked",
    state: query.data ?? lastKnown,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}
