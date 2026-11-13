"use client"

import React, { useEffect, useState } from "react"

import { Box, Button, Skeleton } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { ExploreMarketsTable } from "@/app/[locale]/lender/components/ExploreSection/ExploreMarketsTable"
import { TrendingMarketsCarousel } from "@/app/[locale]/lender/components/ExploreSection/TrendingMarketsCarousel"
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useIsSelectedNetworkRehydrated } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import {
  LenderSection,
  resetOtherSectionTabs,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

export const ExploreSection = () => {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const isSelectedNetworkRehydrated = useIsSelectedNetworkRehydrated()
  const { isWrongNetwork } = useCurrentNetwork()
  const isMobile = useMobileResolution()
  const dispatch = useAppDispatch()
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    dispatch(resetOtherSectionTabs(LenderSection.EXPLORE))
  }, [dispatch])

  if (!mounted || !isSelectedNetworkRehydrated)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Skeleton
          sx={{
            width: "100%",
            height: { xs: "1151px", md: "524px" },
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
        <Skeleton
          sx={{
            display: { xs: "none", md: "block" },
            width: "100%",
            height: "182px",
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
        <Skeleton
          sx={{
            display: { xs: "none", md: "block" },
            width: "100%",
            height: "182px",
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
      </Box>
    )

  return (
    <Box
      sx={{
        height: { xs: "auto", md: `calc(100vh - 82px)` },
        width: "100%",
        overflow: "auto",
      }}
    >
      {isWrongNetwork && <WrongNetworkAlert />}

      {!isWrongNetwork && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 0, md: "32px" },
          }}
        >
          {isMobile ? (
            <ExploreMarketsTable
              mobileHeaderTop={<TrendingMarketsCarousel />}
            />
          ) : (
            <>
              <TrendingMarketsCarousel />
              <ExploreMarketsTable />
            </>
          )}
        </Box>
      )}

      {!isWrongNetwork && isMobile && (
        <Box sx={{ display: "flex", padding: "4px 0 8px" }}>
          <Button
            component={Link}
            href={ROUTES.lender.allMarkets}
            variant="contained"
            color="secondary"
            size="large"
            fullWidth
            sx={{
              bgcolor: COLORS.white03,
              color: COLORS.white,
              "&:hover": { bgcolor: COLORS.white06 },
            }}
          >
            {t("dashboard.markets.mobileList.seeAllMarkets")}
          </Button>
        </Box>
      )}
    </Box>
  )
}
