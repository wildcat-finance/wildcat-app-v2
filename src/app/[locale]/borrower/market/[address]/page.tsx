"use client"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useGetMarket } from "@/app/[locale]/borrower/market/hooks/useGetMarket"
import { MarketHeader } from "@/components/MarketHeader"

export default function MarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const { t } = useTranslation()

  const { data: market, isInitialLoading: isMarketLoading } = useGetMarket({
    address,
  })

  return (
    <Box sx={{ padding: "52px 20px 0 44px" }}>
      <Box sx={{ width: "806px" }}>
        <MarketHeader market={market} isLoading={isMarketLoading} />
      </Box>
    </Box>
  )
}
