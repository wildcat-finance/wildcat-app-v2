import type { SxProps, Theme } from "@mui/material"
import { Box, SvgIcon, Typography } from "@mui/material"
import type { Market } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import Clock from "@/assets/icons/clock_icon.svg"
import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
import { COLORS } from "@/theme/colors"
import {
  formatPeriodicWithdrawalWindowStart,
  getPeriodicWindowTiming,
  isPeriodicWithdrawalWindowClosed,
} from "@/utils/periodicWithdrawalWindow"

export const PeriodicWithdrawalWindowNotice = ({
  market,
  sx,
  variant = "closed",
}: {
  market: Market
  sx?: SxProps<Theme>
  variant?: "closed" | "deposit"
}) => {
  const { t } = useTranslation()
  const isPeriodicTerm = !!market.periodicHooksConfig
  // Ticks while the schedule is live: the countdown counts down for real and
  // the closed-variant notice disappears the moment the window opens.
  const nowSec = useLivePeriodicNowSeconds(market)
  const isWindowClosed = isPeriodicWithdrawalWindowClosed(market, nowSec)

  if (!isPeriodicTerm || (variant === "closed" && !isWindowClosed)) {
    return null
  }

  const timing = getPeriodicWindowTiming(market, nowSec)
  const nextWindowStart =
    timing && !timing.isTermClosed ? timing.nextWindowStart : undefined
  const opensInCountdown =
    nextWindowStart !== undefined
      ? humanizeDuration(Math.max(0, nextWindowStart - nowSec) * 1000, {
          round: true,
          largest: 2,
        })
      : undefined
  const noticeText =
    variant === "deposit"
      ? t("lenderMarketDetails.transactions.deposit.periodicWindowNotice")
      : t("lenderMarketDetails.transactions.withdraw.periodicWindow.closed")

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "12px",
        borderRadius: "8px",
        bgcolor: COLORS.whiteSmoke,
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        overflow: "hidden",
        ...sx,
      }}
    >
      <SvgIcon
        sx={{
          fontSize: "16px",
          flexShrink: 0,
          "& path": { fill: COLORS.greySuit },
          mt: "1px",
        }}
      >
        <Clock />
      </SvgIcon>

      <Box
        sx={{
          minWidth: 0,
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <Typography
          component="span"
          variant="mobText3"
          sx={{
            display: "block",
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            lineHeight: "20px",
          }}
        >
          {noticeText}
        </Typography>

        {isWindowClosed && nextWindowStart && (
          <Typography
            component="span"
            variant="mobText3"
            color={COLORS.santasGrey}
            sx={{
              display: "block",
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              lineHeight: "20px",
            }}
          >
            {t(
              "lenderMarketDetails.transactions.withdraw.periodicWindow.nextStart",
              {
                date: formatPeriodicWithdrawalWindowStart(nextWindowStart),
                countdown: opensInCountdown,
              },
            )}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
