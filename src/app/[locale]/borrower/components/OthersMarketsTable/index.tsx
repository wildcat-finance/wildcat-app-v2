import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Tooltip,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { DataGrid, GridColDef, GridRowParams } from "@mui/x-data-grid"
import { useRouter } from "next/navigation"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipIcon } from "@/components/InputLabel/style"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  capacityComparator,
  dateComparator,
  percentComparator,
} from "@/utils/comparators"
import {
  formatBps,
  formatTokenWithCommas,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatus } from "@/utils/marketStatus"

import { OthersMarketsTableProps } from "./interface"

const columns: GridColDef[] = [
  {
    field: "status",
    headerName: "Status",
    minWidth: 146,
    headerAlign: "left",
    align: "left",
    renderCell: (params) => <MarketStatusChip status={params.value} />,
  },
  {
    field: "name",
    headerName: "Market Name",
    flex: 1,
    headerAlign: "left",
    align: "left",
    renderCell: ({ value }) => (
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </span>
    ),
  },
  {
    field: "borrowerName",
    headerName: "Borrower Name",
    width: 155,
    headerAlign: "left",
    align: "left",
  },
  {
    field: "asset",
    headerName: "Underlying Asset",
    minWidth: 151,
    headerAlign: "right",
    align: "right",
  },
  {
    field: "lenderAPR",
    headerName: "Lender APR",
    minWidth: 106,
    headerAlign: "right",
    align: "right",
    sortComparator: percentComparator,
  },
  {
    field: "crr",
    headerName: "CRR",
    minWidth: 85,
    headerAlign: "right",
    align: "right",
    sortComparator: percentComparator,
    renderHeader: () => (
      <Box display="flex" columnGap="4px" alignItems="center">
        <Typography
          variant="text4"
          sx={{ lineHeight: "10px", color: COLORS.santasGrey }}
        >
          CRR
        </Typography>
        <Tooltip title="TBD" placement="right">
          <SvgIcon fontSize="small" sx={TooltipIcon}>
            <Question />
          </SvgIcon>
        </Tooltip>
      </Box>
    ),
  },
  {
    field: "maxCapacity",
    headerName: "Max. Capacity",
    minWidth: 136,
    headerAlign: "right",
    align: "right",
    sortComparator: capacityComparator,
  },
  {
    field: "borrowable",
    headerName: "Borrowable",
    minWidth: 104,
    headerAlign: "right",
    align: "right",
  },
  {
    field: "deploy",
    headerName: "Deployed",
    minWidth: 114,
    headerAlign: "right",
    align: "right",
    sortComparator: dateComparator,
    renderCell: (params) => (
      <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
        {params.value}
      </Typography>
    ),
  },
]

export const OthersMarketsTable = ({
  tableData,
  isLoading,
  isOpen,
  assetFilter,
  statusFilter,
  nameFilter,
}: OthersMarketsTableProps) => {
  const router = useRouter()

  const rows = tableData.map((market) => ({
    id: market.address,
    status: getMarketStatus(
      market.isClosed,
      market.isDelinquent,
      market.isIncurringPenalties,
    ),
    name: market.name,
    borrowerName: trimAddress(market.borrower),
    asset: market.underlyingToken.symbol,
    lenderAPR: `${formatBps(market.annualInterestBips)}%`,
    crr: `${formatBps(market.reserveRatioBips)}%`,
    maxCapacity: `${formatTokenWithCommas(market.maxTotalSupply)}`,
    borrowable: formatTokenWithCommas(market.borrowableAssets, {
      withSymbol: false,
    }),
    deploy: market.deployedEvent
      ? timestampToDateFormatted(market.deployedEvent.blockTimestamp)
      : "",
  }))

  const handleRowClick = (params: GridRowParams) => {
    router.push(`${ROUTES.borrower.market}/${params.row.id}`)
  }

  return (
    <Accordion defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">Other markets</Typography>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            {isLoading ? "are loading" : rows?.length}
          </Typography>
        </Box>
      </AccordionSummary>
      {isLoading && (
        <Box display="flex" flexDirection="column" padding="32px 16px">
          <Typography variant="title3">Markets are loading</Typography>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            Just wait a little bit.
          </Typography>
        </Box>
      )}
      {tableData.length === 0 &&
        !isLoading &&
        (assetFilter || statusFilter || nameFilter) && (
          <Box display="flex" flexDirection="column" padding="32px 16px">
            <Typography variant="title3">
              There are no other{" "}
              {statusFilter === "All" ? "" : statusFilter?.toLowerCase()}{" "}
              {nameFilter === "" ? "" : nameFilter}{" "}
              {assetFilter === "All" ? "" : assetFilter} markets
            </Typography>
          </Box>
        )}
      {tableData.length !== 0 && !isLoading && (
        <DataGrid
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
          onRowClick={handleRowClick}
        />
      )}
    </Accordion>
  )
}
