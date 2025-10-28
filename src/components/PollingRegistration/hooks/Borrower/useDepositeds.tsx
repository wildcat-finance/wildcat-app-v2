import { useEffect, useState } from "react"

import {
  getMarketRecords,
  MarketRecord,
  DepositRecord,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: DepositRecord[]
}

export const useDepositeds = (address?: `0x${string}`) => {
  const subgraphClient = useSubgraphClient()
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const { data: markets, isLoading } = useGetBorrowerMarkets()

  useEffect(() => {
    if (marketRecords) {
      console.dir(marketRecords)
      marketRecords.forEach((data: MarketRecords) => {
        data.records.forEach((record: DepositRecord) => {
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey="notifications.deposit.description"
                  values={{
                    marketName: data.marketName,
                    amount: formatTokenWithCommas(record.amount, {
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
    if (!address || !markets || isLoading) return
    markets.forEach((market) => {
      getMarketRecords(subgraphClient, {
        market,
        kinds: ["Deposit"],
        additionalFilter: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      })
        .then((records: MarketRecord[]) => {
          setMarketRecords((prev) => [
            ...prev,
            {
              marketName: market.name,
              records: records as DepositRecord[],
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
