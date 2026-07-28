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
      alignItems: "stretch",
      overflow: "hidden",
      border: `1px solid ${COLORS.whiteLilac}`,
      borderRadius: { xs: "18px", md: "12px" },
      backgroundColor: COLORS.white,
    }}
  >
    <Box
      sx={{
        display: "flex",
        "& .MuiChip-root": {
          height: "100%",
          padding: { xs: "4px 12px", md: "2px 9px" },
          borderRadius: 0,
        },
        "& .MuiChip-label": {
          top: 0,
          fontSize: { xs: "14px", md: "11px" },
          lineHeight: { xs: "20px", md: "16px" },
        },
        "& .MuiChip-icon": { display: "none" },
      }}
    >
      <MarketStatusChip status={status} withPeriod={false} />
    </Box>

    <Typography
      sx={{
        display: "flex",
        alignItems: "center",
        padding: { xs: "4px 12px", md: "2px 9px" },
        borderLeft: `1px solid ${COLORS.whiteLilac}`,
        color: COLORS.blackRock,
        fontSize: { xs: "14px", md: "11px" },
        fontWeight: 500,
        lineHeight: { xs: "20px", md: "16px" },
        whiteSpace: "nowrap",
      }}
    >
      {termLabel}
    </Typography>
  </Box>
)
