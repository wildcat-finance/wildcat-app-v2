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
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"

export const useLenderTokensAvailables = (address?: `0x${string}`) => {
  const [withdrawalBatches, setWithdrawalBatches] = useState<WithdrawalBatch[]>(
    [],
  )

  const dispatch = useDispatch()
  const { getTxUrl } = useBlockExplorer()

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
              blockExplorerUrl: getTxUrl(payment.transactionHash),
            }),
          )
        })
      })
    }
  }, [withdrawalBatches, dispatch, getTxUrl])

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
