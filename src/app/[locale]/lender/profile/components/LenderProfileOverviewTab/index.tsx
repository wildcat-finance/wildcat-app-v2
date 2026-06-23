import { Box, Typography } from "@mui/material"

import { BorrowerExposureTable } from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/BorrowerExposureTable"
import { ProfileHealthTable } from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable"
import {
  LenderProfilePageContainer,
  LenderProfilePageSection,
  LenderProfilePageTitleContainer,
} from "@/app/[locale]/lender/profile/components/style"
import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useMobileResolution } from "@/hooks/useMobileResolution"

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
    <Box sx={LenderProfilePageContainer}>
      <Box sx={LenderProfilePageSection}>
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

      <Box sx={LenderProfilePageSection}>
        <Box sx={LenderProfilePageTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Portfolio health
          </Typography>

          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            {lenderData?.profile.totalPositions ?? 0} positions total・
            {lenderData?.profile.activePositions ?? 0} active
          </Typography>
        </Box>

        <ProfileHealthTable
          lenderAddress={lenderAddress}
          lenderData={lenderData}
        />
      </Box>

      <Box sx={LenderProfilePageSection}>
        <Box sx={LenderProfilePageTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Borrower exposure
          </Typography>

          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            Position size above 50% of portfolio in a single borrower is flagged
            as concentration risk.
          </Typography>
        </Box>

        <BorrowerExposureTable lenderData={lenderData} />
      </Box>
    </Box>
  )
}
