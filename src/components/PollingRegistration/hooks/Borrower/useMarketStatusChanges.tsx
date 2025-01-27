import { useEffect, useState } from "react"

import {
  getMarketRecords,
  MarketRecord,
  DelinquencyStatusChangedRecord,
  Market,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { EtherscanBaseUrl } from "@/config/network"
import { SubgraphClient } from "@/config/subgraph"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: DelinquencyStatusChangedRecord[]
}

export const useMarketStatusChanges = (address?: `0x${string}`) => {
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()

  const { data: markets, isLoading } = useGetBorrowerMarkets()

  useEffect(() => {
    if (marketRecords) {
      // console.dir(marketRecords)
      marketRecords.forEach((data: MarketRecords) => {
        data.records.forEach((record: DelinquencyStatusChangedRecord) => {
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey={
                    record.isDelinquent
                      ? "notifications.statusChangeUnhealthy.description"
                      : "notifications.statusChangeHealthy.description"
                  }
                  values={{
                    marketName: data.marketName,
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
  }, [marketRecords, dispatch])

  return () => {
    if (!address || !markets || isLoading) return
    markets.forEach((market: Market) => {
      getMarketRecords(SubgraphClient, {
        market,
        kinds: ["DelinquencyStatusChanged"],
        additionalFilter: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      })
        .then((records: MarketRecord[]) => {
          setMarketRecords((prev) => [
            ...prev,
            {
              marketName: market.name,
              records: records as DelinquencyStatusChangedRecord[],
            },
          ])
        })
        .catch(
          (/* err */) =>
            // console.log(err)
            undefined,
        )
    })
  }
}
