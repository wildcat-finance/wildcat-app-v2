import { Box, Typography } from "@mui/material"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { COLORS } from "@/theme/colors"
import { getMarketStatusChip } from "@/utils/marketStatus"

export const MarketStatusAndTermChip = ({
  status,
  termLabel,
}: {
  status: ReturnType<typeof getMarketStatusChip>
  termLabel: string
}) => (
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
          height: { xs: "24px", md: "16px" },
          padding: { xs: "2px 24px 2px 10px", md: "0 14px 0 6px" },
          borderRadius: { xs: "12px", md: "12px" },
        },
        // Extra .MuiChip-root raises specificity above the theme's own
        // ".MuiChip-root .MuiChip-label" override, which wins otherwise.
        "& .MuiChip-root .MuiChip-label": {
          top: 0,
          fontSize: { xs: "14px", md: "11px" },
          fontWeight: 500,
          lineHeight: { xs: "20px", md: "16px" },
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
        minHeight: { xs: "24px", md: "16px" },
        padding: { xs: "2px 10px", md: "0 6px" },
        marginLeft: { xs: "-14px", md: "-10px" },
        borderRadius: { xs: "12px", md: "20px" },
        boxShadow: {
          xs: `0 0 0 2px ${COLORS.white}`,
          md: `0 0 0 1px ${COLORS.white}`,
        },
        backgroundColor: { xs: COLORS.whiteSmoke, md: COLORS.blackHaze },
        color: COLORS.blackRock,
        fontSize: { xs: "14px", md: "11px" },
        lineHeight: { xs: "20px", md: "16px" },
        whiteSpace: "nowrap",
      }}
    >
      {termLabel}
    </Typography>
  </Box>
)
