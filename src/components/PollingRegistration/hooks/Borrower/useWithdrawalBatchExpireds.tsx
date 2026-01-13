import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Chip } from "@mui/material"
import { Trans, useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"

import { lazyQueryOptions } from "@/config/subgraph"
import { WITHDRAWAL_BATCH_EXPIREDS } from "@/graphql/queries"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { logger } from "@/lib/logging/client"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenAmount } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TWithdrawalBatchExpired } from "../../interface"

export const useWithdrawalBatchExpireds = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { getTxUrl } = useBlockExplorer()

  const [fetchWithdrawalBatchExpireds, { data, error }] = useLazyQuery(
    WITHDRAWAL_BATCH_EXPIREDS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      logger.debug({ data }, "Withdrawal batch expireds result")
      data.withdrawalBatchExpireds.forEach(
        (withdrawalBatchExpired: TWithdrawalBatchExpired) => {
          if (
            marketIds.some(
              (marketId) => marketId === withdrawalBatchExpired.batch.market.id,
            )
          ) {
            if (
              withdrawalBatchExpired.scaledAmountBurned ===
              withdrawalBatchExpired.scaledTotalAmount
            ) {
              dispatch(
                addNotification({
                  description: (
                    <Trans
                      i18nKey="notifications.withdrawalSuccess.description"
                      values={{
                        marketName: withdrawalBatchExpired.batch.market.name,
                      }}
                      components={{ strong: <strong /> }}
                    />
                  ),
                  category: "marketActivity",
                  blockTimestamp: withdrawalBatchExpired.blockTimestamp,
                  unread: true,
                  blockExplorerUrl: getTxUrl(
                    withdrawalBatchExpired.transactionHash,
                  ),
                }),
              )
            } else {
              dispatch(
                addNotification({
                  description: (
                    <Trans
                      i18nKey="notifications.withdrawalFailed.description"
                      values={{
                        marketName: withdrawalBatchExpired.batch.market.name,
                      }}
                      components={{ strong: <strong /> }}
                    />
                  ),
                  category: "marketActivity",
                  blockTimestamp: withdrawalBatchExpired.blockTimestamp,
                  unread: true,
                  error: true,
                  blockExplorerUrl: getTxUrl(
                    withdrawalBatchExpired.transactionHash,
                  ),
                  children: [
                    <Chip
                      sx={{
                        backgroundColor: COLORS.cherub,
                        color: COLORS.dullRed,
                        marginTop: "2px",
                      }}
                      label={`${t("notifications.missing")} ${formatTokenAmount(
                        withdrawalBatchExpired.normalizedAmountOwed,
                        withdrawalBatchExpired.batch.market.decimals,
                        4,
                      )} ${withdrawalBatchExpired.batch.market.symbol}`}
                    />,
                  ],
                }),
              )
            }
          }
        },
      )
    }
  }, [data, dispatch, getTxUrl, t])

  useEffect(() => {
    if (error) {
      logger.error({ err: error }, "Error fetching expired withdrawals")
    }
  }, [error])

  return () => {
    if (!address) return
    fetchWithdrawalBatchExpireds({
      variables: {
        where: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      },
    })
  }
}
