import { Box, Typography } from "@mui/material"

import { BatchesAndTransactionsSection } from "@/app/[locale]/lender/profile/components/LenderProfileActivityTab/BatchesAndTransactionsSection"
import { ExportBanner } from "@/app/[locale]/lender/profile/components/LenderProfileActivityTab/ExportBanner"
import {
  LenderProfileOverviewContainer,
  LenderProfileOverviewSection,
  ProfileOverviewTitleContainer,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/style"
import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useMobileResolution } from "@/hooks/useMobileResolution"

type LenderProfileActivityTabProps = {
  lenderAddress: `0x${string}` | undefined
  lenderData?: LenderPositionsData
}

export const LenderProfileActivityTab = ({
  lenderData,
  lenderAddress,
}: LenderProfileActivityTabProps) => {
  const isMobile = useMobileResolution()

  return (
    <Box sx={LenderProfileOverviewContainer}>
      <Box sx={LenderProfileOverviewSection}>
        <Box sx={ProfileOverviewTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Activity & History
          </Typography>

          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            Principal vs cumulative interest, USD
          </Typography>
        </Box>

        <ExportBanner />

        {/* place for the graph */}
      </Box>

      <Box sx={LenderProfileOverviewSection}>
        <BatchesAndTransactionsSection
          lenderAddress={lenderAddress}
          lenderData={lenderData}
        />
      </Box>
    </Box>
  )
}
