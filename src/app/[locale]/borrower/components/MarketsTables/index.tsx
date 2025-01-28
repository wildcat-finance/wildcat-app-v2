/* eslint-disable camelcase */

"use client"

import React, { useEffect, useMemo, useRef } from "react"

import { Box, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { BorrowerMarketsTable } from "@/app/[locale]/borrower/components/MarketsTables/BorrowerMarketsTable"
import { OthersMarketsTable } from "@/app/[locale]/borrower/components/MarketsTables/OthersMarketsTable"
import { useGetOthersMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetOthersMarkets"
import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
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

export const MarketsTables = ({
  showBanner,
  unfilteredBorrowerMarkets,
  isBorrowerMarketsLoading,
}: {
  showBanner: boolean
  unfilteredBorrowerMarkets: Market[] | undefined
  isBorrowerMarketsLoading: boolean
}) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const { data: borrowers } = useBorrowerNames()
  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  const filterByMarketName = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketName,
  )
  const filterByStatus = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketsStatuses,
    (a, b) => a.join(",") === b.join(","),
  )
  const filterByAsset = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketsAssets,
    (a, b) =>
      a.map((x) => `${x.name}:${x.address}`).join(",") ===
      b.map((x) => `${x.name}:${x.address}`).join(","),
  )

  const { data: unfilteredOtherMarkets, isLoading: isOthersMarketsLoading } =
    useGetOthersMarkets()

  const filteredBorrowerMarkets = useMemo(
    () =>
      getFilteredAndOrderedMarkets(
        unfilteredBorrowerMarkets ?? [],
        filterByMarketName,
        filterByStatus,
        filterByAsset,
      ),
    [
      unfilteredBorrowerMarkets,
      filterByMarketName,
      filterByStatus,
      filterByAsset,
    ],
  )

  const filteredOtherMarkets = useMemo(
    () =>
      getFilteredAndOrderedMarkets(
        unfilteredOtherMarkets ?? [],
        filterByMarketName,
        filterByStatus,
        filterByAsset,
      ),
    [unfilteredOtherMarkets, filterByMarketName, filterByStatus, filterByAsset],
  )

  const [activeBorrowerMarkets, terminatedBorrowerMarkets] = useMemo(
    () => [
      filteredBorrowerMarkets?.filter((m) => !m.isClosed),
      filteredBorrowerMarkets?.filter((m) => m.isClosed),
    ],
    [filteredBorrowerMarkets],
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
  }, [scrollTargetId, dispatch])

  useEffect(() => {
    dispatch(
      setActiveAmount(
        isBorrowerMarketsLoading
          ? ""
          : (activeBorrowerMarkets ?? []).length.toString(),
      ),
    )
    dispatch(
      setTerminatedAmount(
        isBorrowerMarketsLoading
          ? ""
          : (terminatedBorrowerMarkets ?? []).length.toString(),
      ),
    )
    dispatch(
      setOtherAmount(
        isOthersMarketsLoading
          ? ""
          : (filteredOtherMarkets ?? []).length.toString(),
      ),
    )
  }, [
    activeBorrowerMarkets,
    terminatedBorrowerMarkets,
    filteredOtherMarkets,
    dispatch,
    isBorrowerMarketsLoading,
    isOthersMarketsLoading,
  ])

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
