import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { BORROWS } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatTokenAmount, formatTokenWithCommas } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TBorrow } from "../interface"

export const useBorrows = (marketIds: string[]) => {
  const dispatch = useDispatch()

  const [fetchBorrows, { data, error }] = useLazyQuery(
    BORROWS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      console.dir(data)
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
            etherscanUrl: `${EtherscanBaseUrl}/tx/${borrow.transactionHash}`,
          }),
        )
      })
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      console.error("Error fetching borrows: ", error)
    }
  }, [error])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    fetchBorrows({
      variables: {
        where: {
          market_: {
            id_in: marketIds,
          },
          blockTimestamp_gt: getLastFetchedTimestamp(),
        },
      },
    })
  }
}
