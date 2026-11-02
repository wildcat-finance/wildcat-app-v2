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

  minContentWidth,

  children,
}: MarketsTableAccordionProps) => {
  const defaultFilters =
    assetFilter?.length === 0 && statusFilter?.length === 0 && nameFilter === ""

  const { t } = useTranslation()

  const accordion = (
    <Accordion
      defaultExpanded={isOpen}
      sx={
        minContentWidth
          ? { minWidth: `${minContentWidth}px !important` }
          : undefined
      }
    >
      <AccordionSummary
        sx={
          minContentWidth
            ? { position: "sticky", left: 0, width: "100cqw" }
            : undefined
        }
      >
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">{label}</Typography>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            {isLoading ? "Are Loading..." : marketsLength}
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
              {t("dashboard.markets.noMarkets.filter.beginning")} {type}{" "}
              {statusFilter?.length !== 0 &&
                statusFilter?.map((status) => ` ${status.toLowerCase()}`)}{" "}
              {nameFilter === "" ? "" : nameFilter}{" "}
              {assetFilter?.length !== 0 &&
                `${assetFilter?.map((asset) => ` ${asset.name}`)}`}{" "}
              {t("dashboard.markets.noMarkets.filter.ending")}
            </Typography>
          </Box>
        )}

      {!isLoading && marketsLength !== 0 && children}
    </Accordion>
  )

  if (!minContentWidth) return accordion

  return <Box sx={{ containerType: "inline-size" }}>{accordion}</Box>
}
