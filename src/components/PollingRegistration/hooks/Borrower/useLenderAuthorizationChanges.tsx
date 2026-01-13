import React, { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { lazyQueryOptions } from "@/config/subgraph"
import { AUTHORIZATION_CHANGES } from "@/graphql/queries"
import { logger } from "@/lib/logging/client"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { trimAddress } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TAuthorizationChange } from "../../interface"

export const useLenderAuthorizationChanges = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()

  const [fetchLenderAuthorizationChanges, { data, error }] = useLazyQuery(
    AUTHORIZATION_CHANGES,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      data.lenderAuthorizationChanges.forEach(
        (change: TAuthorizationChange) => {
          if (!change.authorized) {
            change.authorization.marketAccounts.forEach((marketAccount) => {
              dispatch(
                addNotification({
                  description: (
                    <Trans
                      i18nKey="notifications.borrowerRemovedLender.description"
                      values={{
                        lender: trimAddress(change.lender),
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
          } else if (change.authorization.marketAccounts.length > 1) {
            dispatch(
              addNotification({
                description: (
                  <Trans
                    i18nKey="notifications.borrowerAddedLenderMultiple.description"
                    values={{ lender: trimAddress(change.lender) }}
                    components={{ strong: <strong /> }}
                  />
                ),
                category: "newLenders",
                blockTimestamp: change.blockTimestamp,
                unread: true,
              }),
            )
          } else if (change.authorization.marketAccounts.length === 1) {
            dispatch(
              addNotification({
                description: (
                  <Trans
                    i18nKey="notifications.borrowerAddedLender.description"
                    values={{
                      lender: trimAddress(change.lender),
                      marketName:
                        change.authorization.marketAccounts[0].market.name,
                    }}
                    components={{ strong: <strong /> }}
                  />
                ),
                category: "newLenders",
                blockTimestamp: change.blockTimestamp,
                unread: true,
              }),
            )
          }
        },
      )
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      logger.error(
        { err: error },
        "Error fetching lender authorization changes",
      )
    }
  }, [error])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    if (!address) return
    fetchLenderAuthorizationChanges({
      variables: {
        where: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
        marketAccountsWhere: {
          market_: {
            id_in: marketIds,
          },
        },
      },
    })
  }
}
