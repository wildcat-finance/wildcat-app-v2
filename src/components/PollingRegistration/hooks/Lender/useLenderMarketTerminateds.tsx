import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { EtherscanBaseUrl } from "@/config/network"
import { lazyQueryOptions } from "@/config/subgraph"
import { MARKET_TERMINATEDS } from "@/graphql/queries"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TMarketTerminated } from "../../interface"

export const useLenderMarketTerminateds = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()

  const [fetchTerminateds, { data, error }] = useLazyQuery(
    MARKET_TERMINATEDS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      console.dir(data)
      data.marketCloseds.forEach((terminated: TMarketTerminated) => {
        dispatch(
          addNotification({
            description: (
              <Trans
                i18nKey="notifications.marketTerminated.description"
                values={{ marketName: terminated.market.name }}
                components={{ strong: <strong /> }}
              />
            ),
            category: "marketActivity",
            blockTimestamp: terminated.blockTimestamp,
            unread: true,
            etherscanUrl: `${EtherscanBaseUrl}/tx/${terminated.transactionHash}`,
          }),
        )
      })
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      console.error("Error fetching market terminateds: ", error)
    }
  }, [error])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    if (!address) return
    fetchTerminateds({
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
