"use client"

import { useEffect, useState } from "react"

import { useDispatch } from "react-redux"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { usePolling } from "@/hooks/usePolling"
import { clear } from "@/store/slices/notificationsSlice/notificationsSlice"

import { useBorrowerMarketIds } from "./hooks/useBorrowerMarketIds"
import { useBorrowerRegistrationChanges } from "./hooks/useBorrowerRegistrationChanges"
import { useBorrows } from "./hooks/useBorrows"
import { useDebtRepaids } from "./hooks/useDebtRepaids"
import { useLenderAuthorizationChanges } from "./hooks/useLenderAuthorizationChanges"
import { useReserveRatioBipsUpdateds } from "./hooks/useReserveRatioBipsUpdateds"
import { useWithdrawalBatchCreateds } from "./hooks/useWithdrawalBatchCreateds"
import { useWithdrawalBatchExpireds } from "./hooks/useWithdrawalBatchExpireds"
import { useWithdrawalExecutions } from "./hooks/useWithdrawalExecutions"

const PollingRegistration = () => {
  const { address } = useAccount()
  const [marketIds, setMarketIds] = useState<string[]>([])
  const dispatch = useDispatch()

  const fetchBorrowerMarketIds = useBorrowerMarketIds(setMarketIds, address)
  const fetchBorrowerRegistrationChanges =
    useBorrowerRegistrationChanges(address)
  const fetchReserveRatioBipsUpdateds = useReserveRatioBipsUpdateds(
    marketIds,
    address,
  )
  const fetchLenderAuthorizationChanges = useLenderAuthorizationChanges(
    marketIds,
    address,
  )
  const fetchBorrows = useBorrows(marketIds, address)
  const fetchDebtRepaids = useDebtRepaids(marketIds, address)
  const fetchWithdrawalBatchCreateds = useWithdrawalBatchCreateds(
    marketIds,
    address,
  )
  const fetchWithdrawalBatchExpireds = useWithdrawalBatchExpireds(
    marketIds,
    address,
  )
  const fetchWithdrawalExecutions = useWithdrawalExecutions(marketIds, address)

  const fetch = () => {
    fetchBorrowerMarketIds()
    fetchBorrowerRegistrationChanges()
    fetchReserveRatioBipsUpdateds()
    fetchLenderAuthorizationChanges()
    fetchBorrows()
    fetchDebtRepaids()
    fetchWithdrawalBatchCreateds()
    fetchWithdrawalBatchExpireds()
    fetchWithdrawalExecutions()
  }

  usePolling({
    callback: fetch,
    interval: POLLING_INTERVAL,
  })

  useEffect(() => {
    dispatch(clear())
    SubgraphClient.cache.reset()
    if (address) {
      fetch()
    }
  }, [address])

  return null
}

export default PollingRegistration
