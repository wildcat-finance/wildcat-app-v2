import * as React from "react"

import { Box } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { LenderRole } from "@wildcatfi/wildcat-sdk"
import { Element as ScrollElement } from "react-scroll"

import { useGetBorrowers } from "@/app/[locale]/borrower/hooks/useGetBorrowers"
import { MarketsTableAccordion } from "@/app/[locale]/lender/components/MarketsTab/MarketsTableAccordion"
import { OtherMarketsTable } from "@/app/[locale]/lender/components/MarketsTab/OtherMarketsTable"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { useAppSelector } from "@/store/hooks"
import { EXCLUDED_MARKETS } from "@/utils/constants"

import { MarketsTabProps } from "./interface"
import { filterMarketAccounts, getColumns, getRows } from "./utils"

export const MarketsTab = ({ showConnectedData }: MarketsTabProps) => {
  const filterByMarketName = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketName,
  )
  const filterByStatus = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketsStatuses,
  )
  const filterByAsset = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketsAssets,
  )

  const {
    data: lenderMarketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
  } = useLendersMarkets()

  const { data: borrowers } = useGetBorrowers()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const filteredMarketAccounts = lenderMarketAccounts
    ? lenderMarketAccounts.filter(
        (account) =>
          !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
          account.isAuthorizedOnController ||
          account.role !== LenderRole.Null,
      )
    : []

  const activeLenderMarketAccounts = filteredMarketAccounts
    .filter(
      (account) =>
        account.isAuthorizedOnController || account.role !== LenderRole.Null,
    )
    .filter(({ market }) => !market.isClosed)

  const terminatedMarketAccounts = filteredMarketAccounts
    .filter(
      (account) =>
        account.isAuthorizedOnController || account.role !== LenderRole.Null,
    )
    .filter(({ market }) => market.isClosed)

  const otherMarketAccounts = filteredMarketAccounts.filter(
    (marketAccount) =>
      ![...activeLenderMarketAccounts, ...terminatedMarketAccounts].includes(
        marketAccount,
      ),
  )

  const filteredActiveLenderMarketAccounts = filterMarketAccounts(
    activeLenderMarketAccounts,
    filterByMarketName,
    filterByStatus,
    filterByAsset,
  )

  const filteredOtherMarketAccounts = filterMarketAccounts(
    otherMarketAccounts,
    filterByMarketName,
    filterByStatus,
    filterByAsset,
  )

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
          <Box id="active-lender-markets">
            <MarketsTableAccordion
              label="Your active markets"
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
            <Box marginTop="16px" id="terminated-lender-markets">
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

      <Box marginTop="16px" id="scroll-container-id">
        <ScrollElement name="other-markets">
          <OtherMarketsTable
            isLoading={isLoading}
            tableColumns={getColumns(true)}
            tableRows={getRows(filteredOtherMarketAccounts, borrowers ?? [])}
            assetFilter={filterByAsset}
            statusFilter={filterByStatus}
            nameFilter={filterByMarketName}
          />
        </ScrollElement>
      </Box>
    </Box>
  )
}
