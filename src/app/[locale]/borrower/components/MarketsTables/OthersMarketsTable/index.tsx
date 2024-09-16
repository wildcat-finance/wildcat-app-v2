import * as React from "react"
import { useEffect } from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipButton } from "@/components/TooltipButton"
import { ROUTES } from "@/routes"
import { SidebarMarketAssets } from "@/store/slices/borrowerSidebarSlice/interface"
import { COLORS } from "@/theme/colors"
import { statusComparator, tokenAmountComparator } from "@/utils/comparators"
import {
  formatBps,
  formatTokenWithCommas,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { OthersMarketsTableProps } from "./interface"
import { MarketsTableModel, TypeSafeColDef } from "../interface"

export const OthersMarketsTable = ({
  tableData,
  borrowersData,
  isLoading,
  isOpen,
  assetFilter,
  statusFilter,
  nameFilter,
}: OthersMarketsTableProps) => {
  const { t } = useTranslation()

  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 9,
    page: 0,
  })

  const columns: TypeSafeColDef<MarketsTableModel>[] = [
    {
      field: "status",
      headerName: t("borrowerMarketList.table.header.status"),
      minWidth: 150,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <MarketStatusChip status={params.value} />
        </Link>
      ),
      flex: 2,
    },
    {
      field: "name",
      headerName: t("borrowerMarketList.table.header.marketName"),
      flex: 4,
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {params.value}
          </span>
        </Link>
      ),
    },
    {
      field: "borrowerName",
      headerName: t("borrowerMarketList.table.header.borrowerName"),
      minWidth: 130,
      headerAlign: "left",
      align: "left",
      flex: 2,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: t("borrowerMarketList.table.header.asset"),
      minWidth: 151,
      headerAlign: "right",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "lenderAPR",
      headerName: t("borrowerMarketList.table.header.apr"),
      minWidth: 106,
      headerAlign: "right",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {`${formatBps(params.value)}%`}
        </Link>
      ),
    },
    {
      field: "crr",
      headerName: t("borrowerMarketList.table.header.crr"),
      minWidth: 90,
      headerAlign: "right",
      align: "right",
      renderHeader: () => (
        <Box display="flex" columnGap="4px" alignItems="center">
          <Typography
            variant="text4"
            sx={{ lineHeight: "10px", color: COLORS.santasGrey }}
          >
            CRR
          </Typography>
          <TooltipButton value="TBD" />
        </Box>
      ),
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {`${formatBps(params.value)}%`}
        </Link>
      ),
      flex: 1,
    },
    {
      field: "maxCapacity",
      headerName: t("borrowerMarketList.table.header.capacity"),
      minWidth: 136,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      flex: 1.5,
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value ? formatTokenWithCommas(params.value) : "0"}
        </Link>
      ),
    },
    {
      field: "borrowable",
      headerName: t("borrowerMarketList.table.header.borrowable"),
      minWidth: 104,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      flex: 1.5,
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Link>
      ),
    },
    {
      field: "deploy",
      headerName: t("borrowerMarketList.table.header.deploy"),
      minWidth: 126,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
            {timestampToDateFormatted(params.value)}
          </Typography>
        </Link>
      ),
      flex: 2,
    },
  ]

  const rows: GridRowsProp<MarketsTableModel> = tableData.map((market) => {
    const {
      address,
      borrower: borrowerAddress,
      name,
      underlyingToken,
      annualInterestBips,
      reserveRatioBips,
      maxTotalSupply,
      borrowableAssets,
      deployedEvent,
    } = market

    const borrower = borrowersData?.find(
      (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
    )
    const borrowerName = borrower ? borrower.name : trimAddress(borrowerAddress)
    const marketStatus = getMarketStatusChip(market)

    return {
      id: address,
      status: marketStatus,
      name,
      borrowerName,
      asset: underlyingToken.symbol,
      lenderAPR: annualInterestBips,
      crr: reserveRatioBips,
      maxCapacity: maxTotalSupply,
      borrowable: borrowableAssets,
      deploy: deployedEvent ? deployedEvent.blockTimestamp : 0,
    }
  })

  const defaultFilters =
    assetFilter === SidebarMarketAssets.ALL &&
    statusFilter === "All" &&
    nameFilter === ""

  useEffect(() => {
    setPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [assetFilter, statusFilter, nameFilter])

  return (
    <Accordion defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">
            {t("borrowerMarketList.table.title.other")}
          </Typography>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            {isLoading
              ? t("borrowerMarketList.table.title.loading")
              : rows.length}
          </Typography>
        </Box>
      </AccordionSummary>
      {isLoading && (
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
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
        </Box>
      )}
      {tableData.length === 0 && !isLoading && !defaultFilters && (
        <Box display="flex" flexDirection="column" padding="24px 16px 12px">
          <Typography variant="text2" color={COLORS.santasGrey}>
            {t("borrowerMarketList.table.noMarkets.filter.beginning")}{" "}
            {statusFilter === "All" ? "" : statusFilter?.toLowerCase()}{" "}
            {nameFilter === "" ? "" : nameFilter}{" "}
            {assetFilter === "All" ? "" : assetFilter}{" "}
            {t("borrowerMarketList.table.noMarkets.filter.ending")}
          </Typography>
        </Box>
      )}
      {tableData.length !== 0 && !isLoading && (
        <DataGrid
          sx={{
            overflow: "auto",
            maxWidth: "calc(100vw - 267px)",
            "& .MuiDataGrid-cell": { padding: "0px" },
          }}
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
          hideFooter={false}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      )}
    </Accordion>
  )
}
