import { useState, useEffect } from "react"

import {
  LenderTableT,
  MarketTableT,
} from "@/app/[locale]/borrower/edit_lenders/interface"

const areMarketsEqual = (
  initialMarkets: MarketTableT[],
  currentMarkets: MarketTableT[],
): boolean => {
  if (initialMarkets.length !== currentMarkets.length) return false

  // Сортируем маркеты перед сравнением
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

        // Если старого объекта нет, значит он был добавлен
        if (!initialLender) {
          modifiedLenders.push(lender)
        } else {
          // Сравниваем все свойства, кроме markets
          const lenderWithoutMarkets = { ...lender, markets: undefined }
          const initialLenderWithoutMarkets = {
            ...initialLender,
            markets: undefined,
          }

          const isLenderEqual =
            JSON.stringify(lenderWithoutMarkets) ===
            JSON.stringify(initialLenderWithoutMarkets)

          // Сравниваем markets отдельно
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
  ) => {
    if (lendersA.length !== lendersB.length) return false

    return lendersA.every((lenderA) => {
      const correspondingLenderB = lendersB.find(
        (lenderB) => lenderB.id === lenderA.id,
      )
      if (!correspondingLenderB) return false

      // Сравниваем все свойства, кроме markets
      const lenderAWithoutMarkets = { ...lenderA, markets: undefined }
      const lenderBWithoutMarkets = {
        ...correspondingLenderB,
        markets: undefined,
      }

      const isLenderEqual =
        JSON.stringify(lenderAWithoutMarkets) ===
        JSON.stringify(lenderBWithoutMarkets)

      // Сравниваем markets отдельно, игнорируя порядок
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
