import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { WITHDRAWAL_BATCH_EXPIREDS } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TWithdrawalBatchExpired } from "../../interface"

export const useLenderWithdrawalResults = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()

  const [fetchWithdrawalBatchExpireds, { data, error }] = useLazyQuery(
    WITHDRAWAL_BATCH_EXPIREDS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      // console.dir(data)
      data.withdrawalBatchExpireds.forEach(
        (withdrawalBatchExpired: TWithdrawalBatchExpired) => {
          if (
            marketIds.some(
              (marketId) => marketId === withdrawalBatchExpired.batch.market.id,
            )
          ) {
            const key: string =
              withdrawalBatchExpired.scaledAmountBurned ===
              withdrawalBatchExpired.scaledTotalAmount
                ? "notifications.lenderWithdrawalSuccess.description"
                : "notifications.lenderWithdrawalFailed.description"
            dispatch(
              addNotification({
                description: (
                  <Trans
                    i18nKey={key}
                    values={{
                      marketName: withdrawalBatchExpired.batch.market.name,
                    }}
                    components={{ strong: <strong /> }}
                  />
                ),
                category: "marketActivity",
                blockTimestamp: withdrawalBatchExpired.blockTimestamp,
                unread: true,
                etherscanUrl: `${EtherscanBaseUrl}/tx/${withdrawalBatchExpired.transactionHash}`,
              }),
            )
          }
        },
      )
    }
  }, [data, dispatch, marketIds])

  useEffect(() => {
    if (error) {
      // console.error("Error fetching withdrawal results: ", error)
    }
  }, [error, marketIds])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    if (!address) return
    fetchWithdrawalBatchExpireds({
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
