import { Box } from "@mui/material"

import { AirdropChip } from "@/app/[locale]/airdrop/components/AirdropChip"
import { AllocationAlert } from "@/app/[locale]/airdrop/components/AllocationAlert"
import { COLORS } from "@/theme/colors"

export default function AirdropPage() {
  return (
    <Box
      sx={{
        display: "flex",
        gap: "8px",
        width: "100%",
        height: "calc(100vh - 60px)",
        padding: "8px",
      }}
    >
      <Box
        sx={{
          minWidth: "33.2%",
          height: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "12px",
        }}
      >
        <Box />
      </Box>

      <Box
        sx={{
          width: "100%",
          height: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "12px",
          padding: "28px 20px",

          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <Box />
      </Box>
    </Box>
  )
}
