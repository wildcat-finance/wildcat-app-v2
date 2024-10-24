"use client"

import { useState } from "react"

import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { usePolling } from "@/hooks/usePolling"

import { useBorrowerMarketIds } from "./hooks/useBorrowerMarketIds"
import { useBorrowerRegistrationChanges } from "./hooks/useBorrowerRegistrationChanges"
import { useLenderAuthorizationChanges } from "./hooks/useLenderAuthorizationChanges"
import { useReserveRatioBipsUpdateds } from "./hooks/useReserveRatioBipsUpdateds"

const PollingRegistration = () => {
  const { address } = useAccount()
  const [marketIds, setMarketIds] = useState<string[]>([])

  const fetchBorrowerMarketIds = useBorrowerMarketIds(setMarketIds, address)
  const fetchBorrowerRegistrationChanges =
    useBorrowerRegistrationChanges(address)
  const fetchReserveRatioBipsUpdateds = useReserveRatioBipsUpdateds(marketIds)
  const fetchLenderAuthorizationChanges =
    useLenderAuthorizationChanges(marketIds)

  usePolling({
    callback: () => {
      fetchBorrowerMarketIds()
      fetchBorrowerRegistrationChanges()
      fetchReserveRatioBipsUpdateds()
      fetchLenderAuthorizationChanges()
    },
    interval: POLLING_INTERVAL,
  })

  return null
}

export default PollingRegistration
