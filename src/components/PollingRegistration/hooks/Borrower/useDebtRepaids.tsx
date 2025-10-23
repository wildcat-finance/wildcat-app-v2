import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { lazyQueryOptions } from "@/config/subgraph"
import { DEBT_REPAIDS } from "@/graphql/queries"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatTokenAmount } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

import { TDebtRepaid } from "../../interface"

export const useDebtRepaids = (
  marketIds: string[],
  address?: `0x${string}`,
) => {
  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const [fetchDebtRepaids, { data, error }] = useLazyQuery(
    DEBT_REPAIDS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      console.dir(data)
      data.debtRepaids.forEach((debtRepaid: TDebtRepaid) => {
        dispatch(
          addNotification({
            description: (
              <Trans
                i18nKey="notifications.debtRepaid.description"
                values={{
                  marketName: debtRepaid.market.name,
                  amount: formatTokenAmount(
                    debtRepaid.assetAmount,
                    debtRepaid.market.decimals,
                    4,
                  ),
                  asset: debtRepaid.market.symbol,
                }}
                components={{ strong: <strong /> }}
              />
            ),
            category: "marketActivity",
            blockTimestamp: debtRepaid.blockTimestamp,
            unread: true,
            blockExplorerUrl: getTxUrl(debtRepaid.transactionHash),
          }),
        )
      })
    }
  }, [data, dispatch, getTxUrl])

  useEffect(() => {
    if (error) {
      console.error("Error fetching dept repays: ", error)
    }
  }, [error])

  return () => {
    // marketIds = ["0xa23ce7c1a04520efb6968b711331ce33e4efad9a"] // Testing
    if (!address) return
    fetchDebtRepaids({
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
