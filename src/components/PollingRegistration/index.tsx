"use client"

import { useState } from "react"

import { useDispatch } from "react-redux"
import { useAccount } from "wagmi"

// import { POLLING_INTERVAL } from "@/config/polling"
// import { SubgraphClient } from "@/config/subgraph"
// import { usePolling } from "@/hooks/usePolling"
// import { clear } from "@/store/slices/notificationsSlice/notificationsSlice"

// import { useAPRChanges } from "./hooks/Borrower/useAPRChanges"
// import { useBorrowerMarketIds } from "./hooks/Borrower/useBorrowerMarketIds"
// import { useBorrowerRegistrationChanges } from "./hooks/Borrower/useBorrowerRegistrationChanges"
// import { useBorrows } from "./hooks/Borrower/useBorrows"
// import { useCapacityChanges } from "./hooks/Borrower/useCapacityChanges"
// import { useDebtRepaids } from "./hooks/Borrower/useDebtRepaids"
// import { useDepositeds } from "./hooks/Borrower/useDepositeds"
// import { useLenderAuthorizationChanges } from "./hooks/Borrower/useLenderAuthorizationChanges"
// import { useLenderWithdrawalRequests } from "./hooks/Borrower/useLenderWithdrawalRequests"
// import { useMarketStatusChanges } from "./hooks/Borrower/useMarketStatusChanges"
// import { useMarketTerminateds } from "./hooks/Borrower/useMarketTerminateds"
// import { useReserveRatioBipsUpdateds } from "./hooks/Borrower/useReserveRatioBipsUpdateds"
// import { useWithdrawalBatchCreateds } from "./hooks/Borrower/useWithdrawalBatchCreateds"
// import { useWithdrawalBatchExpireds } from "./hooks/Borrower/useWithdrawalBatchExpireds"
// import { useWithdrawalExecutions } from "./hooks/Borrower/useWithdrawalExecutions"
// import { useAuthorizationChanges } from "./hooks/Lender/useAuthorizationChanges"
// import { useLenderAPRChanges } from "./hooks/Lender/useLenderAPRChanges"
// import { useLenderCapacityChanges } from "./hooks/Lender/useLenderCapacityChanges"
// import { useLenderDepositeds } from "./hooks/Lender/useLenderDepositeds"
// import { useLenderMarketIds } from "./hooks/Lender/useLenderMarketIds"
// import { useLenderMarketTerminateds } from "./hooks/Lender/useLenderMarketTerminateds"
// import { useLenderTokensAvailables } from "./hooks/Lender/useLenderTokensAvailables"
// import { useLenderWithdrawalResults } from "./hooks/Lender/useLenderWithdrawalResults"

const PollingRegistration = () => {
  const { address } = useAccount()
  const [marketIds, setMarketIds] = useState<string[]>([])
  const [lenderMarketIds, setLenderMarketIds] = useState<string[]>([])
  const dispatch = useDispatch()

  // const fetchBorrowerMarketIds = useBorrowerMarketIds(setMarketIds, address)
  // const fetchLenderMarketIds = useLenderMarketIds(setLenderMarketIds, address)
  // const fetchBorrowerRegistrationChanges =
  //   useBorrowerRegistrationChanges(address)
  // const fetchReserveRatioBipsUpdateds = useReserveRatioBipsUpdateds(
  //   marketIds,
  //   address,
  // )
  // const fetchLenderAuthorizationChanges = useLenderAuthorizationChanges(
  //   marketIds,
  //   address,
  // )
  // const fetchBorrows = useBorrows(marketIds, address)
  // const fetchDebtRepaids = useDebtRepaids(marketIds, address)
  // const fetchWithdrawalBatchCreateds = useWithdrawalBatchCreateds(
  //   marketIds,
  //   address,
  // )
  // const fetchWithdrawalBatchExpireds = useWithdrawalBatchExpireds(
  //   marketIds,
  //   address,
  // )
  // const fetchWithdrawalExecutions = useWithdrawalExecutions(marketIds, address)

  // const fetchAPRChanges = useAPRChanges(address)
  // // "0x0b776552c1aef1dc33005dd25acda22493b6615d"
  // const fetchCapacityChanges = useCapacityChanges(address)
  // const fetchDepositeds = useDepositeds(address)
  // const fetchLenderWithdrawalRequests = useLenderWithdrawalRequests(address)
  // const fetchMarketStatusChanges = useMarketStatusChanges(address)
  // const fetchMarketTerminateds = useMarketTerminateds(address)

  // const fetchLenderAPRChanges = useLenderAPRChanges(address)
  // const fetchLenderCapacityChanges = useLenderCapacityChanges(address)
  // const fetchLenderDepositeds = useLenderDepositeds(address)
  // const fetchAuthorizationChanges = useAuthorizationChanges(
  //   lenderMarketIds,
  //   address,
  // )
  // const fetchLenderMarketTerminateds = useLenderMarketTerminateds(
  //   lenderMarketIds,
  //   address,
  // )
  // const fetchLenderTokensAvailables = useLenderTokensAvailables(address)
  // const fetchLenderWithdrawalResults = useLenderWithdrawalResults(
  //   lenderMarketIds,
  //   address,
  // )

  // const fetch = () => {
  //   fetchBorrowerMarketIds()
  //   fetchBorrowerRegistrationChanges()
  //   fetchReserveRatioBipsUpdateds()
  //   fetchLenderAuthorizationChanges()
  //   fetchBorrows()
  //   fetchDebtRepaids()
  //   fetchWithdrawalBatchCreateds()
  //   fetchWithdrawalBatchExpireds()
  //   fetchWithdrawalExecutions()
  //   fetchAPRChanges()
  //   fetchCapacityChanges()
  //   fetchDepositeds()
  //   fetchLenderWithdrawalRequests()
  //   fetchMarketStatusChanges()
  //   fetchMarketTerminateds()

  //   fetchLenderMarketIds()
  //   fetchLenderAPRChanges()
  //   fetchLenderCapacityChanges()
  //   fetchLenderDepositeds()
  //   fetchAuthorizationChanges()
  //   fetchLenderMarketTerminateds()
  //   fetchLenderTokensAvailables()
  //   fetchLenderWithdrawalResults()
  // }

  // usePolling({
  //   callback: fetch,
  //   interval: POLLING_INTERVAL,
  // })

  // useEffect(() => {
  //   dispatch(clear())
  //   SubgraphClient.cache.reset()
  //   if (address) {
  //     fetch()
  //   }
  // }, [address])

  return null
}

export default PollingRegistration
