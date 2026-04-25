"use client"

import * as React from "react"

import { Box } from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"

import { TableStyles } from "@/app/[locale]/borrower/edit-lenders-list/components/ConfirmLendersForm/style"
import { COLORS } from "@/theme/colors"

type AnalyticsDataGridProps = {
  rows: GridRowsProp
  columns: GridColDef[]
  minWidth?: number
  noRowsLabel?: string
  loading?: boolean
}

export const analyticsDataGridSx = {
  ...TableStyles,
  border: "none",
  minWidth: "var(--analytics-table-min-width)",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: COLORS.white,
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    color: COLORS.santasGrey,
    fontWeight: 500,
    letterSpacing: 0,
  },
  "& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitleContainer": {
    margin: "0 0 8px",
  },
  "& .MuiDataGrid-cell": {
    color: COLORS.blackRock,
  },
  "& .MuiDataGrid-cell a": {
    color: "inherit",
    textDecoration: "none",
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
    outline: "none",
  },
  "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within":
    {
      outline: "none",
    },
  "& .MuiDataGrid-footerContainer": {
    display: "none",
  },
  "& .MuiDataGrid-overlayWrapper": {
    minHeight: "160px !important",
  },
}

export const AnalyticsDataGrid = ({
  rows,
  columns,
  minWidth = 780,
  noRowsLabel = "No records found.",
  loading,
}: AnalyticsDataGridProps) => (
  <Box
    sx={{
      "--analytics-table-min-width": `${minWidth}px`,
      backgroundColor: COLORS.white,
    }}
  >
    <Box sx={{ overflowX: "auto" }}>
      <DataGrid
        autoHeight
        getRowHeight={() => "auto"}
        hideFooter
        disableRowSelectionOnClick
        disableColumnMenu
        loading={loading}
        rows={rows}
        columns={columns}
        sx={analyticsDataGridSx}
        localeText={{
          noRowsLabel,
        }}
      />
    </Box>
  </Box>
)
