import React from "react"

import { Box, Typography, Chip, Button } from "@mui/material"
import { formatUnits } from "ethers/lib/utils"
import Link from "next/link"
import { useTranslation } from "react-i18next"

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
}: MarketCardProps) => {
  const { t } = useTranslation()

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
        {/* Market Name & Status */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="text1" fontWeight={600}>
            {marketName}
          </Typography>
          {status && (
            <Chip
              label={status}
              size="small"
              sx={{ 
                backgroundColor: delinquent ? COLORS.lightCorallRed : COLORS.whiteSmoke,
                color: delinquent ? COLORS.blazeOrange : COLORS.blackRock,
                fontWeight: 500,
                fontSize: "12px",
              }}
            />
          )}
        </Box>

        {/* Borrower Info */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Typography variant="text4" color={COLORS.santasGrey}>
            {t("common.borrower")}
          </Typography>
          <Typography variant="text3">
            {borrowerName || (borrowerAddress)}
          </Typography>
        </Box>

        {/* Asset & APR */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Typography variant="text4" color={COLORS.santasGrey}>
              {t("common.asset")}
            </Typography>
            <Typography variant="text3">{assetName}</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
            <Typography variant="text4" color={COLORS.santasGrey}>
              {t("common.apr")}
            </Typography>
            <Typography variant="text3">{apr}</Typography>
          </Box>
        </Box>

        {/* Capacity & Total Deposited for Lender */}
        {isLender && capacity && totalDeposited && (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("common.capacity")}
              </Typography>
              <Typography variant="text3">{capacity}</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                {t("common.totalDeposited")}
              </Typography>
              <Typography variant="text3">{totalDeposited}</Typography>
            </Box>
          </Box>
        )}

        {/* View Details Button */}
        <Box sx={{ marginTop: "8px" }}>
          <Link href={marketLink} passHref style={{ textDecoration: "none" }}>
            <Button
              variant="outlined"
              fullWidth
              sx={{
                borderColor: COLORS.blackRock006,
                color: COLORS.blackRock,
              }}
            >
              {t("common.viewDetails")}
            </Button>
          </Link>
        </Box>
      </Box>
    </Box>
  )
} 