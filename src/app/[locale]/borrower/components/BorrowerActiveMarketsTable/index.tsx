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

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipIcon } from "@/components/InputLabel/style"
import { COLORS } from "@/theme/colors"

const rows = [
  {
    id: 1,
    status: "healthy",
    name: "Asset 1",
    asset: "WETH",
    lenderAPR: 5.3,
    crr: "65%",
    maxCapacity: 1000000,
    borrowable: 650000,
    deploy: "2024-05-29 10:30",
  },
  {
    id: 2,
    status: "penalty",
    name: "Asset 2",
    asset: "USDC",
    lenderAPR: 4.7,
    crr: "70%",
    maxCapacity: 500000,
    borrowable: 350000,
    deploy: "2024-05-28 14:45",
  },
  {
    id: 3,
    status: "healthy",
    name: "Asset 3",
    asset: "USDT",
    lenderAPR: 6.1,
    crr: "80%",
    maxCapacity: 2000000,
    borrowable: 1600000,
    deploy: "2024-05-27 08:20",
  },
  {
    id: 4,
    status: "penalty",
    name: "Asset 4",
    asset: "WETH",
    lenderAPR: 3.9,
    crr: "60%",
    maxCapacity: 750000,
    borrowable: 450000,
    deploy: "2024-05-26 16:10",
  },
  {
    id: 5,
    status: "healthy",
    name: "Asset 5",
    asset: "USDC",
    lenderAPR: 5.0,
    crr: "75%",
    maxCapacity: 1250000,
    borrowable: 937500,
    deploy: "2024-05-25 12:55",
  },
]

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

export const BorrowerActiveMarketsTable = () => {
  const tableData = rows.map((market) => ({
    id: market.id,
    status: market.status,
    name: market.name,
    asset: market.asset,
    lenderAPR: market.lenderAPR,
    crr: market.crr,
    maxCapacity: market.maxCapacity,
    borrowable: market.borrowable,
    deploy: market.deploy,
  }))

  return (
    <Accordion>
      <AccordionSummary>Your Active Markets</AccordionSummary>
      <DataGrid rows={tableData} columns={columns} columnHeaderHeight={40} />
    </Accordion>
  )
}
