import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { BORROWER_REGISTRATION_CHANGES } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TBorrowerRegistrationChange } from "../interface"

export const useBorrowerRegistrationChanges = (address?: string) => {
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const [fetchBorrowerRegistrationChanges, { data, error }] = useLazyQuery(
    BORROWER_REGISTRATION_CHANGES,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      data.borrowerRegistrationChanges.forEach(
        (change: TBorrowerRegistrationChange) => {
          console.dir(change)
          dispatch(
            addNotification({
              description: t(
                change.isRegistered
                  ? "notifications.borrowerRegistrationChange.onboarded"
                  : "notifications.borrowerRegistrationChange.removed",
              ),
              category: "marketActivity",
              blockTimestamp: change.blockTimestamp,
              unread: true,
              etherscanUrl: `${EtherscanBaseUrl}/tx/${change.transactionHash}`,
            }),
          )
        },
      )
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      console.error("Error fetching borrower registration changes: ", error)
    }
  }, [error])

  return () => {
    if (address) {
      // address = "0x1717503ee3f56e644cf8b1058e3f83f03a71b2e1" // Testing
      fetchBorrowerRegistrationChanges({
        variables: {
          where: {
            registration_: { borrower: address },
            blockTimestamp_gt: getLastFetchedTimestamp(),
          },
        },
      })
    }
  }
}
