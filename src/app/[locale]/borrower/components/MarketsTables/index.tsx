"use client"

import React, { useEffect, useRef } from "react"

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
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setActiveAmount,
  setOtherAmount,
  setScrollTarget,
  setTerminatedAmount,
} from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import {
  getMarketStatus,
  MarketAssets,
  MarketStatus,
} from "@/utils/marketStatus"

const filterMarketsByAssetAndStatus = (
  markets: Market[] | undefined,
  name: string,
  statuses: MarketStatus[],
  assets: { name: string; address: string }[],
) => {
  let filteredMarkets = markets

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

export const MarketsTables = ({ showBanner }: { showBanner: boolean }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { address, isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const { data: borrowerMarkets, isLoading: isBorrowerMarketsLoading } =
    useGetBorrowerMarkets()
  const { data: allMarkets, isLoading: isOthersMarketsLoading } =
    useGetOthersMarkets()

  const { data: borrowers } = useGetBorrowers()
  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  const filterByMarketName = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketName,
  )
  const filterByStatus = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketsStatuses,
  )
  const filterByAsset = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketsAssets,
  )

  const filteredBorrowerMarkets = filterMarketsByAssetAndStatus(
    borrowerMarkets,
    filterByMarketName,
    filterByStatus,
    filterByAsset,
  )

  const filteredAllMarkets = filterMarketsByAssetAndStatus(
    allMarkets,
    filterByMarketName,
    filterByStatus,
    filterByAsset,
  )

  const filteredOtherMarkets = (filteredAllMarkets ?? []).filter(
    (market) => market.borrower.toLowerCase() !== address?.toLowerCase(),
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

  const scrollTargetId = useAppSelector(
    (state) => state.marketsOverviewSidebar.scrollTarget,
  )

  const activeMarketsRef = useRef<HTMLDivElement>(null)
  const terminatedMarketsRef = useRef<HTMLDivElement>(null)
  const otherMarketsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollTargetId === "active-markets" && activeMarketsRef.current) {
      activeMarketsRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
    if (
      scrollTargetId === "terminated-markets" &&
      terminatedMarketsRef.current
    ) {
      terminatedMarketsRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
    if (scrollTargetId === "other-markets" && otherMarketsRef.current) {
      otherMarketsRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
  }, [scrollTargetId])

  useEffect(() => {
    dispatch(setActiveAmount((activeBorrowerMarkets ?? []).length.toString()))
    dispatch(
      setTerminatedAmount((terminatedBorrowerMarkets ?? []).length.toString()),
    )
    dispatch(setOtherAmount((filteredOtherMarkets ?? []).length.toString()))
  }, [activeBorrowerMarkets, terminatedBorrowerMarkets, filteredOtherMarkets])

  return (
    <Box
      sx={MarketsTablesContainer}
      height={`calc(100vh - 43px - 52px - 52px - 110px ${
        showBanner ? `- 208px - 32px` : ""
      })`}
    >
      {showBorrowerTables && (
        <Box>
          <Box ref={activeMarketsRef}>
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

          <Box marginTop="16px" ref={terminatedMarketsRef}>
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

      <Box marginTop="16px" ref={otherMarketsRef}>
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
