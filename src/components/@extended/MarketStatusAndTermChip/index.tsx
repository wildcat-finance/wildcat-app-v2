import { Box, Typography } from "@mui/material"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { COLORS } from "@/theme/colors"
import { getMarketStatusChip } from "@/utils/marketStatus"

const SIZE_STYLES = {
  default: {
    height: { xs: "24px", md: "20px" },
    statusPadding: { xs: "2px 24px 2px 10px", md: "2px 22px 2px 9px" },
    radius: { xs: "12px", md: "10px" },
    termPadding: { xs: "2px 10px", md: "2px 9px" },
    termOverlap: "-14px",
    termRadius: { xs: "12px", md: "10px" },
    termRing: {
      xs: `0 0 0 2px ${COLORS.white}`,
      md: `0 0 0 1px ${COLORS.white}`,
    },
    termBackground: COLORS.whiteSmoke,
    fontSize: { xs: "14px", md: "11px" },
    lineHeight: { xs: "20px", md: "16px" },
  },
  small: {
    height: "16px",
    statusPadding: "0 14px 0 6px",
    radius: "12px",
    termPadding: "0 6px",
    termOverlap: "-10px",
    termRadius: "20px",
    termRing: `0 0 0 1px ${COLORS.white}`,
    termBackground: COLORS.blackHaze,
    fontSize: "10px",
    lineHeight: "16px",
  },
}

export const MarketStatusAndTermChip = ({
  status,
  termLabel,
  size = "default",
}: {
  status: ReturnType<typeof getMarketStatusChip>
  termLabel: string
  size?: keyof typeof SIZE_STYLES
}) => {
  const styles = SIZE_STYLES[size]

  return (
    <Box
      sx={{
        width: "fit-content",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          display: "flex",
          position: "relative",
          zIndex: 1,
          "& .MuiChip-root": {
            height: styles.height,
            padding: styles.statusPadding,
            borderRadius: styles.radius,
          },
          // Extra .MuiChip-root raises specificity above the theme's own
          // ".MuiChip-root .MuiChip-label" override, which wins otherwise.
          "& .MuiChip-root .MuiChip-label": {
            top: 0,
            fontSize: styles.fontSize,
            fontWeight: 500,
            lineHeight: styles.lineHeight,
          },
          "& .MuiChip-icon": { display: "none" },
        }}
      >
        <MarketStatusChip status={status} withPeriod={false} />
      </Box>

      <Typography
        variant="mobText2"
        sx={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
          minHeight: styles.height,
          padding: styles.termPadding,
          marginLeft: styles.termOverlap,
          borderRadius: styles.termRadius,
          boxShadow: styles.termRing,
          backgroundColor: styles.termBackground,
          color: COLORS.blackRock,
          fontSize: styles.fontSize,
          lineHeight: styles.lineHeight,
          whiteSpace: "nowrap",
        }}
      >
        {termLabel}
      </Typography>
    </Box>
  )
}
