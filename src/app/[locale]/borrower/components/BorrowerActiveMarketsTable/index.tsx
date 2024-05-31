import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Tooltip,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { DataGrid, GridColDef, GridColumnHeaderParams } from "@mui/x-data-grid"
import { Market } from "@wildcatfi/wildcat-sdk"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipIcon } from "@/components/InputLabel/style"
import { COLORS } from "@/theme/colors"
import {
  formatBps,
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"
import { getMarketStatus } from "@/utils/marketStatus"

import { BorrowerActiveMarketsTableProps } from "./interface"

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
  },
  {
    field: "crr",
    headerName: "CRR",
    minWidth: 85,
    headerAlign: "right",
    align: "right",
    renderHeader: (params: GridColumnHeaderParams) => (
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
  },
]

export const BorrowerActiveMarketsTable = ({
  tableData,
  isLoading,
}: BorrowerActiveMarketsTableProps) => {
  const rows = tableData
    ? tableData.map((market) => ({
        id: market.address,
        status: getMarketStatus(
          market.isClosed,
          market.isDelinquent,
          market.isIncurringPenalties,
        ),
        name: market.name,
        asset: market.underlyingToken.symbol,
        lenderAPR: `${formatBps(market.annualInterestBips)}%`,
        crr: `${formatBps(market.reserveRatioBips)}%`,
        maxCapacity: `${formatTokenWithCommas(market.maxTotalSupply)} ${
          market.underlyingToken.symbol
        }`,
        borrowable: formatTokenWithCommas(market.borrowableAssets, {
          withSymbol: true,
        }),
        deploy: market.deployedEvent
          ? timestampToDateFormatted(market.deployedEvent.blockTimestamp)
          : "",
      }))
    : undefined

  return (
    <Accordion>
      <AccordionSummary>Your Active Markets</AccordionSummary>
      {isLoading && <Typography variant="text2">Is Loading</Typography>}
      {tableData && !isLoading && (
        <DataGrid rows={rows} columns={columns} columnHeaderHeight={40} />
      )}
    </Accordion>
  )
}
