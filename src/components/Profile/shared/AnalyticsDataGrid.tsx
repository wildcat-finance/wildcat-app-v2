"use client"

import * as React from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridValidRowModel,
} from "@mui/x-data-grid"

import { TableStyles } from "@/app/[locale]/borrower/edit-lenders-list/components/ConfirmLendersForm/style"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

const DEFAULT_MOBILE_PAGE_SIZE = 10

type AnalyticsDataGridProps = {
  rows: GridRowsProp
  columns: GridColDef[]
  minWidth?: number
  maxHeight?: number | string
  noRowsLabel?: string
  loading?: boolean
  /**
   * When provided AND viewport is mobile, the DataGrid is replaced with a
   * vertically stacked list of cards. Receives each row and returns a custom
   * card (typically a `MobileAnalyticsCard`).
   */
  renderMobileRow?: (row: GridValidRowModel) => React.ReactNode
  /** Page size for the mobile card list. Defaults to 10. */
  mobilePageSize?: number
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

const buildPageRange = (page: number, total: number): (number | "...")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)

  const range: (number | "...")[] = [0]
  if (page > 2) range.push("...")
  for (
    let i = Math.max(1, page - 1);
    i <= Math.min(total - 2, page + 1);
    // eslint-disable-next-line no-plusplus
    i++
  ) {
    range.push(i)
  }
  if (page < total - 3) range.push("...")
  range.push(total - 1)
  return range
}

const MobilePagination = ({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (next: number) => void
}) => {
  const items = buildPageRange(page, totalPages)
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 4px 4px",
      }}
    >
      <Button
        size="small"
        variant="outlined"
        color="secondary"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        sx={{
          minWidth: "fit-content",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "13px",
        }}
      >
        Prev
      </Button>
      <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {items.map((item, idx) =>
          item === "..." ? (
            <Box
              // eslint-disable-next-line react/no-array-index-key
              key={`gap-${idx}`}
              sx={{
                width: "20px",
                textAlign: "center",
                color: COLORS.santasGrey,
                fontSize: "12px",
              }}
            >
              …
            </Box>
          ) : (
            <Button
              key={item}
              onClick={() => onChange(item)}
              sx={{
                minWidth: "28px !important",
                width: "28px",
                height: "28px",
                padding: 0,
                borderRadius: "8px",
                backgroundColor: item === page ? COLORS.glitter : "transparent",
                color:
                  item === page ? COLORS.ultramarineBlue : COLORS.blackRock,
                fontWeight: item === page ? 600 : 400,
                fontSize: "12px",
                "&:hover": {
                  backgroundColor:
                    item === page ? COLORS.glitter : COLORS.whiteSmoke,
                },
              }}
            >
              {item + 1}
            </Button>
          ),
        )}
      </Box>
      <Button
        size="small"
        variant="outlined"
        color="secondary"
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        sx={{
          minWidth: "fit-content",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "13px",
        }}
      >
        Next
      </Button>
    </Box>
  )
}

export const AnalyticsDataGrid = ({
  rows,
  columns,
  minWidth = 780,
  maxHeight,
  noRowsLabel = "No records found.",
  loading,
  renderMobileRow,
  mobilePageSize = DEFAULT_MOBILE_PAGE_SIZE,
}: AnalyticsDataGridProps) => {
  const isMobile = useMobileResolution()
  const [page, setPage] = React.useState(0)

  // Reset to first page if the data set shrinks beneath the current page.
  const totalPages = Math.max(1, Math.ceil(rows.length / mobilePageSize))
  const safePage = Math.min(page, totalPages - 1)
  React.useEffect(() => {
    if (safePage !== page) setPage(safePage)
  }, [safePage, page])

  if (isMobile && renderMobileRow) {
    if (loading) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              sx={{ height: "96px", borderRadius: "12px" }}
            />
          ))}
        </Box>
      )
    }

    if (rows.length === 0) {
      return (
        <Box
          sx={{
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.athensGrey}`,
            borderRadius: "12px",
            padding: "24px 14px",
            textAlign: "center",
          }}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            {noRowsLabel}
          </Typography>
        </Box>
      )
    }

    const start = safePage * mobilePageSize
    const slice = rows.slice(start, start + mobilePageSize)
    const showPagination = rows.length > mobilePageSize

    return (
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {slice.map((row) => (
            <React.Fragment key={String(row.id ?? Math.random())}>
              {renderMobileRow(row)}
            </React.Fragment>
          ))}
        </Box>
        {showPagination && (
          <MobilePagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
          />
        )}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        "--analytics-table-min-width": `${minWidth}px`,
        backgroundColor: COLORS.white,
      }}
    >
      <Box
        sx={{
          maxHeight,
          overflowX: "auto",
          overflowY: maxHeight ? "auto" : "visible",
        }}
      >
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
}
