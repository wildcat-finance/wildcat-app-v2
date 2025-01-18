import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetOthersMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetOthersMarkets"
import { useGetBorrowers } from "@/app/[locale]/borrower/hooks/useGetBorrowers"
import { BorrowerActiveMarketsTables } from "@/app/[locale]/new-borrower/components/MarketsSection/сomponents/BorrowerActiveMarketsTables"
import { MarketSectionSwitcher } from "@/app/[locale]/new-borrower/components/MarketsSection/сomponents/MarketSectionSwitcher"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { BorrowerMarketDashboardSections } from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import {
  getMarketStatus,
  MarketAssets,
  MarketStatus,
} from "@/utils/marketStatus"

const getFilteredAndOrderedMarkets = (
  markets: Market[],
  name: string,
  statuses: MarketStatus[],
  assets: { name: string; address: string }[],
) => {
  let filteredMarkets = markets
    .filter(
      (market) => !EXCLUDED_MARKETS.includes(market.address.toLowerCase()),
    )
    .filter((market) => market.deployedEvent)
    .sort(
      (a, b) =>
        (b.deployedEvent?.blockTimestamp || 0) -
        (a.deployedEvent?.blockTimestamp || 0),
    )

  const assetsNames = assets.map((asset) => asset.name)

  if (filteredMarkets && name !== "") {
    filteredMarkets = filteredMarkets.filter((market) =>
      market.name.toLowerCase().includes(name.toLowerCase()),
    )
  }

  if (filteredMarkets && statuses.length > 0) {
    filteredMarkets = filteredMarkets.filter((market) =>
      statuses.includes(
        getMarketStatus(
          market.isClosed,
          market.isDelinquent || market.willBeDelinquent,
          market.isIncurringPenalties,
        ),
      ),
    )
  }

  if (filteredMarkets && assets.length > 0) {
    filteredMarkets = filteredMarkets.filter((market) =>
      assetsNames.includes(market.underlyingToken.symbol as MarketAssets),
    )
  }

  return filteredMarkets
}

export const MarketsSection = () => {
  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )

  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const { data: borrowers } = useGetBorrowers()
  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  const { data: unfilteredBorrowerMarkets, isLoading } =
    useGetBorrowerMarkets(undefined)
  const { data: unfilteredOtherMarkets, isLoading: isOthersMarketsLoading } =
    useGetOthersMarkets()

  const activeFilteredBorrowerMarkets = (
    unfilteredBorrowerMarkets ?? []
  ).filter((market) => !market.isClosed)

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          padding: "0 24px",
        }}
      >
        <Typography variant="title2" sx={{ marginBottom: "6px" }}>
          Markets
        </Typography>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={{ marginBottom: "24px" }}
        >
          All markets you’ve created or create a new one.{" "}
          <Link
            href="https://docs.wildcat.finance/"
            style={{ color: COLORS.santasGrey }}
            target="_blank"
          >
            Learn more
          </Link>
        </Typography>

        <MarketSectionSwitcher />
      </Box>

      {marketSection === BorrowerMarketDashboardSections.ACTIVE && (
        <BorrowerActiveMarketsTables
          markets={activeFilteredBorrowerMarkets}
          isLoading={isLoading}
        />
      )}
    </Box>
  )
}
