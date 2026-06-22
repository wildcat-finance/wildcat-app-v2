import { Box, Button, SvgIcon, Typography } from "@mui/material"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Paper from "@/assets/icons/paper_icon.svg"
import { COLORS } from "@/theme/colors"

// CSV export banner (design only — buttons are not yet wired to an export).
export const ExportBanner = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      padding: "28px 24px",
      borderRadius: "12px",
      backgroundColor: COLORS.blackHaze,
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: 0,
      }}
    >
      <Typography variant="text1">Export</Typography>

      <Typography variant="text2" color={COLORS.manate}>
        Download transaction history with realized and unrealized interest
        breakdown
      </Typography>
    </Box>

    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <Button variant="contained" size="small" sx={{ gap: "6px" }}>
        <SvgIcon sx={{ fontSize: "16px" }}>
          <Paper />
        </SvgIcon>
        Tax-ready export
      </Button>

      <Button
        variant="outlined"
        color="secondary"
        size="small"
        sx={{ gap: "2px", paddingLeft: "9px" }}
      >
        <SvgIcon
          sx={{
            transform: "rotate(-90deg)",
            fontSize: "14px",
          }}
        >
          <Arrow />
        </SvgIcon>
        CSV
      </Button>
    </Box>
  </Box>
)
