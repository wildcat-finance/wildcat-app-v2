import { useEffect, useState } from "react"

import {
  getMarketRecords,
  MarketRecord,
  getWithdrawalBatch,
  WithdrawalBatch,
  WithdrawalPaymentRecord,
} from "@wildcatfi/wildcat-sdk"
import { Trans } from "react-i18next"
import { useDispatch } from "react-redux"

import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { EtherscanBaseUrl } from "@/config/network"
import { SubgraphClient } from "@/config/subgraph"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getLastFetchedTimestamp } from "@/utils/timestamp"

export const useLenderTokensAvailables = (address?: `0x${string}`) => {
  const [withdrawalBatches, setWithdrawalBatches] = useState<WithdrawalBatch[]>(
    [],
  )

  const dispatch = useDispatch()

  const { data: marketAccounts, isLoadingInitial: isLoading } =
    useLendersMarkets()

  useEffect(() => {
    if (withdrawalBatches) {
      console.dir(withdrawalBatches)
      withdrawalBatches.forEach((batch: WithdrawalBatch) => {
        batch.payments.forEach((payment: WithdrawalPaymentRecord) => {
          dispatch(
            addNotification({
              description: (
                <Trans
                  i18nKey="notifications.tokensAvailable.description"
                  values={{
                    marketName: batch.market.name,
                    value: formatTokenWithCommas(payment.normalizedAmountPaid, {
                      withSymbol: true,
                    }),
                  }}
                  components={{ strong: <strong /> }}
                />
              ),
              category: "marketActivity",
              blockTimestamp: payment.blockTimestamp,
              unread: true,
              etherscanUrl: `${EtherscanBaseUrl}/tx/${payment.transactionHash}`,
            }),
          )
        })
      })
    }
  }, [withdrawalBatches])

  return () => {
    if (!address || !marketAccounts || isLoading) return
    marketAccounts.forEach((marketAccount) => {
      getWithdrawalBatch(marketAccount.market, 0)
        .then((batch: WithdrawalBatch) => {
          setWithdrawalBatches((prev) => [...prev, batch])
        })
        .catch((err) => {
          console.log(err)
          return undefined
        })
    })
  }
}
