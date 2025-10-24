/* eslint-disable no-underscore-dangle */
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { MarketRecord } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { TableStyles } from "@/app/[locale]/borrower/edit-lenders-list/components/ConfirmLendersForm/style"
import { useBorrowerNameOrAddress } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { TablePagination } from "@/components/TablePagination"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { COLORS } from "@/theme/colors"
import {
  timestampToDateFormatted,
  TOKEN_FORMAT_DECIMALS,
  trimAddress,
} from "@/utils/formatters"

import { MarketRecordsTableProps, TypeSafeColDef } from "./interface"
import { LinkGroup } from "../LinkComponent"

const getRecordText = (
  record: MarketRecord,
  lenderNames: { [key: string]: string },
  borrowerName: string,
): string => {
  if (record.__typename === "AnnualInterestBipsUpdated") {
    return `Base APR changed from ${record.oldAnnualInterestBips / 100}% to ${
      record.newAnnualInterestBips / 100
    }%`
  }
  if (record.__typename === "Borrow") {
    return `${borrowerName} borrowed ${record.amount
      .format(TOKEN_FORMAT_DECIMALS, true)
      .toLocaleString()}`
  }
  if (record.__typename === "DebtRepaid") {
    return `${borrowerName} repaid ${record.amount
      .format(TOKEN_FORMAT_DECIMALS, true)
      .toLocaleString()}`
  }
  if (record.__typename === "Deposit") {
    const lenderName = lenderNames[record.address.toLowerCase()]
    const label = lenderName ?? trimAddress(record.address)
    return `${label} loaned ${record.amount
      .format(TOKEN_FORMAT_DECIMALS, true)
      .toLocaleString()}`
  }
  if (record.__typename === "DelinquencyStatusChanged") {
    if (!record.isDelinquent) return `Market back in good standing`
    const delinquentDebt = record.liquidityCoverageRequired
      .satsub(record.totalAssets)
      .format(TOKEN_FORMAT_DECIMALS, true)
    return `Market delinquent by ${delinquentDebt.toLocaleString()}`
  }
  if (record.__typename === "FeesCollected") {
    return `${record.amount
      .format(TOKEN_FORMAT_DECIMALS, true)
      .toLocaleString()} collected in protocol fees`
  }
  if (record.__typename === "MarketClosed") {
    return `Market closed`
  }
  if (record.__typename === "WithdrawalRequest") {
    const lenderName = lenderNames[record.address.toLowerCase()]
    const label = lenderName ?? trimAddress(record.address)
    return `${label} requested a withdrawal of ${record.normalizedAmount
      .format(TOKEN_FORMAT_DECIMALS, true)
      .toLocaleString()}`
  }
  if (record.__typename === "MaxTotalSupplyUpdated") {
    const kind = record.newMaxTotalSupply.gt(record.oldMaxTotalSupply)
      ? "increased"
      : "reduced"
    return `Market capacity ${kind} to ${record.newMaxTotalSupply
      .format(TOKEN_FORMAT_DECIMALS, true)
      .toLocaleString()}`
  }
  if (record.__typename === "MinimumDepositUpdated") {
    return `Minimum deposit updated to ${record.newMinimumDeposit
      .format(TOKEN_FORMAT_DECIMALS, true)
      .toLocaleString()}`
  }
  if (record.__typename === "ProtocolFeeBipsUpdated") {
    return `Protocol fee updated to ${record.newProtocolFeeBips / 100}%`
  }
  if (record.__typename === "FixedTermUpdated") {
    const time = timestampToDateFormatted(record.newFixedTermEndTime)

    return `Market maturity updated to ${time}`
  }
  return ""
}

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
  const { getTxUrl } = useBlockExplorer()
  const name = useBorrowerNameOrAddress(market.borrower)
  const { t } = useTranslation()

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
      renderCell: (params) => (
        <Typography variant="text3">
          {getRecordText(params.row, lendersName, name)}
        </Typography>
      ),
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

  console.log(`TOTAL ROWS: ${rowCount}`)

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        padding="32px 16px"
        rowGap="8px"
      >
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      </Box>
    )
  }

  const rows = records?.map((r) => ({ id: r.transactionHash, ...r }))

  if (rows?.length === 0) {
    return (
      <Box display="flex" flexDirection="column" marginTop="24px">
        <Typography variant="text3" color={COLORS.santasGrey}>
          No unfiltered events
        </Typography>
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
