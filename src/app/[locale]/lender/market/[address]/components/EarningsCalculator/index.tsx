"use client"

import * as React from "react"
import { ChangeEvent, useMemo, useState } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { useTranslation } from "react-i18next"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import {
  formatBps,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
} from "@/utils/formatters"

export type EarningsCalculatorProps = {
  marketAccount: MarketAccount
  defaultExpanded?: boolean
}

const PERIODS = [
  { key: "thirtyDays", days: 30 },
  { key: "ninetyDays", days: 90 },
  { key: "oneYear", days: 365 },
] as const

const BPS_DENOMINATOR = 10_000
const DAYS_PER_YEAR = 365

export const EarningsCalculator = ({
  marketAccount,
  defaultExpanded = false,
}: EarningsCalculatorProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { market } = marketAccount
  const { underlyingToken, annualInterestBips } = market

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [amount, setAmount] = useState("")

  const depositAmount = useMemo(
    () => underlyingToken.parseAmount(amount || "0"),
    [amount, underlyingToken],
  )

  const exceedsCapacity =
    !depositAmount.raw.isZero() &&
    depositAmount.gt(marketAccount.maximumDeposit)

  const projections = useMemo(
    () =>
      PERIODS.map(({ key, days }) => {
        const interestRaw = depositAmount.raw
          .mul(BigNumber.from(annualInterestBips))
          .mul(BigNumber.from(days))
          .div(BigNumber.from(BPS_DENOMINATOR * DAYS_PER_YEAR))

        return {
          key,
          interest: underlyingToken.getAmount(interestRaw),
        }
      }),
    [depositAmount, annualInterestBips, underlyingToken],
  )

  const aprFormatted = formatBps(
    annualInterestBips,
    MARKET_PARAMS_DECIMALS.annualInterestBips,
  )

  const handleChange = (evt: ChangeEvent<HTMLInputElement>) => {
    setAmount(evt.target.value)
  }

  const toggleExpanded = () => setIsExpanded((prev) => !prev)

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        padding: isMobile ? "16px" : "20px",
        borderRadius: "12px",
        border: `1px solid ${COLORS.whiteLilac}`,
        backgroundColor: "transparent",
        width: "100%",
      }}
    >
      <Box
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggleExpanded()
          }
        }}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          cursor: "pointer",
          userSelect: "none",
          outline: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Typography variant={isMobile ? "mobH3" : "title3"}>
              {t("lenderMarketDetails.transactions.calculator.title")}
            </Typography>
            <Box
              onClick={(e) => e.stopPropagation()}
              sx={{ display: "flex", cursor: "default" }}
            >
              <TooltipButton
                value={t("lenderMarketDetails.transactions.calculator.tooltip")}
              />
            </Box>
          </Box>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            {t("lenderMarketDetails.transactions.calculator.subtitle", {
              apr: aprFormatted,
            })}
          </Typography>
        </Box>

        <SvgIcon
          fontSize="small"
          sx={{
            flexShrink: 0,
            marginTop: "4px",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease-in-out",
            "& path": { fill: COLORS.greySuit },
          }}
        >
          <UpArrow />
        </SvgIcon>
      </Box>

      {isExpanded && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          <NumberTextField
            label={t("lenderMarketDetails.transactions.calculator.inputLabel")}
            size="medium"
            sx={{
              width: "100%",
              "& .MuiInputBase-root": {
                backgroundColor: COLORS.white,
                "&:hover": { backgroundColor: COLORS.white },
                "&.Mui-focused": { backgroundColor: COLORS.white },
              },
            }}
            value={amount}
            onChange={handleChange}
            endAdornment={
              <TextfieldChip text={underlyingToken.symbol} size="small" />
            }
          />

          {exceedsCapacity && (
            <Box
              sx={{
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: COLORS.oasis,
              }}
            >
              <Typography variant="text4" color={COLORS.butteredRum}>
                {t(
                  "lenderMarketDetails.transactions.calculator.exceedsCapacity",
                  {
                    remaining: formatTokenWithCommas(
                      marketAccount.maximumDeposit,
                      { withSymbol: true },
                    ),
                  },
                )}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {projections.map(({ key, interest }) => (
              <Box
                key={key}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  backgroundColor: COLORS.blackHaze,
                }}
              >
                <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
                  {t(
                    `lenderMarketDetails.transactions.calculator.periods.${key}`,
                  )}
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "baseline", gap: "4px" }}
                >
                  <Typography variant="title3">
                    {formatTokenWithCommas(interest)}
                  </Typography>
                  <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
                    {underlyingToken.symbol}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
            {t("lenderMarketDetails.transactions.calculator.disclaimer")}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
