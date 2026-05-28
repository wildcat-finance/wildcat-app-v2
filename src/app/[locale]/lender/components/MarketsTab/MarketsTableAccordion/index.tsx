import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

import { MarketsTableAccordionProps } from "./interface"

export const MarketsTableAccordion = ({
  isOpen,
  isLoading,

  label,
  marketsLength,
  type,
  noMarketsTitle,
  noMarketsSubtitle,

  showNoFilteredMarkets,
  assetFilter,
  statusFilter,
  nameFilter,

  children,
}: MarketsTableAccordionProps) => {
  const { t } = useTranslation()

  const defaultFilters =
    assetFilter?.length === 0 && statusFilter?.length === 0 && nameFilter === ""

  const statusTokens = (statusFilter ?? [])
    .map((status) => ` ${status.toLowerCase()}`)
    .join("")
  const assetTokens = (assetFilter ?? [])
    .map((asset) => ` ${asset.name}`)
    .join("")
  const filterSummary = `${type ?? ""}${statusTokens} ${
    nameFilter ?? ""
  } ${assetTokens}`
    .replace(/\s+/g, " ")
    .trim()

  return (
    <Accordion defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">{label}</Typography>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            {isLoading ? t("common.states.loading") : marketsLength}
          </Typography>
        </Box>
      </AccordionSummary>

      {isLoading && (
        <Box
          display="flex"
          flexDirection="column"
          padding="32px 16px"
          rowGap="8px"
        >
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
        </Box>
      )}

      {marketsLength === 0 &&
        !isLoading &&
        defaultFilters &&
        noMarketsTitle && (
          <Box display="flex" flexDirection="column" padding="24px 16px 12px">
            <Typography variant="title3" color={COLORS.blackRock}>
              {noMarketsTitle}
            </Typography>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {noMarketsSubtitle}
            </Typography>
          </Box>
        )}

      {showNoFilteredMarkets &&
        marketsLength === 0 &&
        !isLoading &&
        !defaultFilters && (
          <Box display="flex" flexDirection="column" padding="24px 16px 12px">
            <Typography variant="text2" color={COLORS.santasGrey}>
              {t("marketList.lender.noFilteredMarkets", {
                filters: filterSummary,
              })}
            </Typography>
          </Box>
        )}

      {children}
    </Accordion>
  )
}
