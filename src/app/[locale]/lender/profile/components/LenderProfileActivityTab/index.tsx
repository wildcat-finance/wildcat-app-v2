import { Box, Typography } from "@mui/material"

import { BatchesAndTransactionsSection } from "@/app/[locale]/lender/profile/components/LenderProfileActivityTab/BatchesAndTransactionsSection"
import { ExportBanner } from "@/app/[locale]/lender/profile/components/LenderProfileActivityTab/ExportBanner"
import {
  LenderProfilePageContainer,
  LenderProfilePageSection,
  LenderProfilePageTitleContainer,
} from "@/app/[locale]/lender/profile/components/style"
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
    <Box sx={LenderProfilePageContainer}>
      <Box sx={LenderProfilePageSection}>
        <Box sx={LenderProfilePageTitleContainer}>
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

        <ExportBanner
          lenderAddress={lenderAddress}
          positions={lenderData?.positions ?? []}
        />

        {/* place for the graph */}
      </Box>

      <Box sx={LenderProfilePageSection}>
        <BatchesAndTransactionsSection
          lenderAddress={lenderAddress}
          lenderData={lenderData}
        />
      </Box>
    </Box>
  )
}
