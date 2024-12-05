import { useEffect, useState } from "react"

import {
  getMarketRecords,
  MarketRecord,
  AnnualInterestBipsUpdatedRecord,
  MarketClosedRecord,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { EtherscanBaseUrl } from "@/config/network"
import { SubgraphClient } from "@/config/subgraph"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatBps } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: MarketClosedRecord[]
}

export const useMarketTerminateds = (address?: `0x${string}`) => {
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()

  const { data: markets, isLoadingInitial: isLoading } = useGetBorrowerMarkets()

  useEffect(() => {
    if (marketRecords) {
      console.dir(marketRecords)
      marketRecords.forEach((data: MarketRecords) => {
        data.records.forEach((record: MarketClosedRecord) => {
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey="notifications.marketTerminated.description"
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
  }, [marketRecords])

  return () => {
    if (!address || !markets || isLoading) return
    markets.forEach((market) => {
      getMarketRecords(SubgraphClient, {
        market,
        kinds: ["MarketClosed"],
        additionalFilter: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      })
        .then((records: MarketRecord[]) => {
          setMarketRecords((prev) => [
            ...prev,
            {
              marketName: market.name,
              records: records as MarketClosedRecord[],
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

// Add notification description
