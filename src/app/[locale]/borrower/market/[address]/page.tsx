"use client"

import { Box, Divider } from "@mui/material"

import { MarketStatusChart } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart"
import { useGetMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useGetMarket"

import { MarketHeader } from "./components/MarketHeader"
import { MarketParameters } from "./components/MarketParameters"
import { MarketTransactions } from "./components/MarketTransactions"

export default function MarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const { data: market, isInitialLoading: isMarketLoading } = useGetMarket({
    address,
  })

  return (
    <Box sx={{ padding: "52px 20px 0 44px" }}>
      <Box sx={{ width: "69%" }}>
        <MarketHeader market={market} isLoading={isMarketLoading} />

        <Divider sx={{ margin: "32px 0" }} />

        <MarketTransactions market={market} isLoading={isMarketLoading} />

        <Divider sx={{ margin: "32px 0 44px" }} />

        {market && <MarketStatusChart market={market} />}

        <Divider sx={{ margin: "32px 0 44px" }} />

        <MarketParameters market={market} isLoading={isMarketLoading} />
      </Box>
    </Box>
  )
}
