import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Chip } from "@mui/material"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { lazyQueryOptions } from "@/config/subgraph"
import { WITHDRAWAL_EXECUTIONS } from "@/graphql/queries"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { logger } from "@/lib/logging/client"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenAmount } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TWithdrawalExecution } from "../../interface"

export const useWithdrawalExecutions = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const [fetchWithdrawalExecutions, { data, error }] = useLazyQuery(
    WITHDRAWAL_EXECUTIONS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      logger.debug({ data }, "Withdrawal executions result")
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
                blockExplorerUrl: getTxUrl(withdrawalExecution.transactionHash),
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
  }, [data, dispatch, getTxUrl])

  useEffect(() => {
    if (error) {
      logger.error({ err: error }, "Error fetching withdrawal executions")
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
