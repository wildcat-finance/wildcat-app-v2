import { Box, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"

import "./style.css"

import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { CollateralObligationsDataProps } from "./interface"

export const CollateralObligationsData = ({
  market,
  withdrawals,
  doubleDivider,
}: CollateralObligationsDataProps) => {
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
    market.totalProtocolFeesAccrued ||
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
          Min Reserves
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(activeWithdrawalsTotalOwed, {
            withSymbol: true,
          })}
        </Typography>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          Ongoing WDs
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(claimableWDs, { withSymbol: true })}
        </Typography>

        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          Claimable WDs
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(outstandingWDs, { withSymbol: true })}
        </Typography>

        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          Outstanding WDs
        </Typography>
      </Box>
      <Box className="obligations__value">
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {formatTokenWithCommas(totalProtocolFeesAccrued, {
            withSymbol: true,
          })}
        </Typography>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          Protocol Fees
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
