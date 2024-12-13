import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { LENDER_AUTHORIZATION_CHANGES } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { trimAddress } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TLenderAuthorizationChange } from "../../interface"

export const useAuthorizationChanges = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()

  const [fetchLenderAuthorizationChanges, { data, error }] = useLazyQuery(
    LENDER_AUTHORIZATION_CHANGES,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      data.lenderAuthorizationChanges.forEach(
        (change: TLenderAuthorizationChange) => {
          if (!change.authorized) {
            change.authorization.marketAccounts.forEach((marketAccount) => {
              dispatch(
                addNotification({
                  description: (
                    <Trans
                      i18nKey="notifications.lenderRemoved.description"
                      values={{
                        marketName: marketAccount.market.name,
                      }}
                      components={{ strong: <strong /> }}
                    />
                  ),
                  category: "marketActivity",
                  blockTimestamp: change.blockTimestamp,
                  unread: true,
                }),
              )
            })
          } else {
            change.authorization.marketAccounts.forEach((marketAccount) => {
              dispatch(
                addNotification({
                  description: (
                    <Trans
                      i18nKey="notifications.lenderAdded.description"
                      values={{
                        borrower: trimAddress(marketAccount.market.borrower),
                        marketName: marketAccount.market.name,
                      }}
                      components={{ strong: <strong /> }}
                    />
                  ),
                  category: "newLenders",
                  blockTimestamp: change.blockTimestamp,
                  unread: true,
                }),
              )
            })
          }
        },
      )
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      console.error("Error fetching cycle endeds: ", error)
    }
  }, [error])

  return () => {
    //
    if (!address) return
    fetchLenderAuthorizationChanges({
      variables: {
        where: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
          lender: address,
        },
      },
    })
  }
}
