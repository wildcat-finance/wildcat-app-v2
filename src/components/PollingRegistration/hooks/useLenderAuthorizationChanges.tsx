import React, { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Box, Chip, Typography } from "@mui/material"
import { Trans, useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { LENDER_AUTHORIZATION_CHANGES } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { COLORS } from "@/theme/colors"
import {
  formatBps,
  MARKET_PARAMS_DECIMALS,
  trimAddress,
} from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TLenderAuthorizationChange } from "../interface"

export const useLenderAuthorizationChanges = (marketIds: string[]) => {
  const dispatch = useDispatch()
  const { t } = useTranslation()

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
      console.error("Error fetching lender authorization changes: ", error)
    }
  }, [error])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    fetchLenderAuthorizationChanges({
      variables: {
        where: {
          blockTimestamp_gt: getLastFetchedTimestamp(),
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
