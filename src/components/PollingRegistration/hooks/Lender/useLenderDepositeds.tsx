import { useEffect, useState } from "react"

import {
  getMarketRecords,
  MarketRecord,
  DepositRecord,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { logger } from "@/lib/logging/client"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatTokenWithCommas } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

type MarketRecords = {
  marketName: string
  records: DepositRecord[]
}

export const useLenderDepositeds = (address?: `0x${string}`) => {
  const subgraphClient = useSubgraphClient()
  const [marketRecords, setMarketRecords] = useState<MarketRecords[]>([])

  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

  const { data: marketAccounts, isLoadingInitial: isLoading } =
    useLendersMarkets()

  useEffect(() => {
    if (marketRecords) {
      logger.debug({ marketRecords }, "Lender deposit records")
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
        .catch((err) => {
          logger.error({ err }, "Failed to fetch lender deposits")
          return undefined
        })
    })
  }
}
