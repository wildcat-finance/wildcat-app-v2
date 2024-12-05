import { useEffect, useState } from "react"

import {
  getMarketRecords,
  Market,
  MarketRecord,
  MaxTotalSupplyUpdatedRecord,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { EtherscanBaseUrl } from "@/config/network"
import { SubgraphClient } from "@/config/subgraph"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: MaxTotalSupplyUpdatedRecord[]
}

export const useCapacityChanges = (address?: `0x${string}`) => {
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()

  const { data: markets, isLoading } = useGetBorrowerMarkets()

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
              etherscanUrl: `${EtherscanBaseUrl}/tx/${record.transactionHash}`,
            }),
          )
        })
      })
    }
  }, [marketRecords])

  return () => {
    if (!address || !markets || isLoading) return
    markets.forEach((market: Market) => {
      getMarketRecords(SubgraphClient, {
        market,
        kinds: ["MaxTotalSupplyUpdated"],
        additionalFilter: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      })
        .then((records: MarketRecord[]) => {
          setMarketRecords((prev) => [
            ...prev,
            {
              marketName: market.name,
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
