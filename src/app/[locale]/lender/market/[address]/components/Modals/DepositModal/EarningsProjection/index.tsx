"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"
import { Token, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { useTranslation } from "react-i18next"

import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import {
  formatBps,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
} from "@/utils/formatters"

export type EarningsProjectionProps = {
  depositAmount: TokenAmount
  annualInterestBips: number
  underlyingToken: Token
}

const PERIODS = [
  { key: "thirtyDays", days: 30 },
  { key: "ninetyDays", days: 90 },
  { key: "oneYear", days: 365 },
] as const

const BPS_DENOMINATOR = 10_000
const DAYS_PER_YEAR = 365

export const EarningsProjection = ({
  depositAmount,
  annualInterestBips,
  underlyingToken,
}: EarningsProjectionProps) => {
  const { t } = useTranslation()
  const isEmpty = depositAmount.raw.isZero()
  const isMobile = useMobileResolution()

  const projections = PERIODS.map(({ key, days }) => {
    const interestRaw = depositAmount.raw
      .mul(BigNumber.from(annualInterestBips))
      .mul(BigNumber.from(days))
      .div(BigNumber.from(BPS_DENOMINATOR * DAYS_PER_YEAR))
    return { key, interest: underlyingToken.getAmount(interestRaw) }
  })

  const aprFormatted = formatBps(
    annualInterestBips,
    MARKET_PARAMS_DECIMALS.annualInterestBips,
  )

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "4px" : "18px",
        width: "100%",
        paddingTop: "24px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 0 : "6px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Typography variant={isMobile ? "mobText2" : "text1"}>
            {t(
              "lenderMarketDetails.transactions.deposit.modal.projection.title",
            )}
          </Typography>

          <TooltipButton
            value={t(
              "lenderMarketDetails.transactions.deposit.modal.projection.tooltip",
            )}
          />
        </Box>

        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={isMobile ? COLORS.manate : COLORS.blackRock}
          sx={{ opacity: isMobile ? 0.8 : 1 }}
        >
          {t(
            "lenderMarketDetails.transactions.deposit.modal.projection.subtitle",
          )}{" "}
          <span style={{ textDecoration: "underline" }}>{aprFormatted}%</span>.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "6px",
          width: "100%",
        }}
      >
        {projections.map(({ key, interest }) => (
          <Box
            key={key}
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: isMobile ? "row" : "column",
              alignItems: isMobile ? "center" : "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              padding: isMobile ? "8px 0px" : "8px 12px",
              borderRadius: isMobile ? 0 : "12px",
              backgroundColor: isMobile ? "transparent" : COLORS.hintOfRed,
              borderBottom:
                key !== "oneYear" && isMobile
                  ? `1px solid ${COLORS.whiteLilac}`
                  : "none",
            }}
          >
            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              sx={{
                color: isMobile ? COLORS.blackRock : COLORS.manate,
                opacity: isMobile ? 0.8 : 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {`${t(
                `lenderMarketDetails.transactions.deposit.modal.projection.periods.${key}`,
              )}・${underlyingToken.symbol}`}
            </Typography>

            <Typography
              variant={isMobile ? "mobText2" : "text2"}
              sx={{
                color: isEmpty ? COLORS.manate : COLORS.blackRock,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isEmpty ? "0" : formatTokenWithCommas(interest)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography
        variant={isMobile ? "mobText4" : "text4"}
        sx={{ color: COLORS.manate }}
      >
        {`* ${t(
          "lenderMarketDetails.transactions.deposit.modal.projection.disclaimer",
        )}`}
      </Typography>
    </Box>
  )
}
