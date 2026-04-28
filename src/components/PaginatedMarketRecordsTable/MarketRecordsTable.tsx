import * as React from "react"

import { Box, Button, Skeleton, Tooltip, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { MarketRecord } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { TableStyles } from "@/app/[locale]/borrower/edit-lenders-list/components/ConfirmLendersForm/style"
import { useBorrowerNameOrAddress } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MobileMarketRecordItem } from "@/components/Mobile/MobileMarketRecordItem"
import { TablePagination } from "@/components/TablePagination"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted, trimAddress } from "@/utils/formatters"
import { getRecordText } from "@/utils/marketRecords"
import { getPaginationRange } from "@/utils/pagination"

import { MarketRecordsTableProps, TypeSafeColDef } from "./interface"
import { LinkGroup } from "../LinkComponent"

export function MarketRecordsTable({
  market,
  records,
  isLoading,
  pageSize,
  page,
  setPage,
  setPageSize,
  rowCount,
}: MarketRecordsTableProps) {
  const { getTxUrl } = useBlockExplorer({ chainId: market.chainId })
  const name = useBorrowerNameOrAddress(market.borrower)
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const columns: TypeSafeColDef<MarketRecord>[] = [
    {
      field: "transactionHash",
      headerName: t("marketRecords.table.header.transactionHash"),
      minWidth: 180,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: "4px" }}>
          <Typography variant="text3">
            {trimAddress(params.value, 10)}
          </Typography>
          <LinkGroup
            linkValue={getTxUrl(params.value)}
            copyValue={params.value}
          />
        </Box>
      ),
    },
    {
      field: "blockTimestamp",
      headerName: t("marketRecords.table.header.time"),
      flex: 1,
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Typography variant="text3">
          {timestampToDateFormatted(params.value)}
        </Typography>
      ),
    },
    {
      field: "eventIndex",
      headerName: t("marketRecords.table.header.event"),
      minWidth: 200,
      flex: 2,
      headerAlign: "right",
      align: "right",
      sortable: false,
      renderCell: (params) => {
        const rawText = getRecordText(params.row, lendersName, name, true)
        const displayText = getRecordText(params.row, lendersName, name)
        return (
          <Tooltip title={rawText} placement="right" arrow>
            <Typography variant="text3">{displayText}</Typography>
          </Tooltip>
        )
      },
    },
  ]

  // const paginationProps = useMemo(
  //   () => ({
  //     hideFooter: false,
  //     paginationModel: {
  //       page,
  //       pageSize,
  //     },
  //     onPaginationModelChange: (model: { page: number; pageSize: number }) => {
  //       setPage(model.page)
  //       setPageSize(model.pageSize)
  //     },
  //     slots: {
  //       pagination: TablePagination,
  //     },
  //   }),
  //   [page, pageSize],
  // )

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        padding={isMobile ? "8px 0" : "32px 16px"}
        rowGap="8px"
      >
        <Skeleton
          height={isMobile ? "60px" : "52px"}
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height={isMobile ? "60px" : "52px"}
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height={isMobile ? "60px" : "52px"}
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      </Box>
    )
  }

  const rows = records?.map((r) => ({ id: r.transactionHash, ...r }))

  if (rows?.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        marginTop={isMobile ? "8px" : "24px"}
      >
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.santasGrey}
        >
          No unfiltered events
        </Typography>
      </Box>
    )
  }

  if (isMobile) {
    const totalPages = Math.max(1, Math.ceil((rowCount ?? 0) / pageSize))
    const paginationItems = getPaginationRange(page, totalPages)

    return (
      <Box display="flex" flexDirection="column">
        <Box>
          {records?.map((r, index) => (
            <MobileMarketRecordItem
              key={r.transactionHash + r.eventIndex}
              record={r}
              lenderNames={lendersName}
              borrowerName={name}
              txUrl={getTxUrl(r.transactionHash)}
              isLast={index === records.length - 1}
            />
          ))}
        </Box>

        {totalPages > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0 4px",
            }}
          >
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => setPage(Math.max(page - 1, 0))}
              disabled={page === 0}
              sx={{
                minWidth: "fit-content",
                padding: "6px 14px",
                borderRadius: "8px",
                "&.Mui-disabled": {
                  backgroundColor: COLORS.whiteSmoke,
                  color: COLORS.greySuit,
                },
              }}
            >
              Prev
            </Button>

            <Box sx={{ display: "flex", gap: "8px" }}>
              {paginationItems.map((item, idx) => {
                if (item === "...") {
                  const prev = paginationItems[idx - 1]
                  return (
                    <Box
                      key={`ellipsis-after-${prev}`}
                      sx={{
                        width: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: COLORS.santasGrey,
                        fontSize: "14px",
                      }}
                    >
                      ...
                    </Box>
                  )
                }

                return (
                  <Button
                    key={item}
                    onClick={() => setPage(item)}
                    sx={{
                      minWidth: "24px !important",
                      width: "24px !important",
                      padding: "2px !important",
                      borderRadius: "8px",
                      backgroundColor:
                        item === page ? COLORS.whiteSmoke : "transparent",
                      "&:hover": {
                        backgroundColor: COLORS.whiteSmoke,
                      },
                    }}
                  >
                    <Typography variant="text3" color={COLORS.bunker}>
                      {item + 1}
                    </Typography>
                  </Button>
                )
              })}
            </Box>

            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => setPage(Math.min(page + 1, totalPages - 1))}
              disabled={page === totalPages - 1}
              sx={{
                minWidth: "fit-content",
                padding: "6px 14px",
                borderRadius: "8px",
                "&.Mui-disabled": {
                  backgroundColor: COLORS.whiteSmoke,
                  color: COLORS.greySuit,
                },
              }}
            >
              Next
            </Button>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <DataGrid
      sx={{
        ...TableStyles,
        overflow: "auto",
        maxWidth: "calc(100vw - 267px)",
        padding: "16px 0 0 0",
      }}
      getRowHeight={() => "auto"}
      rows={rows || []}
      columns={columns}
      paginationMode="server"
      paginationModel={{ page, pageSize }}
      onPaginationModelChange={(model) => {
        if (model.page !== page) setPage(model.page)
        if (model.pageSize !== pageSize) setPageSize(model.pageSize)
      }}
      rowCount={rowCount}
      pageSizeOptions={[10, 25, 50]}
      slots={{
        pagination: TablePagination,
      }}
      slotProps={{
        pagination: {
          count: rowCount,
          labelDisplayedRows: ({ from, to, count }) =>
            `${from}–${to} of ${count}`,
          page,
          rowsPerPage: pageSize,
          onPageChange: (event, newPage) => {
            setPage(newPage)
          },
          onRowsPerPageChange: (event) => {
            setPageSize(Number(event.target.value))
          },
        },
      }}
      hideFooter={false}
    />
  )
}
