import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { lazyQueryOptions } from "@/config/subgraph"
import { BORROWS } from "@/graphql/queries"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { logger } from "@/lib/logging/client"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatTokenAmount } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TBorrow } from "../../interface"

export const useBorrows = (marketIds: string[], address?: `0x${string}`) => {
  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const [fetchBorrows, { data, error }] = useLazyQuery(
    BORROWS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      logger.debug({ data }, "Borrow records result")
      data.borrows.forEach((borrow: TBorrow) => {
        dispatch(
          addNotification({
            description: (
              <Trans
                i18nKey="notifications.borrow.description"
                values={{
                  marketName: borrow.market.name,
                  amount: formatTokenAmount(
                    borrow.assetAmount,
                    borrow.market.decimals,
                    4,
                  ),
                  asset: borrow.market.symbol,
                }}
                components={{ strong: <strong /> }}
              />
            ),
            category: "marketActivity",
            blockTimestamp: borrow.blockTimestamp,
            unread: true,
            blockExplorerUrl: getTxUrl(borrow.transactionHash),
          }),
        )
      })
    }
  }, [data, dispatch, getTxUrl])

  useEffect(() => {
    if (error) {
      logger.error({ err: error }, "Error fetching borrows")
    }
  }, [error])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    if (!address) return
    fetchBorrows({
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
