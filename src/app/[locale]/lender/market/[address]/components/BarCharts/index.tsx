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
  const [isSectionOpen, setIsSectionOpen] = React.useState(false)

  // Keeps section visible on desktop devices
  useEffect(() => {
    if (!isMobile) {
      setIsSectionOpen(true)
    } else {
      setIsSectionOpen(false)
    }
  }, [isMobile])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        // eslint-disable-next-line no-nested-ternary
        gap: isMobile ? (!isSectionOpen ? 0 : "16px") : "28px",
        backgroundColor: isMobile ? COLORS.white : "transparent",
        borderRadius: isMobile ? "14px" : 0,
      }}
    >
      <CapacityBarChart
        marketAccount={marketAccount}
        legendType={isLender ? "small" : "big"}
        isLender={isLender}
      />
      {isLender && isSectionOpen && (
        <DebtBarChart marketAccount={marketAccount} />
      )}
      {isLender && isSectionOpen && (
        <WithdrawalsBarChart
          marketAccount={marketAccount}
          withdrawals={withdrawals}
        />
      )}

      {isLender && isMobile && (
        <SeeMoreButton
          variant="accordion"
          isOpen={isSectionOpen}
          setIsOpen={setIsSectionOpen}
          sx={{ marginBottom: "24px" }}
        />
      )}
    </Box>
  )
}
