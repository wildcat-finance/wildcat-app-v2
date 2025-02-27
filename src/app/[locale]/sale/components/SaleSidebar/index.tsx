import { Box, Chip, Divider, SvgIcon, Typography } from "@mui/material"

import { SaleTokenModal } from "@/app/[locale]/sale/components/SaleTokenModal"
import Clock from "@/assets/icons/clock_icon.svg"
import { COLORS } from "@/theme/colors"

export const SaleSidebar = () => {
  const a = ""

  return (
    <Box
      sx={{
        height: "100%",
        maxWidth: "378px",
        display: "flex",
        flexDirection: "column",
        padding: "32px 31px 0 28px",
        borderRight: `1px solid ${COLORS.athensGrey}`,
      }}
    >
      <Box>
        <Typography variant="text3" color={COLORS.santasGrey}>
          Token
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
          <Box
            sx={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: COLORS.athensGrey,
              marginRight: "10px",
            }}
          />

          <Typography
            variant="title2"
            sx={{ textTransform: "uppercase", marginRight: "12px" }}
          >
            WLDC
          </Typography>

          <Box
            sx={{
              padding: "2px 8px",
              backgroundColor: COLORS.glitter,
              borderRadius: "26px",

              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography variant="text4" color={COLORS.blueRibbon}>
              $WLDC
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          marginTop: "20px",

          display: "flex",
          padding: "16px",
          borderRadius: "12px",
          backgroundColor: COLORS.hintOfRed,
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            Funds Raised
          </Typography>
          <Typography variant="text1">$12.000</Typography>
        </Box>

        <Divider
          orientation="vertical"
          variant="middle"
          flexItem
          sx={{ height: "100%", margin: "0 16px" }}
        />

        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            Sold
          </Typography>
          <Typography variant="text1">0.32%</Typography>
        </Box>
      </Box>

      <Divider sx={{ width: "100%", margin: "24px 0 12px" }} />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          marginBottom: "10px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <SvgIcon
            sx={{
              marginRight: "6px",
              "& path": { fill: `${COLORS.santasGrey}` },
            }}
          >
            <Clock />
          </SvgIcon>
          <Typography variant="text3" color={COLORS.santasGrey}>
            Sales ends in
          </Typography>
        </Box>

        <Typography variant="text1">12d 5h 23m</Typography>
      </Box>

      <SaleTokenModal />
    </Box>
  )
}
