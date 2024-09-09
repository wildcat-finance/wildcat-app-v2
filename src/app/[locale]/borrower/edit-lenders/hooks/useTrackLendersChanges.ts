import { useState, useEffect } from "react"

import {
  LenderTableT,
  MarketTableT,
} from "@/app/[locale]/borrower/edit-lenders/interface"

const areMarketsEqual = (
  initialMarkets: MarketTableT[],
  currentMarkets: MarketTableT[],
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

function useTrackLendersChanges(
  initialLenders: LenderTableT[],
  lendersRows: LenderTableT[],
) {
  const [addedOrModifiedLenders, setAddedOrModifiedLenders] = useState<
    LenderTableT[]
  >([])

  useEffect(() => {
    const compareLenders = () => {
      const initialLendersMap = new Map(
        initialLenders.map((lender) => [lender.id, lender]),
      )
      const modifiedLenders: LenderTableT[] = []

      lendersRows.forEach((lender) => {
        const initialLender = initialLendersMap.get(lender.id)

        if (!initialLender) {
          if (!(lender.status === "deleted" && lender.prevStatus === "new")) {
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
            initialLender.markets,
            lender.markets,
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
    lendersA: LenderTableT[],
    lendersB: LenderTableT[],
  ): boolean => {
    const filteredLendersA = lendersA.filter(
      (lender) => !(lender.status === "deleted" && lender.prevStatus === "new"),
    )
    const filteredLendersB = lendersB.filter(
      (lender) => !(lender.status === "deleted" && lender.prevStatus === "new"),
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
        lenderA.markets,
        correspondingLenderB.markets,
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

export default useTrackLendersChanges
