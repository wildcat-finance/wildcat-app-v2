/* eslint-disable camelcase */
import * as React from "react"
import { useEffect, useMemo, useRef } from "react"

import { Box } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MarketsTableAccordion } from "@/app/[locale]/lender/components/MarketsTab/MarketsTableAccordion"
import { OtherMarketsTable } from "@/app/[locale]/lender/components/MarketsTab/OtherMarketsTable"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { logger } from "@/lib/logging/client"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setActiveAmount,
  setOtherAmount,
  setScrollTarget,
  setTerminatedAmount,
} from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"

import { MarketsTabProps } from "./interface"
import { filterMarketAccounts, getColumns, getRows } from "./utils"

export const MarketsTab = ({ showConnectedData }: MarketsTabProps) => {
  const { t } = useTranslation()
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

  const {
    data: lenderMarketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
  } = useLendersMarkets()

  const { data: borrowers } = useBorrowerNames()

  logger.debug({ count: borrowers?.length }, "Got borrowers")

  const isLoading = isLoadingInitial || isLoadingUpdate

  const filteredMarketAccounts = useMemo(
    () =>
      filterMarketAccounts(
        lenderMarketAccounts,
        filterByMarketName,
        filterByStatus,
        filterByAsset,
      ),
    [lenderMarketAccounts, filterByStatus, filterByMarketName, filterByAsset],
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
              noMarketsTitle="No Active Markets"
              noMarketsSubtitle="Join a suitable self-onboarding market below, or reach out to a borrower (see their profile) for access to restricted ones."
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
                    columns={getColumns(t)}
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
                  columns={getColumns(t)}
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
          tableColumns={getColumns(t, true)}
          tableRows={getRows(filteredOtherMarketAccounts, borrowers ?? [])}
          assetFilter={filterByAsset}
          statusFilter={filterByStatus}
          nameFilter={filterByMarketName}
        />
      </Box>
    </Box>
  )
}
