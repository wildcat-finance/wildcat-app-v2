import { useEffect, useState } from "react"

import {
  getMarketRecords,
  Market,
  MarketRecord,
  WithdrawalRequestRecord,
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
  records: WithdrawalRequestRecord[]
}

export const useLenderWithdrawalRequests = (address?: `0x${string}`) => {
  const subgraphClient = useSubgraphClient()
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const { data: markets, isLoading } = useGetBorrowerMarkets()

  useEffect(() => {
    if (marketRecords) {
      logger.debug({ marketRecords }, "Withdrawal request records")
      marketRecords.forEach((data: MarketRecords) => {
        data.records.forEach((record: WithdrawalRequestRecord) => {
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey="notifications.withdrawalRequest.description"
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
        kinds: ["WithdrawalRequest"],
        additionalFilter: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      })
        .then((records: MarketRecord[]) => {
          setMarketRecords((prev) => [
            ...prev,
            {
              marketName: market.name,
              records: records as WithdrawalRequestRecord[],
            },
          ])
        })
        .catch((err) => {
          logger.error(
            { err, market: market.name },
            "Failed to fetch withdrawal request records",
          )
          return undefined
        })
    })
  }
}
