"use client"

import * as React from "react"

import { Box } from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"

import { COLORS } from "@/theme/colors"

type AnalyticsDataGridProps = {
  rows: GridRowsProp
  columns: GridColDef[]
  minWidth?: number
  noRowsLabel?: string
  loading?: boolean
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
      border: `1px solid ${COLORS.athensGrey}`,
      borderRadius: "16px",
      backgroundColor: COLORS.white,
      overflow: "hidden",
    }}
  >
    <Box sx={{ overflowX: "auto" }}>
      <DataGrid
        autoHeight
        disableRowSelectionOnClick
        disableColumnMenu
        loading={loading}
        rows={rows}
        columns={columns}
        sx={{
          border: "none",
          minWidth,
          "& .MuiDataGrid-columnHeaders": {
            borderBottom: `1px solid ${COLORS.athensGrey}`,
            backgroundColor: COLORS.whiteSmoke,
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            color: COLORS.santasGrey,
            fontWeight: 600,
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          },
          "& .MuiDataGrid-row": {
            minHeight: "60px !important",
            maxHeight: "60px !important",
          },
          "& .MuiDataGrid-cell": {
            minHeight: "60px !important",
            maxHeight: "60px !important",
            borderBottom: `1px solid ${COLORS.athensGrey}`,
            color: COLORS.blackRock,
          },
          "& .MuiDataGrid-footerContainer": {
            display: "none",
          },
          "& .MuiDataGrid-overlayWrapper": {
            minHeight: "160px !important",
          },
        }}
        localeText={{
          noRowsLabel,
        }}
      />
    </Box>
  </Box>
)
