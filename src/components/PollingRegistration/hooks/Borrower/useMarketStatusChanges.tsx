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
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { logger } from "@/lib/logging/client"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: DelinquencyStatusChangedRecord[]
}

export const useMarketStatusChanges = (address?: `0x${string}`) => {
  const subgraphClient = useSubgraphClient()
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const { data: markets, isLoading } = useGetBorrowerMarkets()

  useEffect(() => {
    if (marketRecords) {
      logger.debug({ marketRecords }, "Market status change records")
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
              blockExplorerUrl: getTxUrl(record.transactionHash),
            }),
          )
        })
      })
    }
  }, [marketRecords, dispatch, getTxUrl])

  return () => {
    if (!address || !markets || isLoading) return
    markets.forEach((market: Market) => {
      getMarketRecords(subgraphClient, {
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
        .catch((err) => {
          logger.error(
            { err, market: market.name },
            "Failed to fetch market status change records",
          )
          return undefined
        })
    })
  }
}
