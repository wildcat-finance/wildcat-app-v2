import React, { useEffect, useState } from "react"

import { Box, Tab, Tabs, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"

import { MarketsTableAccordion } from "@/app/[locale]/lender/components/MarketsTab/MarketsTableAccordion"
import { TablePagination } from "@/components/TablePagination"
import { COLORS } from "@/theme/colors"

import { OtherMarketsTableProps } from "./interface"
import { MarketsTableStyles, TabsStyles, TabStyle } from "./style"

export const OtherMarketsTable = ({
  isLoading,
  tableColumns,
  tableRows,
  statusFilter,
  assetFilter,
  nameFilter,
}: OtherMarketsTableProps) => {
  const [tab, setTab] = useState<"all" | "selfOnboard">("selfOnboard")
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 10,
    page: 0,
  })

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: "all" | "selfOnboard",
  ) => {
    setTab(newTab)
  }

  const selfOnboardRows = tableRows.filter((row) => row.selfOnboard)

  const defaultFilters =
    assetFilter?.length === 0 && statusFilter?.length === 0 && nameFilter === ""

  useEffect(() => {
    setPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [assetFilter, statusFilter, nameFilter])

  return (
    <MarketsTableAccordion
      type="other"
      label="Other Markets"
      marketsLength={tableRows.length}
      isLoading={isLoading}
      isOpen
      assetFilter={assetFilter}
      statusFilter={statusFilter}
      nameFilter={nameFilter}
    >
      {!isLoading && (
        <Tabs
          value={tab}
          onChange={handleTabsChange}
          aria-label="Other markets table tabs"
          sx={TabsStyles}
        >
          <Box
            sx={{
              width: "16px",
              height: "1px",
              backgroundColor: COLORS.athensGrey,
            }}
          />
          <Tab value="selfOnboard" label="Self-Onboard" sx={TabStyle} />
          <Tab value="all" label="All" sx={TabStyle} />
          <Box
            sx={{
              width: "100%",
              height: "1px",
              backgroundColor: COLORS.athensGrey,
            }}
          />
        </Tabs>
      )}

      {tab === "selfOnboard" && selfOnboardRows.length !== 0 && !isLoading && (
        <DataGrid
          sx={MarketsTableStyles}
          rows={selfOnboardRows}
          columns={tableColumns}
          columnHeaderHeight={40}
          hideFooter={false}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          slots={{
            pagination: TablePagination,
          }}
        />
      )}

      {tab === "selfOnboard" && selfOnboardRows.length === 0 && !isLoading && (
        <Box
          display="flex"
          flexDirection="column"
          padding="24px 16px 12px"
          height="270px"
        >
          <Typography variant="title3" color={COLORS.blackRock}>
            No Self-Onboard Markets Available
          </Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            No self-onboarding markets are available at present.
          </Typography>
        </Box>
      )}

      {tab === "all" && tableRows.length !== 0 && !isLoading && (
        <DataGrid
          sx={MarketsTableStyles}
          rows={tableRows}
          columns={tableColumns}
          columnHeaderHeight={40}
          hideFooter={false}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          slots={{
            pagination: TablePagination,
          }}
        />
      )}

      {tab === "all" &&
        tableRows.length === 0 &&
        !isLoading &&
        !defaultFilters && (
          <Box display="flex" flexDirection="column" padding="24px 16px 12px">
            <Typography variant="text2" color={COLORS.santasGrey}>
              There are no{" "}
              {statusFilter?.length !== 0 &&
                statusFilter?.map((status) => ` ${status.toLowerCase()}`)}{" "}
              {nameFilter === "" ? "" : nameFilter}{" "}
              {assetFilter?.length !== 0 &&
                `${assetFilter?.map((asset) => ` ${asset.name}`)}`}{" "}
              markets at present.
            </Typography>
          </Box>
        )}
    </MarketsTableAccordion>
  )
}
