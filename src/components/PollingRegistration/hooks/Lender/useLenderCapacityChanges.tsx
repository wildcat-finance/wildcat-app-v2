import { useEffect, useState } from "react"

import {
  getMarketRecords,
  MarketRecord,
  MaxTotalSupplyUpdatedRecord,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: MaxTotalSupplyUpdatedRecord[]
}

export const useLenderCapacityChanges = (address?: `0x${string}`) => {
  const subgraphClient = useSubgraphClient()
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const { data: marketAccounts, isLoadingInitial: isLoading } =
    useLendersMarkets()

  useEffect(() => {
    if (marketRecords) {
      console.dir(marketRecords)
      marketRecords.forEach((data: MarketRecords) => {
        data.records.forEach((record: MaxTotalSupplyUpdatedRecord) => {
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey="notifications.capacityChange.description"
                  values={{
                    marketName: data.marketName,
                    oldValue: formatTokenWithCommas(record.oldMaxTotalSupply, {
                      withSymbol: true,
                    }),
                    newValue: formatTokenWithCommas(record.newMaxTotalSupply, {
                      withSymbol: true,
                    }),
                  }}
                  components={{ strong: <strong /> }}
                />
              ),
              category: "marketActivity",
              blockTimestamp: record.blockTimestamp,
              unread: true,
              blockExplorerUrl: getTxUrl(record.transactionHash),
            }),
          )
        })
      })
    }
  }, [marketRecords, dispatch, getTxUrl])

  return () => {
    if (!address || !marketAccounts || isLoading) return
    marketAccounts.forEach((marketAccount) => {
      getMarketRecords(subgraphClient, {
        market: marketAccount.market,
        kinds: ["MaxTotalSupplyUpdated"],
        additionalFilter: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      })
        .then((records: MarketRecord[]) => {
          setMarketRecords((prev) => [
            ...prev,
            {
              marketName: marketAccount.market.name,
              records: records as MaxTotalSupplyUpdatedRecord[],
            },
          ])
        })
        .catch((err) => {
          console.log(err)
          return undefined
        })
    })
  }
}
