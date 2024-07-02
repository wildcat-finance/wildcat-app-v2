import { useState } from "react"

import "./styles.css"
import { Box, SvgIcon, Typography } from "@mui/material"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { DelinquentCollateralObligationsProps } from "./interface"
import { MARKET_BAR_DATA } from "../../constants"
import { CollateralObligationsData } from "../CollateralObligationsData"

export const DelinquentCollateralObligations = ({
  market,
  legendItem,
  withdrawals,
}: DelinquentCollateralObligationsProps) => {
  const breakdown = market.getTotalDebtBreakdown()
  const reserves = breakdown.status === "delinquent" && breakdown.reserves

  const [expanded, setExpanded] = useState(true)

  const toggleExpanded = (value: boolean) => {
    setExpanded(!value)
  }

  return (
    <Box
      className="barchart__legend-item"
      sx={{ borderColor: COLORS.athensGrey }}
    >
      <Box
        className="barchart__legend-header"
        sx={{
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
        onClick={() => toggleExpanded(expanded)}
      >
        <Typography
          variant="text3"
          className="barchart__legend-title-expandable"
        >
          Collateral Obligations
        </Typography>
        {expanded ? (
          <SvgIcon
            fontSize="small"
            sx={{
              transform: "rotate(180deg)",
            }}
          >
            <UpArrow />
          </SvgIcon>
        ) : (
          <SvgIcon fontSize="small">
            <UpArrow />
          </SvgIcon>
        )}
      </Box>
      <Box className="double-item__container-inner">
        <Box sx={{ width: "100%" }}>
          <Box className="double-item__header">
            <Typography variant="text4">Delinquent Debt</Typography>
            <Box
              className="double-item__dot"
              sx={{
                backgroundColor:
                  MARKET_BAR_DATA.delinquentDebt.delinquentBgColor,
              }}
            />
          </Box>
          <Typography variant="text4">
            {formatTokenWithCommas(market.delinquentDebt, {
              withSymbol: true,
            })}
          </Typography>
        </Box>
        <Box
          className="double-item__divider-vertical"
          sx={{ borderColor: COLORS.athensGrey }}
        />
        <Box sx={{ width: "100%" }}>
          <Box className="double-item__header">
            <Typography variant="text4">Current Reserves</Typography>
            <Box
              className="double-item__dot"
              sx={{
                backgroundColor:
                  MARKET_BAR_DATA.currentReserves.delinquentBgColor,
              }}
            />
          </Box>
          <Box>
            <Typography variant="text4">
              {reserves &&
                `${formatTokenWithCommas(reserves, {
                  withSymbol: true,
                })}`}
            </Typography>
          </Box>
        </Box>
      </Box>
      {expanded && (
        <>
          <Box>
            <CollateralObligationsData
              market={market}
              withdrawals={withdrawals}
              doubleDivider
            />
          </Box>
          {formatTokenWithCommas(legendItem.value, {
            withSymbol: true,
          })}
        </>
      )}
    </Box>
  )
}
