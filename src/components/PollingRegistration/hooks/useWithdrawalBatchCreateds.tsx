import { useEffect, useState } from "react"

import { useLazyQuery } from "@apollo/client"
import { Chip, SvgIcon } from "@mui/material"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import Clock from "@/assets/icons/clock_icon.svg"
import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { WITHDRAWAL_BATCH_CREATEDS } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { COLORS } from "@/theme/colors"
import {
  formatBps,
  MARKET_PARAMS_DECIMALS,
  formatSecsToHours,
} from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TWithdrawalBatchCreated } from "../interface"

export const useWithdrawalBatchCreateds = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()

  const [fetchWithdrawalBatchCreateds, { data, error }] = useLazyQuery(
    WITHDRAWAL_BATCH_CREATEDS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      console.dir(data)
      data.withdrawalBatchCreateds.forEach(
        (withdrawalBatchCreated: TWithdrawalBatchCreated) => {
          if (
            marketIds.some(
              (marketId) => marketId === withdrawalBatchCreated.batch.market.id,
            )
          ) {
            dispatch(
              addNotification({
                description: (
                  <Trans
                    i18nKey="notifications.withdrawalBatchCreated.description"
                    values={{
                      marketName: withdrawalBatchCreated.batch.market.name,
                    }}
                    components={{ strong: <strong /> }}
                  />
                ),
                category: "marketActivity",
                blockTimestamp: withdrawalBatchCreated.blockTimestamp,
                unread: true,
                etherscanUrl: `${EtherscanBaseUrl}/tx/${withdrawalBatchCreated.transactionHash}`,
                children: [
                  <Chip
                    sx={{
                      backgroundColor: COLORS.oasis,
                      color: COLORS.galliano,
                      marginTop: "2px",
                    }}
                    label={formatSecsToHours(
                      Math.max(
                        0,
                        withdrawalBatchCreated.batch.expiry -
                          Math.round(Date.now() / 1000),
                      ),
                    )}
                    icon={
                      <SvgIcon
                        fontSize="tiny"
                        sx={{ "& path": { fill: `${COLORS.galliano}` } }}
                        component={Clock}
                      />
                    }
                  />,
                ],
              }),
            )
          }
        },
      )
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      console.error("Error fetching created withdrawals: ", error)
    }
  }, [error])

  return () => {
    if (!address) return
    fetchWithdrawalBatchCreateds({
      variables: {
        where: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      },
    })
  }
}
