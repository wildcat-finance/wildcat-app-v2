import React from "react"

import { Box, Typography, Chip, Button } from "@mui/material"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import { formatUnits } from "ethers/lib/utils"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { COLORS } from "@/theme/colors"

type MarketCardProps = {
  marketName: string
  borrowerName?: string
  borrowerAddress: string
  marketAddress: string
  assetName?: string
  apr?: string
  marketLink: string
  capacity?: string
  totalDeposited?: string
  delinquent?: boolean
  status?: string
  isLender?: boolean
  term?:
    | {
        fixedPeriod?: number
        kind: string | HooksKind
      }
    | string
  isSelfOnboard?: boolean
}

export const MarketCard = ({
  marketName,
  borrowerName,
  borrowerAddress,
  marketAddress,
  assetName,
  apr,
  marketLink,
  capacity,
  totalDeposited,
  delinquent,
  status,
  isLender,
  term,
  isSelfOnboard,
}: MarketCardProps) => {
  const { t } = useTranslation()

  // Function to determine status color based on status
  const getStatusColor = () => {
    if (delinquent) return { bg: COLORS.cherub, text: COLORS.dullRed }
    if (status === "Healthy") {
      return { bg: COLORS.glitter, text: COLORS.ultramarineBlue }
    }
    return { bg: COLORS.whiteSmoke, text: COLORS.blackRock }
  }

  const statusColors = getStatusColor()

  return (
    <Box
      sx={{
        width: "100%",
        padding: "16px",
        borderRadius: "8px",
        border: `1px solid ${COLORS.blackRock006}`,
        marginBottom: "12px",
        backgroundColor: COLORS.white,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Market Name and Status in the same row */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* Market Name */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Typography variant="text4" color={COLORS.santasGrey}>
              {t("dashboard.markets.tables.header.name")}
            </Typography>
            <Typography variant="text1" fontWeight={600}>
              {marketName}
            </Typography>
          </Box>

          {/* Status */}
          {status && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                alignItems: "flex-end",
              }}
            >
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("dashboard.markets.tables.header.status")}
              </Typography>
              <Chip
                label={status}
                size="small"
                sx={{
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              />
            </Box>
          )}
        </Box>

        {/* Borrower Info with Link & Term */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* Borrower and Term Column */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Borrower Info */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("dashboard.markets.tables.header.borrower")}
              </Typography>
              <Link
                href={`/borrower/profile/${borrowerAddress}`}
                passHref
                style={{ textDecoration: "none", color: COLORS.blackRock }}
              >
                <Typography
                  variant="text3"
                  sx={{
                    "&:hover": {
                      textDecoration: "underline",
                      color: COLORS.blackRock,
                    },
                  }}
                >
                  {borrowerName || borrowerAddress}
                </Typography>
              </Link>
            </Box>

            {/* Term */}
            {term && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <Typography variant="text4" color={COLORS.santasGrey}>
                  {t("dashboard.markets.tables.header.term")}
                </Typography>
                <Box>
                  {typeof term === "object" && (
                    <MarketTypeChip
                      kind={term.kind as HooksKind}
                      fixedPeriod={term.fixedPeriod}
                    />
                  )}
                  {typeof term === "string" && (
                    <Typography variant="text3" fontWeight={600}>
                      {term}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Asset & APR */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("dashboard.markets.tables.header.asset")}
              </Typography>
              <Typography variant="text3">{assetName}</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("dashboard.markets.tables.header.apr")}
              </Typography>
              <Typography variant="text3">{apr}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Capacity & Total Deposited for Lender */}
        {isLender && capacity && totalDeposited && (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("dashboard.markets.tables.header.capacity")}
              </Typography>
              <Typography variant="text3">{capacity}</Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                alignItems: "flex-end",
              }}
            >
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("dashboard.markets.tables.header.debt")}
              </Typography>
              <Typography variant="text3">{totalDeposited}</Typography>
            </Box>
          </Box>
        )}

        {/* View Details Button */}
        <Box sx={{ marginTop: "8px" }}>
          <Link href={marketLink} passHref style={{ textDecoration: "none" }}>
            <Button size="small" variant="contained" color="secondary" fullWidth>
              {isSelfOnboard
                ? `${t("dashboard.markets.tables.other.depositBTN")}`
                : `${t("dashboard.markets.tables.other.requestBTN")}`}
            </Button>
          </Link>
        </Box>
      </Box>
    </Box>
  )
}
