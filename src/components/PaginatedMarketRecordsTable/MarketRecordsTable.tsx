/* eslint-disable no-underscore-dangle */
import { useMemo, useState } from "react"
import * as React from "react"

import { Box, Skeleton, TablePagination, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { MarketRecord } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { TableStyles } from "@/app/[locale]/borrower/edit-lenders-list/components/ConfirmLendersForm/style"
import { useBorrowerNameOrAddress } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { TOKEN_FORMAT_DECIMALS, trimAddress } from "@/utils/formatters"

import { MarketRecordsTableProps, TypeSafeColDef } from "./interface"
import { LinkGroup } from "../LinkComponent"

const DATE_FORMAT = "DD-MMM-YYYY HH:mm"

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
    const time = dayjs(record.newFixedTermEndTime * 1000).format(DATE_FORMAT)
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
  const name = useBorrowerNameOrAddress(market.borrower)
  const { t } = useTranslation()

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const columns: TypeSafeColDef<MarketRecord>[] = [
    {
      field: "transactionHash",
      headerName: t("marketRecords.table.header.transactionHash"),
      maxWidth: 300,
      minWidth: 300,
      flex: 2,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: "4px" }}>
          <Typography variant="text3">
            {trimAddress(params.value, 10)}
          </Typography>

          <LinkGroup
            type="etherscan"
            linkValue={`${EtherscanBaseUrl}/tx/${params.value}`}
            copyValue={params.value}
          />
        </Box>
      ),
    },
    {
      field: "blockTimestamp",
      headerName: t("marketRecords.table.header.time"),
      flex: 3.35,
      minWidth: 160,
      maxWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Typography variant="text3">
          {dayjs(params.value * 1000).format(DATE_FORMAT)}
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
        padding: "16px 16px",
      }}
      getRowHeight={() => "auto"}
      rows={rows || []}
      columns={columns}
      // {...(paginationProps as any)}
      // rowCount={rowCount}
      hideFooter={false}
      slots={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pagination: TablePagination as any,
      }}
      slotProps={{
        pagination: {
          count: rowCount,
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
    />
  )
}
