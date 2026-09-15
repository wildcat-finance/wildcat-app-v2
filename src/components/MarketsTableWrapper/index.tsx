import { ReactNode } from "react"
import * as React from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { RepeatingSkeletons } from "@/components/RepeatingSkeletons"
import { COLORS } from "@/theme/colors"

export type MarketsTableWrapperProps = {
  children: ReactNode
  rowsLength?: number

  isLoading: boolean
  marketsLength: number

  noMarketsTitle?: string
  noMarketsSubtitle?: string
  highlightNoMarketsBanner?: boolean

  isFilteredEmpty: boolean
  onResetFilters: () => void
}

export const MarketsTableWrapper = ({
  children,
  rowsLength = 3,
  isLoading,
  marketsLength,
  noMarketsTitle,
  noMarketsSubtitle,
  highlightNoMarketsBanner,
  isFilteredEmpty,
  onResetFilters,
}: MarketsTableWrapperProps) => {
  const { t } = useTranslation()

  const isEmpty = marketsLength === 0 && !isLoading

  return (
    <>
      {isLoading && (
        <Box display="flex" flexDirection="column" rowGap="6px">
          <Skeleton
            height="36px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <RepeatingSkeletons
            itemsLength={rowsLength}
            skeletonSX={{
              height: "58px",
              width: "100%",
            }}
          />
        </Box>
      )}

      {isEmpty && !isFilteredEmpty && (
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

      {isEmpty && isFilteredEmpty && (
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
          <Typography variant="text1" color={COLORS.blackRock}>
            {t("marketList.shared.noMarketsMatchCurrentFilters")}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={onResetFilters}
            sx={{ alignSelf: "flex-start", marginTop: "12px" }}
          >
            {t("common.buttons.resetFilters")}
          </Button>
        </Box>
      )}

      {!isLoading && marketsLength !== 0 && children}
    </>
  )
}
