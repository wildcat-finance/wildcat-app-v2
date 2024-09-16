"use client"

import React from "react"

import { Box, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { BorrowerMarketsTable } from "@/app/[locale]/borrower/components/MarketsTables/BorrowerMarketsTable"
import { OthersMarketsTable } from "@/app/[locale]/borrower/components/MarketsTables/OthersMarketsTable"
import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetOthersMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetOthersMarkets"
import { useGetBorrowers } from "@/app/[locale]/borrower/hooks/useGetBorrowers"
import { MarketsTablesContainer } from "@/app/[locale]/borrower/page-style"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { useAppSelector } from "@/store/hooks"
import { SidebarMarketAssets } from "@/store/slices/borrowerSidebarSlice/interface"
import { getMarketStatus, MarketStatus } from "@/utils/marketStatus"

const filterMarketsByAssetAndStatus = (
  markets: Market[] | undefined,
  name: string,
  status: MarketStatus | "All",
  asset: SidebarMarketAssets,
) => {
  let filteredMarkets = markets

  if (filteredMarkets && name !== "") {
    filteredMarkets = filteredMarkets.filter((market) =>
      market.name.toLowerCase().includes(name.toLowerCase()),
    )
  }

  if (filteredMarkets && status !== "All") {
    filteredMarkets = filteredMarkets.filter(
      (market) =>
        getMarketStatus(
          market.isClosed,
          market.isDelinquent,
          market.isIncurringPenalties,
        ) === status,
    )
  }

  if (filteredMarkets && asset !== "All") {
    filteredMarkets = filteredMarkets.filter(
      (market) => market.underlyingToken.symbol === asset,
    )
  }

  return filteredMarkets
}

export const MarketsTables = () => {
  const { t } = useTranslation()

  const { address, isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const { data: borrowerMarkets, isLoading: isBorrowerMarketsLoading } =
    useGetBorrowerMarkets()
  const { data: othersMarkets, isLoading: isOthersMarketsLoading } =
    useGetOthersMarkets()

  const { data: borrowers } = useGetBorrowers()
  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  const filterByMarketName = useAppSelector(
    (state) => state.borrowerSidebar.marketName,
  )
  const filterByStatus = useAppSelector((state) => state.borrowerSidebar.status)
  const filterByAsset = useAppSelector(
    (state) => state.borrowerSidebar.underlyingAsset,
  )

  const filteredBorrowerMarkets = filterMarketsByAssetAndStatus(
    borrowerMarkets,
    filterByMarketName,
    filterByStatus,
    filterByAsset,
  )

  const filteredOtherMarkets = filterMarketsByAssetAndStatus(
    othersMarkets,
    filterByMarketName,
    filterByStatus,
    filterByAsset,
  )

  const activeBorrowerMarkets = filteredBorrowerMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      !market.isClosed,
  )

  const terminatedBorrowerMarkets = borrowerMarkets
    ?.filter(
      (market) =>
        market.borrower.toLowerCase() === address?.toLowerCase() &&
        market.isClosed,
    )
    .filter((market) =>
      market.name.toLowerCase().includes(filterByMarketName.toLowerCase()),
    )

  const showBorrowerTables =
    !isWrongNetwork && isConnected && isRegisteredBorrower

  return (
    <Box sx={MarketsTablesContainer}>
      {showBorrowerTables && (
        <Box>
          <Box>
            <BorrowerMarketsTable
              type="active"
              label={t("borrowerMarketList.table.title.active")}
              noMarketsTitle={t(
                "borrowerMarketList.table.noMarkets.active.title",
              )}
              noMarketsSubtitle={t(
                "borrowerMarketList.table.noMarkets.active.subtitle",
              )}
              tableData={activeBorrowerMarkets || []}
              isLoading={isBorrowerMarketsLoading}
              assetFilter={filterByAsset}
              statusFilter={filterByStatus}
              nameFilter={filterByMarketName}
              isOpen
            />
          </Box>

          <Box marginTop="16px">
            <BorrowerMarketsTable
              type="terminated"
              label={t("borrowerMarketList.table.title.terminated")}
              noMarketsTitle={t(
                "borrowerMarketList.table.noMarkets.terminated.title",
              )}
              noMarketsSubtitle={t(
                "borrowerMarketList.table.noMarkets.terminated.subtitle",
              )}
              tableData={terminatedBorrowerMarkets || []}
              isLoading={isBorrowerMarketsLoading}
              nameFilter={filterByMarketName}
            />
          </Box>
        </Box>
      )}

      <Box marginTop="16px">
        {!isWrongNetwork ? (
          <OthersMarketsTable
            tableData={filteredOtherMarkets || []}
            borrowersData={borrowers || []}
            isLoading={isOthersMarketsLoading}
            assetFilter={filterByAsset}
            statusFilter={filterByStatus}
            nameFilter={filterByMarketName}
            isOpen
          />
        ) : (
          <Typography variant="text3" marginLeft="16px">
            {t("borrowerMarketList.table.noMarkets.wrongNetwork")}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
