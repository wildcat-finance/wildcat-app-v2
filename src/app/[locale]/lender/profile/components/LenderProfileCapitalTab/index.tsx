import { Box, Typography } from "@mui/material"

import { CapitalGrowthGraph } from "@/app/[locale]/lender/profile/components/LenderProfileCapitalTab/CapitalGrowthGraph"
import { MarketYieldTable } from "@/app/[locale]/lender/profile/components/LenderProfileCapitalTab/MarketYieldTable"
import {
  LenderProfileOverviewContainer,
  LenderProfileOverviewSection,
  ProfileOverviewTitleContainer,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/style"
import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useMobileResolution } from "@/hooks/useMobileResolution"

type LenderProfileCapitalTabProps = {
  lenderAddress: `0x${string}` | undefined
  lenderData?: LenderPositionsData
}

export const LenderProfileCapitalTab = ({
  lenderAddress,
  lenderData,
}: LenderProfileCapitalTabProps) => {
  const isMobile = useMobileResolution()

  return (
    <Box sx={LenderProfileOverviewContainer}>
      <Box sx={LenderProfileOverviewSection}>
        <Box sx={ProfileOverviewTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Capital growth
          </Typography>

          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            Principal vs cumulative interest, USD
          </Typography>
        </Box>

        <CapitalGrowthGraph
          lenderAddress={lenderAddress}
          lenderData={lenderData}
        />
      </Box>

      <Box sx={LenderProfileOverviewSection}>
        <Typography
          variant={isMobile ? "mobH3" : "title3"}
          sx={{ marginBottom: { xs: "4px", md: "20px" } }}
        >
          Yield by market
        </Typography>

        <MarketYieldTable
          lenderAddress={lenderAddress}
          lenderData={lenderData}
        />
      </Box>
    </Box>
  )
}
