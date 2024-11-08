import { useEffect, useState } from "react"

import {
  EditLenderFlowStatuses,
  PolicyLenderTableDataType,
  PolicyLenderMarketTableDataType,
} from "@/app/[locale]/borrower/edit-policy/interface"

const areMarketsEqual = (
  initialMarkets: PolicyLenderMarketTableDataType[],
  currentMarkets: PolicyLenderMarketTableDataType[],
): boolean => {
  if (initialMarkets.length !== currentMarkets.length) return false

  const sortedInitialMarkets = [...initialMarkets].sort((a, b) =>
    a.address.localeCompare(b.address),
  )
  const sortedCurrentMarkets = [...currentMarkets].sort((a, b) =>
    a.address.localeCompare(b.address),
  )

  return sortedInitialMarkets.every(
    (market, index) =>
      JSON.stringify(market) === JSON.stringify(sortedCurrentMarkets[index]),
  )
}

function useTrackPolicyLendersChanges(
  initialLenders: PolicyLenderTableDataType[],
  lendersRows: PolicyLenderTableDataType[],
) {
  const [addedOrModifiedLenders, setAddedOrModifiedLenders] = useState<
    PolicyLenderTableDataType[]
  >([])

  useEffect(() => {
    const compareLenders = () => {
      const initialLendersMap = new Map(
        initialLenders.map((lender) => [lender.id, lender]),
      )
      const modifiedLenders: PolicyLenderTableDataType[] = []

      lendersRows.forEach((lender) => {
        const initialLender = initialLendersMap.get(lender.id)

        if (!initialLender) {
          if (!(lender.status === EditLenderFlowStatuses.DELETED)) {
            modifiedLenders.push(lender)
          }
        } else {
          const lenderWithoutMarkets = { ...lender, markets: undefined }
          const initialLenderWithoutMarkets = {
            ...initialLender,
            markets: undefined,
          }

          const isLenderEqual =
            JSON.stringify(lenderWithoutMarkets) ===
            JSON.stringify(initialLenderWithoutMarkets)

          const areMarketsIdentical = areMarketsEqual(
            initialLender.activeMarkets,
            lender.activeMarkets,
          )

          if (!isLenderEqual || !areMarketsIdentical) {
            modifiedLenders.push(lender)
          }
        }
      })

      setAddedOrModifiedLenders(modifiedLenders)
    }

    compareLenders()
  }, [lendersRows, initialLenders])

  const areLendersEqual = (
    lendersA: PolicyLenderTableDataType[],
    lendersB: PolicyLenderTableDataType[],
  ): boolean => {
    const filteredLendersA = lendersA.filter(
      (lender) => !(lender.status === EditLenderFlowStatuses.DELETED),
    )
    const filteredLendersB = lendersB.filter(
      (lender) => !(lender.status === EditLenderFlowStatuses.DELETED),
    )

    if (filteredLendersA.length !== filteredLendersB.length) return false

    return filteredLendersA.every((lenderA) => {
      const correspondingLenderB = filteredLendersB.find(
        (lenderB) => lenderB.id === lenderA.id,
      )
      if (!correspondingLenderB) return false

      const lenderAWithoutMarkets = { ...lenderA, markets: undefined }
      const lenderBWithoutMarkets = {
        ...correspondingLenderB,
        markets: undefined,
      }

      const isLenderEqual =
        JSON.stringify(lenderAWithoutMarkets) ===
        JSON.stringify(lenderBWithoutMarkets)

      const areMarketsIdentical = areMarketsEqual(
        lenderA.activeMarkets,
        correspondingLenderB.activeMarkets,
      )

      return isLenderEqual && areMarketsIdentical
    })
  }

  const isLendersHaveChanges = !areLendersEqual(initialLenders, lendersRows)

  return {
    isLendersHaveChanges,
    addedOrModifiedLenders,
  }
}

export default useTrackPolicyLendersChanges
