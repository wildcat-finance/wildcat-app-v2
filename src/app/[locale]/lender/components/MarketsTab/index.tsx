/* eslint-disable camelcase */
import * as React from "react"
import { useEffect, useMemo, useRef } from "react"

import { Box } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import {
  LenderRole,
  MarketAccount,
  SubgraphMarket_Filter,
} from "@wildcatfi/wildcat-sdk"

import { useGetBorrowers } from "@/app/[locale]/borrower/hooks/useGetBorrowers"
import { MarketsTableAccordion } from "@/app/[locale]/lender/components/MarketsTab/MarketsTableAccordion"
import { OtherMarketsTable } from "@/app/[locale]/lender/components/MarketsTab/OtherMarketsTable"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setActiveAmount,
  setOtherAmount,
  setScrollTarget,
  setTerminatedAmount,
} from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { getMarketStatus, MarketStatus } from "@/utils/marketStatus"

import { MarketsTabProps } from "./interface"
import { filterMarketAccounts, getColumns, getRows } from "./utils"

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

export const MarketsTab = ({ showConnectedData }: MarketsTabProps) => {
  const dispatch = useAppDispatch()

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
    data: lenderMarketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
  } = useLendersMarkets(filter)

  const { data: borrowers } = useGetBorrowers()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const filteredMarketAccounts = useMemo(
    () =>
      lenderMarketAccounts
        ? lenderMarketAccounts
            .filter(
              (account) =>
                !EXCLUDED_MARKETS.includes(
                  account.market.address.toLowerCase(),
                ) ||
                account.isAuthorizedOnController ||
                account.role !== LenderRole.Null,
            )
            .filter(
              (account) =>
                filterByStatus.length === 0 ||
                // Separate filter because market can be both delinquent and incurring penalties
                (filterByStatus.includes(MarketStatus.DELINQUENT) &&
                  account.market.isDelinquent) ||
                filterByStatus.includes(
                  getMarketStatus(
                    account.market.isClosed,
                    account.market.isDelinquent ||
                      account.market.willBeDelinquent,
                    account.market.isIncurringPenalties,
                  ),
                ),
            )
        : [],
    [lenderMarketAccounts, filterByStatus],
  )
  const {
    active: filteredActiveLenderMarketAccounts,
    terminated: terminatedMarketAccounts,
    other: filteredOtherMarketAccounts,
  } = useMemo(
    () =>
      filteredMarketAccounts.reduce(
        (all, account) => {
          if (account.hasEverInteracted) {
            if (!account.market.isClosed) {
              all.active.push(account)
            } else {
              all.terminated.push(account)
            }
          } else {
            all.other.push(account)
          }
          return all
        },
        {
          active: [] as MarketAccount[],
          terminated: [] as MarketAccount[],
          other: [] as MarketAccount[],
        },
      ),
    [filteredMarketAccounts],
  )
  useEffect(() => {
    dispatch(
      setActiveAmount(
        isLoading ? "" : filteredActiveLenderMarketAccounts.length.toString(),
      ),
    )
    dispatch(
      setTerminatedAmount(
        isLoading ? "" : terminatedMarketAccounts.length.toString(),
      ),
    )
    dispatch(
      setOtherAmount(
        isLoading ? "" : filteredOtherMarketAccounts.length.toString(),
      ),
    )
  }, [
    filteredActiveLenderMarketAccounts,
    filteredOtherMarketAccounts,
    terminatedMarketAccounts,
  ])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "auto",
        overflowY: "auto",
      }}
      height="calc(100vh - 43px - 52px - 52px - 110px)"
    >
      {showConnectedData && (
        <Box>
          <Box id="active-lender-markets" ref={activeMarketsRef}>
            <MarketsTableAccordion
              label="Your Active Markets"
              noMarketsTitle="No active markets"
              noMarketsSubtitle="Choose a market below or use a direct link to a particular one to leave a request for joining"
              type="active"
              marketsLength={filteredActiveLenderMarketAccounts.length}
              isLoading={isLoading}
              isOpen
              showNoFilteredMarkets
              assetFilter={filterByAsset}
              statusFilter={filterByStatus}
              nameFilter={filterByMarketName}
            >
              {filteredActiveLenderMarketAccounts.length !== 0 &&
                !isLoading && (
                  <DataGrid
                    sx={{
                      overflow: "auto",
                      maxWidth: "calc(100vw - 267px)",
                      padding: "0 16px",
                      "& .MuiDataGrid-columnHeader": { padding: 0 },
                      "& .MuiDataGrid-cell": { padding: "0px" },
                    }}
                    rows={getRows(
                      filteredActiveLenderMarketAccounts,
                      borrowers ?? [],
                    )}
                    columns={getColumns()}
                    columnHeaderHeight={40}
                  />
                )}
            </MarketsTableAccordion>
          </Box>

          {!!terminatedMarketAccounts.length && (
            <Box
              marginTop="16px"
              id="terminated-lender-markets"
              ref={terminatedMarketsRef}
            >
              <MarketsTableAccordion
                type="terminated"
                label="Your terminated markets"
                marketsLength={terminatedMarketAccounts.length}
                isLoading={isLoading}
                assetFilter={filterByAsset}
                statusFilter={filterByStatus}
                nameFilter={filterByMarketName}
              >
                <DataGrid
                  sx={{
                    overflow: "auto",
                    maxWidth: "calc(100vw - 267px)",
                    padding: "0 16px",
                    "& .MuiDataGrid-columnHeader": { padding: 0 },
                    "& .MuiDataGrid-cell": { padding: "0px" },
                  }}
                  rows={getRows(terminatedMarketAccounts, borrowers ?? [])}
                  columns={getColumns()}
                  columnHeaderHeight={40}
                />
              </MarketsTableAccordion>
            </Box>
          )}
        </Box>
      )}

      <Box marginTop="16px" id="scroll-container-id" ref={otherMarketsRef}>
        <OtherMarketsTable
          isLoading={isLoading}
          tableColumns={getColumns(true)}
          tableRows={getRows(filteredOtherMarketAccounts, borrowers ?? [])}
          assetFilter={filterByAsset}
          statusFilter={filterByStatus}
          nameFilter={filterByMarketName}
        />
      </Box>
    </Box>
  )
}
