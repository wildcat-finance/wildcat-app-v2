"use client"

import { useState } from "react"

import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { usePolling } from "@/hooks/usePolling"

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

  const fetchBorrowerMarketIds = useBorrowerMarketIds(setMarketIds, address)
  const fetchBorrowerRegistrationChanges =
    useBorrowerRegistrationChanges(address)
  const fetchReserveRatioBipsUpdateds = useReserveRatioBipsUpdateds(marketIds)
  const fetchLenderAuthorizationChanges =
    useLenderAuthorizationChanges(marketIds)
  const fetchBorrows = useBorrows(marketIds)
  const fetchDebtRepaids = useDebtRepaids(marketIds)
  const fetchWithdrawalBatchCreateds = useWithdrawalBatchCreateds(marketIds)
  const fetchWithdrawalBatchExpireds = useWithdrawalBatchExpireds(marketIds)
  const fetchWithdrawalExecutions = useWithdrawalExecutions(marketIds)

  usePolling({
    callback: () => {
      fetchBorrowerMarketIds()
      fetchBorrowerRegistrationChanges()
      fetchReserveRatioBipsUpdateds()
      fetchLenderAuthorizationChanges()
      fetchBorrows()
      fetchDebtRepaids()
      fetchWithdrawalBatchCreateds()
      fetchWithdrawalBatchExpireds()
      fetchWithdrawalExecutions()
    },
    interval: POLLING_INTERVAL,
  })

  return null
}

export default PollingRegistration
