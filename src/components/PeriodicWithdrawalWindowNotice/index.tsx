import type { SxProps, Theme } from "@mui/material"
import { Box, SvgIcon, Typography } from "@mui/material"
import type { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import Clock from "@/assets/icons/clock_icon.svg"
import { COLORS } from "@/theme/colors"
import {
  formatPeriodicWithdrawalWindowStart,
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
  const isWindowClosed = isPeriodicWithdrawalWindowClosed(market)

  if (!isPeriodicTerm || (variant === "closed" && !isWindowClosed)) {
    return null
  }

  const nextWindowStart = market.nextPeriodicWithdrawalWindowStart
  const noticeText =
    variant === "deposit"
      ? t("lenderMarketDetails.transactions.deposit.periodicWindowNotice")
      : t("lenderMarketDetails.transactions.withdraw.periodicWindow.closed")

  return (
    <Box
      sx={{
        width: "100%",
        padding: "12px",
        borderRadius: "8px",
        bgcolor: COLORS.whiteSmoke,
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        ...sx,
      }}
    >
      <SvgIcon
        sx={{
          fontSize: "16px",
          "& path": { fill: COLORS.greySuit },
          mt: "1px",
        }}
      >
        <Clock />
      </SvgIcon>

      <Box>
        <Typography variant="mobText3">{noticeText}</Typography>

        {isWindowClosed && nextWindowStart && (
          <Typography variant="mobText3" color={COLORS.santasGrey}>
            {t(
              "lenderMarketDetails.transactions.withdraw.periodicWindow.nextStart",
              {
                date: formatPeriodicWithdrawalWindowStart(nextWindowStart),
              },
            )}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
