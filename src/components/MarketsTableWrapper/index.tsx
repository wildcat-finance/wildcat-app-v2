import { ReactNode } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

export type MarketsTableWrapperProps = {
  children: ReactNode
  rowsLength?: number

  isLoading: boolean
  marketsLength: number

  noMarketsTitle?: string
  noMarketsSubtitle?: string
  highlightNoMarketsBanner?: boolean

  showNoFilteredMarkets?: boolean
  statusFilter?: MarketStatus[]
  assetFilter?: SmallFilterSelectItem[]
  withdrawalFilter?: SmallFilterSelectItem[]
  nameFilter?: string
}

export const MarketsTableWrapper = ({
  children,
  rowsLength = 3,
  isLoading,
  marketsLength,
  noMarketsTitle,
  noMarketsSubtitle,
  highlightNoMarketsBanner,
  showNoFilteredMarkets,
  statusFilter,
  assetFilter,
  withdrawalFilter,
  nameFilter,
}: MarketsTableWrapperProps) => {
  const { t } = useTranslation()

  const defaultFiltersSettings =
    (assetFilter === undefined || assetFilter.length === 0) &&
    (statusFilter === undefined || statusFilter.length === 0) &&
    (withdrawalFilter === undefined || withdrawalFilter.length === 0) &&
    (nameFilter === undefined || nameFilter === "")

  return (
    <>
      {isLoading && (
        <Box display="flex" flexDirection="column" rowGap="6px">
          <Skeleton
            height="36px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          {Array.from(
            { length: rowsLength },
            (_, i) => `skeleton-row-${i}`,
          ).map((key) => (
            <Skeleton
              key={key}
              height="58px"
              width="100%"
              sx={{ bgcolor: COLORS.athensGrey }}
            />
          ))}
        </Box>
      )}

      {marketsLength === 0 && !isLoading && defaultFiltersSettings && (
        <Box
          sx={{
            width: "100%",
            padding: "24px 16px 24px",
            borderRadius: "12px",
            backgroundColor: highlightNoMarketsBanner
              ? COLORS.hintOfRed
              : "transparent",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography variant="title3" color={COLORS.blackRock}>
            {noMarketsTitle}
          </Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {noMarketsSubtitle}
          </Typography>
        </Box>
      )}

      {!isLoading && marketsLength !== 0 && children}
    </>
  )
}
