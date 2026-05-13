import { Box, Button, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const TrendingMarketCard = () => {
  const category = "Trending"
  const categoryColor = "#4971FF"
  const marketStatValue = "+4.2M"
  const marketStatDesc = "fresh capital this week"
  const borrowerName = "Auros Global"
  const asset = "ETH"
  const APY = "15%"

  return (
    <Box
      sx={{
        width: "304px",
        minWidth: "304px",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        borderRadius: "12px",
        border: `1px solid ${COLORS.iron}`,
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box sx={{ width: "28px", height: "28px" }} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "0 6px",
            borderRadius: "12px",
            backgroundColor: categoryColor,
          }}
        >
          <Typography variant="text3" color={COLORS.white}>
            {category}
          </Typography>
        </Box>
      </Box>

      <Typography variant="title2" fontWeight={600}>
        {marketStatValue}
      </Typography>

      <Typography variant="text3" sx={{ opacity: 0.7 }}>
        {marketStatDesc}
      </Typography>

      <Button
        variant="contained"
        color="secondary"
        size="medium"
        fullWidth
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderRadius: "10px",
          marginTop: "16px",
          marginBottom: "4px",
        }}
      >
        <Typography variant="text3" fontWeight={600}>
          {borrowerName}
        </Typography>
        <Typography variant="text3">{asset}</Typography>
      </Button>

      <Button
        variant="contained"
        size="large"
        fullWidth
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderRadius: "8px",
        }}
      >
        <Typography variant="text3" color={COLORS.white}>
          Earn {APY} APY
        </Typography>
        <Typography variant="text3" color={COLORS.white}>
          Deposit
        </Typography>
      </Button>
    </Box>
  )
}
