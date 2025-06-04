import { useState } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"
import cn from "classnames"

import "./styles.css"
import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { LegendItemProps } from "@/components/BarChart/LegendItem/interface"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export const LegendItem = ({
  chartItem,
  type = "default",
  children,
}: LegendItemProps) => {
  const [expanded, setExpanded] = useState(true)

  const toggleExpanded = (value: boolean) => {
    setExpanded(!value)
  }

  switch (type) {
    case "extended":
      return <Box className="barchart__legend-item-extended">{children}</Box>

    case "expandable":
      return (
        <Box
          className="barchart__legend-item"
          sx={{ borderColor: COLORS.athensGrey }}
        >
          <Box
            className="barchart__legend-header"
            sx={{
              justifyContent: "space-between",
              marginBottom: `${expanded ? "8px" : "24px"}`,
            }}
            onClick={() => toggleExpanded(expanded)}
          >
            <Box className="barchart__legend-title-expandable">
              <Typography variant="text3">{chartItem.label}</Typography>
              <Box
                className={cn(
                  "barchart__legend-dot",
                  chartItem.legendDotClassName,
                )}
                sx={{
                  backgroundColor: `${chartItem.color}`,
                }}
              />
            </Box>
            {expanded ? (
              <SvgIcon
                fontSize="small"
                sx={{
                  transform: "rotate(180deg)",
                }}
              >
                <UpArrow />
              </SvgIcon>
            ) : (
              <SvgIcon fontSize="small">
                <UpArrow />
              </SvgIcon>
            )}
          </Box>
          {expanded && children}
          <Typography variant="text3">
            {formatTokenWithCommas(chartItem.value)} {chartItem.asset}
          </Typography>
        </Box>
      )

    case "noBorderWithDivider":
      return (
        <Box
          sx={{
            width: "100%",
          }}
        >
          <Box
            className="barchart__legend-header"
            sx={{
              borderBottom: `1px solid ${COLORS.athensGrey}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0px",
              padding: "10px 0",
              cursor: "pointer",
              width: "100%",
            }}
            onClick={() => toggleExpanded(expanded)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Typography variant="text3">{chartItem.label}</Typography>
              <Box
                className={cn(
                  "barchart__legend-dot",
                  chartItem.legendDotClassName,
                )}
                sx={{
                  backgroundColor: chartItem.color,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Typography variant="text3">
                {formatTokenWithCommas(chartItem.value)} {chartItem.asset}
              </Typography>
            </Box>
          </Box>
        </Box>
      )

    default:
      return (
        <Box
          className="barchart__legend-item"
          sx={{ borderColor: COLORS.athensGrey }}
        >
          <Box className="barchart__legend-header">
            <Typography variant="text3">{chartItem.label}</Typography>
            <Box
              className={cn(
                "barchart__legend-dot",
                chartItem.legendDotClassName,
              )}
              sx={{
                backgroundColor: `${chartItem.color}`,
              }}
            />
          </Box>
          <Typography variant="text3">
            {formatTokenWithCommas(chartItem.value)} {chartItem.asset}
          </Typography>
        </Box>
      )
  }
}
