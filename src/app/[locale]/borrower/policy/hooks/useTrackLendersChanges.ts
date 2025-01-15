import { useEffect, useState } from "react"

import {
  EditLenderFlowStatuses,
  PolicyLenderTableDataType,
} from "@/app/[locale]/borrower/edit-policy/interface"
import { LendersItem } from "@/app/[locale]/borrower/policy/compoents/LendersTab"

function useTrackPolicyLendersChanges(
  initialLenders: LendersItem[],
  lendersRows: LendersItem[],
) {
  const [addedOrModifiedLenders, setAddedOrModifiedLenders] = useState<
    LendersItem[]
  >([])

  useEffect(() => {
    const compareLenders = () => {
      const initialLendersMap = new Map(
        initialLenders.map((lender) => [lender.id, lender]),
      )
      const modifiedLenders: LendersItem[] = []

      lendersRows.forEach((lender) => {
        const initialLender = initialLendersMap.get(lender.id)

        if (!initialLender) {
          if (!(lender.status === EditLenderFlowStatuses.OLD)) {
            modifiedLenders.push(lender)
          }
        }
      })

      setAddedOrModifiedLenders(modifiedLenders)
    }

    compareLenders()
  }, [lendersRows, initialLenders])

  const areLendersEqual = (
    lendersA: LendersItem[],
    lendersB: LendersItem[],
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

      return (
        JSON.stringify(lenderAWithoutMarkets) ===
        JSON.stringify(lenderBWithoutMarkets)
      )
    })
  }

  const isLendersHaveChanges = !areLendersEqual(initialLenders, lendersRows)

  return {
    isLendersHaveChanges,
    addedOrModifiedLenders,
  }
}

export default useTrackPolicyLendersChanges
