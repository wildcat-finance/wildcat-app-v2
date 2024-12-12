/* eslint-disable camelcase */

"use client"

import React, { useEffect, useMemo, useRef } from "react"

import { Box, Typography } from "@mui/material"
import { Market, SubgraphMarket_Filter } from "@wildcatfi/wildcat-sdk"
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
import { EXCLUDED_MARKETS } from "@/utils/constants"
import {
  getMarketStatus,
  MarketAssets,
  MarketStatus,
} from "@/utils/marketStatus"

const combineFilters = (
  filters: SubgraphMarket_Filter[],
  combine: "and" | "or" = "and",
) => {
  if (filters.length === 0) return {}
  if (filters.length === 1) return filters[0]
  return { [combine]: filters }
}

function buildMarketFilter(
  name: string,
  statuses: MarketStatus[],
  assets: { name: string; address: string }[],
): SubgraphMarket_Filter | undefined {
  console.log(`Executing buildMarketsFilter!!!!`)
  const filters: SubgraphMarket_Filter[] = []
  if (name) filters.push({ name_contains_nocase: name.toLowerCase() })
  const assetFilters = assets.map((asset): SubgraphMarket_Filter => {
    if (asset.name) {
      return {
        asset_: { name_contains_nocase: asset.name.toLowerCase() },
      }
    }

    return {
      asset_: { address: asset.address.toLowerCase() },
    }
  })
  if (assetFilters.length) filters.push(combineFilters(assetFilters, "or"))
  if (filters.length) return combineFilters(filters, "and")

  return undefined
}

export const MarketsTables = ({ showBanner }: { showBanner: boolean }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { address, isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const { data: borrowers } = useGetBorrowers()
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

  const filter = useMemo(
    () => ({
      marketFilter: buildMarketFilter(
        filterByMarketName,
        filterByStatus,
        filterByAsset,
      ),
    }),
    [filterByMarketName, filterByStatus, filterByAsset],
  )

  const {
    data: unfilteredBorrowerMarkets,
    isLoading: isBorrowerMarketsLoading,
  } = useGetBorrowerMarkets(filter)
  const { data: unfilteredOtherMarkets, isLoading: isOthersMarketsLoading } =
    useGetOthersMarkets(filter)

  const filteredBorrowerMarkets = useMemo(
    () =>
      unfilteredBorrowerMarkets
        ? unfilteredBorrowerMarkets
            .filter(
              (market) =>
                !EXCLUDED_MARKETS.includes(market.address.toLowerCase()),
            )
            .filter(
              (market) =>
                filterByStatus.length === 0 ||
                // Separate filter because market can be both delinquent and incurring penalties
                (filterByStatus.includes(MarketStatus.DELINQUENT) &&
                  market.isDelinquent) ||
                filterByStatus.includes(
                  getMarketStatus(
                    market.isClosed,
                    market.isDelinquent || market.willBeDelinquent,
                    market.isIncurringPenalties,
                  ),
                ),
            )
        : [],
    [unfilteredBorrowerMarkets, filterByStatus],
  )

  const filteredOtherMarkets = useMemo(
    () =>
      unfilteredOtherMarkets
        ? unfilteredOtherMarkets
            .filter(
              (market) =>
                !EXCLUDED_MARKETS.includes(market.address.toLowerCase()),
            )
            .filter(
              (market) =>
                filterByStatus.length === 0 ||
                // Separate filter because market can be both delinquent and incurring penalties
                (filterByStatus.includes(MarketStatus.DELINQUENT) &&
                  market.isDelinquent) ||
                filterByStatus.includes(
                  getMarketStatus(
                    market.isClosed,
                    market.isDelinquent || market.willBeDelinquent,
                    market.isIncurringPenalties,
                  ),
                ),
            )
        : [],
    [unfilteredOtherMarkets, filterByStatus],
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
  }, [scrollTargetId])

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
