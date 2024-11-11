import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Chip } from "@mui/material"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { WITHDRAWAL_EXECUTIONS } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenAmount } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TWithdrawalExecution } from "../interface"

export const useWithdrawalExecutions = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()

  const [fetchWithdrawalExecutions, { data, error }] = useLazyQuery(
    WITHDRAWAL_EXECUTIONS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      console.dir(data)
      data.withdrawalExecutions.forEach(
        (withdrawalExecution: TWithdrawalExecution) => {
          if (
            marketIds.some(
              (marketId) => marketId === withdrawalExecution.batch.market.id,
            )
          ) {
            dispatch(
              addNotification({
                description: (
                  <Trans
                    i18nKey="notifications.withdrawalExecution.description"
                    values={{
                      marketName: withdrawalExecution.batch.market.name,
                    }}
                    components={{ strong: <strong /> }}
                  />
                ),
                category: "marketActivity",
                blockTimestamp: withdrawalExecution.blockTimestamp,
                unread: true,
                etherscanUrl: `${EtherscanBaseUrl}/tx/${withdrawalExecution.transactionHash}`,
                children: [
                  <Chip
                    sx={{
                      backgroundColor: COLORS.whiteSmoke,
                      color: COLORS.santasGrey,
                      marginTop: "2px",
                    }}
                    label={`- ${formatTokenAmount(
                      withdrawalExecution.normalizedAmount,
                      withdrawalExecution.batch.market.decimals,
                      4,
                    )} ${withdrawalExecution.batch.market.symbol}`}
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
      console.error("Error fetching withdrawal executions: ", error)
    }
  }, [error])

  return () => {
    if (!address) return
    fetchWithdrawalExecutions({
      variables: {
        where: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      },
    })
  }
}
