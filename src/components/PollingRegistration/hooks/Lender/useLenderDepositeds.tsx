import { useEffect, useState } from "react"

import {
  getMarketRecords,
  MarketRecord,
  DepositRecord,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { EtherscanBaseUrl } from "@/config/network"
import { SubgraphClient } from "@/config/subgraph"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatTokenWithCommas } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: DepositRecord[]
}

export const useLenderDepositeds = (address?: `0x${string}`) => {
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()

  const { data: marketAccounts, isLoadingInitial: isLoading } =
    useLendersMarkets()

  useEffect(() => {
    if (marketRecords) {
      // console.dir(marketRecords)
      marketRecords.forEach((data: MarketRecords) => {
        data.records.forEach((record: DepositRecord) => {
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey="notifications.lenderDeposit.description"
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
              etherscanUrl: `${EtherscanBaseUrl}/tx/${record.transactionHash}`,
            }),
          )
        })
      })
    }
  }, [marketRecords, dispatch])

  return () => {
    if (!address || !marketAccounts || isLoading) return
    marketAccounts.forEach((marketAccount) => {
      getMarketRecords(SubgraphClient, {
        market: marketAccount.market,
        kinds: ["Deposit"],
        additionalFilter: {
          blockTimestamp_gt: getLastFetchedTimestamp(address),
        },
      })
        .then((records: MarketRecord[]) => {
          setMarketRecords((prev) => [
            ...prev,
            {
              marketName: marketAccount.market.name,
              records: records as DepositRecord[],
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
