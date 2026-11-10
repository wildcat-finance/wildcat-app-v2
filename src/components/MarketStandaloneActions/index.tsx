import * as React from "react"

import { Box, Button } from "@mui/material"

import { MarketExportModal } from "@/components/ExportModal/MarketExportModal"
import { MarketTelegramButton } from "@/components/MarketTelegramButton"
import { isMarketExportSupported } from "@/utils/marketExport"

import { MarketStandaloneActionsProps } from "./interface"
import { ActionButtonSx, StandaloneActionsContainer } from "./style"

// The actions row's Export and Telegram as standalone buttons, for viewers who
// don't get that row (no wallet, no access, wrong network).
export const MarketStandaloneActions = ({
  market,
}: MarketStandaloneActionsProps) => {
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const supportsExport = isMarketExportSupported(market)

  return (
    <Box sx={StandaloneActionsContainer}>
      {supportsExport && (
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          sx={ActionButtonSx}
          onClick={() => setIsExportOpen(true)}
        >
          Export Market Info
        </Button>
      )}

      <MarketTelegramButton />

      {supportsExport && (
        <MarketExportModal
          market={market}
          open={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </Box>
  )
}
