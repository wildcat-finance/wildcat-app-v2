import React, { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Box, Chip, Typography } from "@mui/material"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { RESERVE_RATIO_BIPS_UPDATEDS } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { COLORS } from "@/theme/colors"
import { formatBps, MARKET_PARAMS_DECIMALS } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TReserveRatioBipsUpdated } from "../interface"

export const useReserveRatioBipsUpdateds = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()

  const [fetchReserveRatioBipsUpdateds, { data, error }] = useLazyQuery(
    RESERVE_RATIO_BIPS_UPDATEDS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      data.reserveRatioBipsUpdateds.forEach(
        (updated: TReserveRatioBipsUpdated) => {
          const apr = `${formatBps(
            updated.oldReserveRatioBips,
            MARKET_PARAMS_DECIMALS.reserveRatioBips,
          )} ${updated.market.symbol}`
          const newApr = `${formatBps(
            updated.newReserveRatioBips,
            MARKET_PARAMS_DECIMALS.reserveRatioBips,
          )} ${updated.market.symbol}`
          const percentageIncrease =
            ((updated.newReserveRatioBips - updated.oldReserveRatioBips) /
              updated.oldReserveRatioBips) *
            100
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey="notifications.aprDecreaseEnded.description"
                  values={{ marketName: updated.market.name }}
                  components={{ strong: <strong /> }}
                />
              ),
              category: "marketActivity",
              blockTimestamp: updated.blockTimestamp,
              unread: true,
              etherscanUrl: `${EtherscanBaseUrl}/tx/${updated.transactionHash}`,
              children: [
                <Box sx={{ display: "flex", gap: "4px" }}>
                  <Typography variant="text3" color={COLORS.greySuit}>
                    <s>{apr}</s>
                    &nbsp;
                    <Typography variant="text3">{`→ ${newApr}`}</Typography>
                  </Typography>
                  <Chip
                    sx={{
                      backgroundColor: COLORS.cherub,
                      color: COLORS.dullRed,
                      marginTop: "2px",
                    }}
                    label={
                      percentageIncrease > 0
                        ? `+${Math.round(percentageIncrease * 100) / 100}% ↑`
                        : `${Math.round(percentageIncrease * 100) / 100}% ↓`
                    }
                  />
                </Box>,
              ],
            }),
          )
        },
      )
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      console.error("Error fetching reserve ratio bips updateds: ", error)
    }
  }, [error])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    if (!address) return
    fetchReserveRatioBipsUpdateds({
      variables: {
        where: {
          market_: {
            id_in: marketIds,
          },
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      },
    })
  }
}
