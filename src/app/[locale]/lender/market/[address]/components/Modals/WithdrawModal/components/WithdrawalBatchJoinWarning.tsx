import { Box, Divider, Link, Typography } from "@mui/material"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import type { WithdrawalBatchJoinWarningResult } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawalBatchJoinWarning"
import { Trans } from "@/components/Translation"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

const formatBatchDuration = (seconds: number) =>
  humanizeDuration(Math.max(0, seconds) * 1_000, {
    largest: 2,
    round: true,
  })

const formatLossPercent = (thousandths: bigint) => {
  if (thousandths === 0n) return "<0.001"
  return (Number(thousandths) / 1_000)
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

export const WithdrawalBatchJoinWarning = ({
  warning,
}: {
  warning: WithdrawalBatchJoinWarningResult
}) => {
  const { t } = useTranslation()
  if (warning.state === "clear") return null

  const title = (() => {
    if (warning.state === "loading") {
      return t(
        "marketDetails.lender.transactions.withdraw.batchJoin.checkingTitle",
      )
    }
    if (warning.state === "unknown") {
      return t(
        "marketDetails.lender.transactions.withdraw.batchJoin.unknownTitle",
      )
    }
    return t("marketDetails.lender.transactions.withdraw.batchJoin.title", {
      elapsed: formatBatchDuration(warning.openedSecondsAgo),
    })
  })()

  const body = (() => {
    if (warning.state === "loading") {
      return t(
        "marketDetails.lender.transactions.withdraw.batchJoin.checkingBody",
      )
    }
    if (warning.state === "unknown") {
      return (
        <Trans
          i18nKey="marketDetails.lender.transactions.withdraw.batchJoin.unknownBody"
          components={{
            docs: (
              <Link
                href={EXTERNAL_LINKS.DOCS_WITHDRAWAL_BATCH_INTEREST}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "inherit", fontWeight: 600 }}
              />
            ),
          }}
        />
      )
    }
    if (!warning.estimate) return null

    return (
      <Trans
        i18nKey="marketDetails.lender.transactions.withdraw.batchJoin.warningBody"
        values={{
          payout: formatTokenWithCommas(warning.estimate.estimatedPayout),
          loss: formatTokenWithCommas(warning.estimate.estimatedLoss),
          symbol: warning.estimate.estimatedPayout.symbol,
          percent: formatLossPercent(warning.estimate.lossPercentThousandths),
        }}
        components={{
          strong: <strong />,
          docs: (
            <Link
              href={EXTERNAL_LINKS.DOCS_WITHDRAWAL_BATCH_INTEREST}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "inherit", fontWeight: 600 }}
            />
          ),
        }}
      />
    )
  })()

  return (
    <Box
      role={warning.state === "loading" ? "status" : "note"}
      aria-live={warning.state === "loading" ? "polite" : undefined}
      sx={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: "10px",
        backgroundColor: COLORS.oasis,
        border: `1px solid ${COLORS.galliano}`,
        color: COLORS.butteredRum,
      }}
    >
      <Typography
        variant="text3"
        sx={{ display: "block", fontWeight: 600, lineHeight: "20px" }}
      >
        {title}
      </Typography>
      <Typography
        component="div"
        variant="text3"
        sx={{ marginTop: "4px", lineHeight: "20px" }}
      >
        {body}
      </Typography>

      {!!warning.expiry && (
        <>
          <Divider sx={{ my: "12px", borderColor: COLORS.galliano }} />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: { xs: "2px", sm: "10px" },
            }}
          >
            <Typography variant="text3" sx={{ fontWeight: 600 }}>
              {t(
                "marketDetails.lender.transactions.withdraw.batchJoin.closesIn",
                {
                  remaining: formatBatchDuration(warning.remainingSeconds),
                },
              )}
            </Typography>
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: "none", sm: "block" },
                borderColor: COLORS.galliano,
              }}
            />
            <Typography variant="text3">
              {t("marketDetails.lender.transactions.withdraw.batchJoin.wait")}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  )
}
