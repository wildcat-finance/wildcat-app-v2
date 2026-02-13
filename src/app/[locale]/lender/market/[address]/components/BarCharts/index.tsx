import * as React from "react"
import { useEffect } from "react"

import { Box } from "@mui/material"

import { WithdrawalsBarChart } from "@/app/[locale]/lender/market/[address]/components/BarCharts/WithdrawalsBarChart"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { CapacityBarChart } from "./CapacityBarChart"
import { DebtBarChart } from "./DebtBarChart"
import { BarChartProps } from "./interface"

export const BarCharts = ({
  marketAccount,
  withdrawals,
  isLender,
}: BarChartProps & {
  withdrawals: LenderWithdrawalsForMarketResult
  isLender: boolean
}) => {
  const isMobile = useMobileResolution()
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(true)
    } else {
      setIsMobileOpen(false)
    }
  }, [isMobile])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        // eslint-disable-next-line no-nested-ternary
        gap: isMobile ? (!isMobileOpen ? 0 : "16px") : "28px",
        backgroundColor: isMobile ? COLORS.white : "transparent",
        borderRadius: isMobile ? "14px" : 0,
      }}
    >
      <CapacityBarChart
        marketAccount={marketAccount}
        legendType={isLender ? "small" : "big"}
        isLender={isLender}
      />
      {isLender && isMobileOpen && (
        <DebtBarChart marketAccount={marketAccount} />
      )}
      {isLender && isMobileOpen && (
        <WithdrawalsBarChart
          marketAccount={marketAccount}
          withdrawals={withdrawals}
        />
      )}

      {isMobile && (
        <SeeMoreButton
          variant="accordion"
          isOpen={isMobileOpen}
          setIsOpen={setIsMobileOpen}
          sx={{ marginBottom: "24px" }}
        />
      )}
    </Box>
  )
}
