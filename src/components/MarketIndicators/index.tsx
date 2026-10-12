import { Box } from "@mui/material"
import type { Market } from "@wildcatfi/wildcat-sdk"

import { PeriodicWithdrawalCycle } from "@/components/PeriodicWithdrawalCycle"
import { RevolvingAprCurve } from "@/components/RevolvingAprCurve"
import { COLORS } from "@/theme/colors"
import { isRevolvingAprMarket } from "@/utils/marketApr"

export const hasMarketIndicators = (market: Market) =>
  Boolean(market.periodicHooksConfig) || isRevolvingAprMarket(market)

export const MarketIndicators = ({ market }: { market: Market }) => {
  const periodic = Boolean(market.periodicHooksConfig)
  const revolving = isRevolvingAprMarket(market)
  if (!periodic && !revolving) return null

  return (
    <Box
      component="aside"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minWidth: 0,
        gap: "24px",
      }}
    >
      {periodic && (
        <Box sx={{ width: "100%", maxWidth: revolving ? "280px" : "340px" }}>
          <PeriodicWithdrawalCycle market={market} />
        </Box>
      )}
      {revolving && (
        <Box
          sx={{
            width: "100%",
            maxWidth: "320px",
            ...(periodic && {
              borderTop: `1px solid ${COLORS.whiteLilac}`,
              paddingTop: "24px",
            }),
          }}
        >
          <RevolvingAprCurve market={market} />
        </Box>
      )}
    </Box>
  )
}
