import { useState } from "react"

import { Box, Button, Divider, Link, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { getMarketRepaymentHistory, Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { QueryKeys } from "@/config/query-keys"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { getAppSubgraphClient } from "@/lib/gateway/client"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"

const formatTimestamp = (timestamp: number) =>
  dayjs.unix(timestamp).utc().format("DD MMM YYYY, HH:mm:ss [UTC]")

/** These are observed SDK lifecycle values, never a browser-clock default forecast. */
export const MarketRepaymentDetails = ({ market }: { market: Market }) => {
  const { t } = useTranslation()
  const { getTxUrl } = useBlockExplorer({ chainId: market.chainId })
  const [showHistory, setShowHistory] = useState(false)
  const supported = market.repaymentDate !== undefined
  const history = useQuery({
    queryKey: QueryKeys.Markets.GET_REPAYMENT_HISTORY(
      market.chainId,
      market.address,
    ),
    enabled: supported && showHistory,
    queryFn: async () =>
      (await getMarketRepaymentHistory(getAppSubgraphClient(market.chainId), {
        market: market.address,
        fetchPolicy: "network-only",
      })) ?? null,
    refetchInterval: 60_000,
    retry: 1,
  })

  if (!supported) return null

  const scheduled = (market.repaymentDate ?? 0) > 0
  const status = (() => {
    if (market.isClosed) return t("marketDetails.repayment.closed")
    if (market.isInRepayment) return t("marketDetails.repayment.active")
    return scheduled
      ? t("marketDetails.repayment.scheduled")
      : t("marketDetails.repayment.unscheduled")
  })()
  const rows = [
    ...(scheduled
      ? [
          {
            label: t("marketDetails.repayment.date"),
            value: formatTimestamp(market.repaymentDate!),
          },
          {
            label: t("marketDetails.repayment.period"),
            value:
              market.repaymentPeriod === undefined
                ? "—"
                : t("marketDetails.repayment.hours", {
                    count: market.repaymentPeriod / 3600,
                  }),
          },
          {
            label: t("marketDetails.repayment.deadline"),
            value:
              market.repaymentDeadline === undefined
                ? "—"
                : formatTimestamp(market.repaymentDeadline),
          },
        ]
      : []),
    ...(market.hasRecordedDefault
      ? [
          {
            label: t("marketDetails.repayment.defaultedAt"),
            value: formatTimestamp(market.defaultedAt!),
          },
        ]
      : []),
  ]
  const records = [
    ...(history.data?.terms
      ? [
          {
            key: "terms",
            label: t("marketDetails.repayment.termsRecorded"),
            record: history.data.terms,
            effectiveTimestamp: undefined,
          },
        ]
      : []),
    ...(history.data?.activation
      ? [
          {
            key: "activation",
            label: t("marketDetails.repayment.activated"),
            record: history.data.activation,
            effectiveTimestamp: history.data.activation.effectiveTimestamp,
          },
        ]
      : []),
    ...(history.data?.default
      ? [
          {
            key: "default",
            label: t("marketDetails.repayment.defaultRecorded"),
            record: history.data.default,
            effectiveTimestamp: history.data.default.effectiveTimestamp,
          },
        ]
      : []),
  ]

  return (
    <Box
      sx={{
        border: `1px solid ${COLORS.athensGrey}`,
        borderRadius: "12px",
        p: "16px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <Typography variant="title3">
          {t("marketDetails.repayment.title")}
        </Typography>
        <Typography variant="text2">{status}</Typography>
      </Box>
      {rows.length > 0 && (
        <Box
          component="dl"
          sx={{
            m: 0,
            mt: "16px",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: "12px 24px",
          }}
        >
          {rows.map(({ label, value }) => (
            <Box key={label}>
              <Typography
                component="dt"
                variant="text3"
                color={COLORS.santasGrey}
              >
                {label}
              </Typography>
              <Typography
                component="dd"
                variant="text3"
                sx={{ m: 0, mt: "4px" }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {market.isInRepayment && (
        <Typography variant="text3" component="p" sx={{ mt: "16px" }}>
          {t("marketDetails.repayment.activeNotice")}
        </Typography>
      )}
      {market.hasRecordedDefault && (
        <Typography variant="text3" component="p" sx={{ mt: "12px" }}>
          {t("marketDetails.repayment.defaultNotice")}
        </Typography>
      )}
      <Button
        size="small"
        aria-expanded={showHistory}
        onClick={() => setShowHistory(!showHistory)}
        sx={{ mt: "12px" }}
      >
        {showHistory
          ? t("marketDetails.repayment.hideHistory")
          : t("marketDetails.repayment.showHistory")}
      </Button>
      {showHistory && (
        <Box>
          <Divider sx={{ my: "12px" }} />
          {history.isLoading && (
            <Typography variant="text3">
              {t("marketDetails.repayment.loadingHistory")}
            </Typography>
          )}
          {history.isError && (
            <Box role="alert">
              <Typography variant="text3">
                {t("marketDetails.repayment.historyError")}
              </Typography>
              <Button
                size="small"
                disabled={history.isFetching}
                onClick={() => history.refetch()}
              >
                {t("common.buttons.tryAgain")}
              </Button>
            </Box>
          )}
          {records.map(({ key, label, record, effectiveTimestamp }) => (
            <Box key={key} sx={{ mb: "16px" }}>
              <Typography variant="text2" component="p">
                {label}
              </Typography>
              {effectiveTimestamp !== undefined && (
                <Typography variant="text3" component="p">
                  {t("marketDetails.repayment.effectiveAt", {
                    date: formatTimestamp(effectiveTimestamp),
                  })}
                </Typography>
              )}
              <Link
                href={getTxUrl(record.transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
              >
                {t("marketDetails.repayment.recordedAt", {
                  date: formatTimestamp(Number(record.blockTimestamp)),
                  block: record.blockNumber.toString(),
                })}
              </Link>
            </Box>
          ))}
          {history.isSuccess && records.length === 0 && (
            <Typography variant="text3" component="p">
              {t("marketDetails.repayment.noHistory")}
            </Typography>
          )}
          <Typography variant="text3" component="p" color={COLORS.santasGrey}>
            {t("marketDetails.repayment.historyNotice")}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
