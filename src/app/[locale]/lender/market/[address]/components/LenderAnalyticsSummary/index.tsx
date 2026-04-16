"use client"

import { Box, Divider, Skeleton, Tooltip, Typography } from "@mui/material"

import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { MobileSummaryRow, SummaryCard, SummaryGrid } from "./style"

type SummaryItem = {
  label: string
  value: string
  tooltip?: string
  fullPrecisionValue?: string
}

export const LenderAnalyticsSummary = ({
  items,
  isLoading,
}: {
  items: SummaryItem[]
  isLoading?: boolean
}) => {
  const isMobile = useMobileResolution()

  if (isMobile) {
    return (
      <Box sx={SummaryGrid(true)}>
        {items.map((item, index) => (
          <Box key={item.label}>
            <Box sx={MobileSummaryRow}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Typography
                  variant="mobText3"
                  sx={{ color: COLORS.santasGrey }}
                >
                  {item.label}
                </Typography>
                {item.tooltip && <TooltipButton value={item.tooltip} />}
              </Box>
              {isLoading ? (
                <Skeleton
                  width="80px"
                  height="20px"
                  sx={{ bgcolor: COLORS.athensGrey }}
                />
              ) : (
                <Tooltip
                  title={item.fullPrecisionValue ?? ""}
                  placement="left"
                  disableHoverListener={!item.fullPrecisionValue}
                  arrow
                >
                  <Typography
                    variant="mobText3"
                    sx={{ color: COLORS.blackRock }}
                  >
                    {item.value}
                  </Typography>
                </Tooltip>
              )}
            </Box>
            {index < items.length - 1 && (
              <Divider sx={{ borderColor: COLORS.athensGrey }} />
            )}
          </Box>
        ))}
      </Box>
    )
  }

  return (
    <Box sx={SummaryGrid(false)}>
      {items.map((item) => (
        <Box key={item.label} sx={SummaryCard}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
              {item.label}
            </Typography>
            {item.tooltip && (
              <Tooltip title={item.tooltip} placement="top" arrow>
                <Typography
                  variant="text4"
                  sx={{
                    color: COLORS.santasGrey,
                    cursor: "help",
                    lineHeight: 1,
                  }}
                >
                  &#9432;
                </Typography>
              </Tooltip>
            )}
          </Box>
          {isLoading ? (
            <Skeleton
              width="60%"
              height="28px"
              sx={{ marginTop: "4px", bgcolor: COLORS.athensGrey }}
            />
          ) : (
            <Tooltip
              title={item.fullPrecisionValue ?? ""}
              placement="bottom"
              disableHoverListener={!item.fullPrecisionValue}
              arrow
            >
              <Typography
                variant="title3"
                sx={{
                  marginTop: "4px",
                  color: COLORS.blackRock,
                  wordBreak: "break-word",
                }}
              >
                {item.value}
              </Typography>
            </Tooltip>
          )}
        </Box>
      ))}
    </Box>
  )
}
