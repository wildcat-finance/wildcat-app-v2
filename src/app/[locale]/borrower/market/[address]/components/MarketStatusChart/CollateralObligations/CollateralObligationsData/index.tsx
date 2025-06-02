import { Box, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { useTranslation } from "react-i18next"

import "./style.css"

import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { CollateralObligationsDataProps } from "./interface"

export const CollateralObligationsData = ({
  market,
  withdrawals,
  doubleDivider,
}: CollateralObligationsDataProps) => {
  const { t } = useTranslation()
  const {
    normalizedUnclaimedWithdrawals,
    normalizedPendingWithdrawals,
    minimumReserves,
  } = market
  const { activeWithdrawalsTotalOwed } = withdrawals
  const { activeWithdrawal } = withdrawals

  const claimableWDs = activeWithdrawal
    ? normalizedUnclaimedWithdrawals.sub(activeWithdrawal.normalizedAmountPaid)
    : normalizedUnclaimedWithdrawals

  const outstandingWDs = activeWithdrawal
    ? normalizedPendingWithdrawals.sub(activeWithdrawal.normalizedAmountOwed)
    : normalizedPendingWithdrawals

  const totalProtocolFeesAccrued =
    market.lastAccruedProtocolFees ||
    new TokenAmount(BigNumber.from(0), market.underlyingToken)

  return (
    <Box className="obligations__container">
      {doubleDivider && (
        <Box
          className="obligations__divider"
          sx={{ borderColor: COLORS.athensGrey }}
        />
      )}
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(minimumReserves, { withSymbol: true })}
        </Typography>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {t("borrowerMarketDetails.statusChart.minReserves")}
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(activeWithdrawalsTotalOwed, {
            withSymbol: true,
          })}
        </Typography>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {t("borrowerMarketDetails.statusChart.ongoingWds")}
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(claimableWDs, { withSymbol: true })}
        </Typography>

        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {t("borrowerMarketDetails.statusChart.claimableWds")}
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(outstandingWDs, { withSymbol: true })}
        </Typography>

        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {t("borrowerMarketDetails.statusChart.outstandingWds")}
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(totalProtocolFeesAccrued, {
            withSymbol: true,
          })}
        </Typography>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {t("borrowerMarketDetails.statusChart.protocolFees")}
        </Typography>
      </Box>
      <Box
        className="obligations__divider"
        sx={{
          margin: doubleDivider ? "12px 0 12px 0" : "12px 0 8px 0",
          borderColor: COLORS.athensGrey,
        }}
      />
    </Box>
  )
}
