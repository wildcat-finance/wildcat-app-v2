import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"

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
  const defaultFilters =
    assetFilter?.length === 0 && statusFilter?.length === 0 && nameFilter === ""

  return (
    <Accordion defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">{label}</Typography>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            {isLoading ? "is loading..." : marketsLength}
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
              There are no {type}{" "}
              {statusFilter?.length !== 0 &&
                statusFilter?.map((status) => ` ${status.toLowerCase()}`)}{" "}
              {nameFilter === "" ? "" : nameFilter}{" "}
              {assetFilter?.length !== 0 &&
                `${assetFilter?.map((asset) => ` ${asset.name}`)}`}{" "}
              markets
            </Typography>
          </Box>
        )}

      {children}
    </Accordion>
  )
}
