import React from "react"

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Skeleton,
} from "@mui/material"
import { formatUnits } from "ethers/lib/utils"
import { useTranslation } from "react-i18next"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { LenderMarketsTableProps } from "./interfaces"

export const LenderMarketsTable = ({
  markets,
  borrowers,
  isLoading,
}: LenderMarketsTableProps) => {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Box sx={{ padding: "12px", width: "100%" }}>
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </Box>
    )
  }

  if (markets.length === 0) {
    return (
      <Box sx={{ padding: "12px", width: "100%" }}>
        <Typography variant="body2" color={COLORS.santasGrey}>
          {t("dashboard.markets.tables.noMarkets")}
        </Typography>
      </Box>
    )
  }

  return (
    <TableContainer component={Paper} sx={{ boxShadow: "none", width: "100%" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("dashboard.markets.tables.marketName")}</TableCell>
            <TableCell>{t("dashboard.markets.tables.borrower")}</TableCell>
            <TableCell align="right">{t("dashboard.markets.tables.asset")}</TableCell>
            <TableCell align="right">{t("dashboard.markets.tables.apr")}</TableCell>
            <TableCell align="right">{t("dashboard.markets.tables.capacity")}</TableCell>
            <TableCell align="right">{t("dashboard.markets.tables.totalDeposited")}</TableCell>
            <TableCell align="right">{t("dashboard.markets.tables.status")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {markets.map((marketAccount) => {
            const { market } = marketAccount
            const borrower = borrowers?.find(
              (b) => b.address.toLowerCase() === market.borrower.toLowerCase(),
            )
            const borrowerName = borrower?.name || trimAddress(market.borrower)
            const { symbol, decimals } = market.underlyingToken
            
            // Create status object required by MarketStatusChip
            const statusObj = {
              status: market.status,
              healthyPeriod: market.secondsBeforeDelinquency
                ? market.secondsBeforeDelinquency * 1000
                : null,
              penaltyPeriod: market.timeDelinquent && market.delinquencyGracePeriod
                ? Math.max(0, market.timeDelinquent - market.delinquencyGracePeriod)
                : 0,
              delinquencyPeriod: market.timeDelinquent && market.delinquencyGracePeriod
                ? Math.max(0, market.delinquencyGracePeriod - market.timeDelinquent)
                : 0,
            }
            
            return (
              <TableRow key={market.address} hover>
                <TableCell>
                  <Typography
                    component="a"
                    href={`${ROUTES.lender.market}/${market.address}`}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    {market.name}
                  </Typography>
                </TableCell>
                <TableCell>{borrowerName}</TableCell>
                <TableCell align="right">{symbol}</TableCell>
                <TableCell align="right">{`${market.aprBps / 100}%`}</TableCell>
                <TableCell align="right">
                  {`${formatUnits(market.maxTotalSupply, decimals)} ${symbol}`}
                </TableCell>
                <TableCell align="right">
                  {`${formatUnits(market.totalSupply, decimals)} ${symbol}`}
                </TableCell>
                <TableCell align="right">
                  <MarketStatusChip status={statusObj} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
} 