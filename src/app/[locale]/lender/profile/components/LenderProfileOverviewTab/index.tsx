import { Box, Typography } from "@mui/material"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { LenderProfileOverviewSummary } from "./LenderProfileOverviewSummary"

type LenderProfileOverviewTabProps = {
  lenderAddress: `0x${string}` | undefined
  lenderData?: LenderPositionsData
}

export const LenderProfileOverviewTab = ({
  lenderAddress,
  lenderData,
}: LenderProfileOverviewTabProps) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        padding: { xs: "12px 16px", md: "0px" },
        borderRadius: { xs: "14px", md: "none" },
        backgroundColor: { xs: COLORS.white, md: "transparent" },
      }}
    >
      <Typography
        variant={isMobile ? "mobH3" : "title3"}
        sx={{ marginBottom: { xs: "4px", md: "20px" } }}
      >
        Overview
      </Typography>

      <LenderProfileOverviewSummary
        lenderAddress={lenderAddress}
        lenderData={lenderData}
      />
    </Box>
  )
}
