import { Box, Button, Typography } from "@mui/material"
import { MarketStatusChip } from "@/components/extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"

export const MarketHeader = () => {
  const a = "a"

  return (
    <Box display="flex" flexDirection="column" rowGap="20px">
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" columnGap="8px">
          <Typography variant="title1">Market Name</Typography>
          <Typography variant="text4">WBTC</Typography>
        </Box>
        <Box display="flex" columnGap="12px">
          <MarketStatusChip status="healthy" variant="filled" />
          <MarketCycleChip color="blue" time="3m 45s" />
        </Box>
      </Box>

      <Box display="flex" columnGap="6px">
        <Button variant="outlined" color="secondary" size="small">
          Edit Lenders
        </Button>
        <Button variant="outlined" color="secondary" size="small">
          Adjust Capacity
        </Button>
        <Button variant="outlined" color="secondary" size="small">
          Adjust Base APR
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          sx={{
            minWidth: "28px",
            height: "28px",
            padding: "0",
            borderRadius: "50%",
          }}
        >
          <Typography
            variant="text4"
            sx={{ position: "relative", bottom: "10%" }}
          >
            ...
          </Typography>
        </Button>
      </Box>
    </Box>
  )
}
