import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { LinkCell } from "@/app/[locale]/borrower/components/style"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipButton } from "@/components/TooltipButton"
import { ROUTES } from "@/routes"
import { SidebarMarketAssets } from "@/store/slices/borrowerSidebarSlice/interface"
import { COLORS } from "@/theme/colors"
import {
  capacityComparator,
  dateComparator,
  percentComparator,
  statusComparator,
} from "@/utils/comparators"
import {
  formatBps,
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { BorrowerMarketsTableProps } from "./interface"

export const BorrowerMarketsTable = ({
  type,
  label,
  noMarketsTitle,
  noMarketsSubtitle,
  tableData,
  isLoading,
  isOpen,
  statusFilter,
  assetFilter,
  nameFilter,
}: BorrowerMarketsTableProps) => {
  const { t } = useTranslation()

  const columns: GridColDef[] = [
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
      sortComparator: percentComparator,
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
      field: "crr",
      headerName: t("borrowerMarketList.table.header.crr"),
      minWidth: 90,
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
          <TooltipButton value="TBD" />
        </Box>
      ),
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value}
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
      sortComparator: capacityComparator,
      flex: 1.5,
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
      field: "borrowable",
      headerName: t("borrowerMarketList.table.header.borrowable"),
      minWidth: 104,
      headerAlign: "right",
      align: "right",
      sortComparator: capacityComparator,
      flex: 1.5,
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
      field: "deploy",
      headerName: t("borrowerMarketList.table.header.deploy"),
      minWidth: 126,
      headerAlign: "right",
      align: "right",
      sortComparator: dateComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
            {params.value}
          </Typography>
        </Link>
      ),
      flex: 2,
    },
  ]

  const rows = tableData.map((market) => {
    const {
      address,
      name,
      underlyingToken,
      annualInterestBips,
      reserveRatioBips,
      maxTotalSupply,
      borrowableAssets,
      deployedEvent,
    } = market

    const marketStatus = getMarketStatusChip(market)

    return {
      id: address,
      status: marketStatus,
      name,
      asset: underlyingToken.symbol,
      lenderAPR: `${formatBps(annualInterestBips)}%`,
      crr: `${formatBps(reserveRatioBips)}%`,
      maxCapacity: `${formatTokenWithCommas(maxTotalSupply)}`,
      borrowable: formatTokenWithCommas(borrowableAssets, {
        withSymbol: false,
      }),
      deploy: deployedEvent
        ? timestampToDateFormatted(deployedEvent.blockTimestamp)
        : "",
    }
  })

  const defaultFilters =
    assetFilter === SidebarMarketAssets.ALL &&
    statusFilter === "All" &&
    nameFilter === ""

  return (
    <Accordion sx={{ width: "100%", minWidth: 0 }} defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">{label}</Typography>
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
      {tableData.length === 0 && !isLoading && defaultFilters && (
        <Box display="flex" flexDirection="column" padding="24px 16px 12px">
          <Typography variant="title3">{noMarketsTitle}</Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {noMarketsSubtitle}
          </Typography>
        </Box>
      )}
      {tableData.length === 0 && !isLoading && !defaultFilters && (
        <Box display="flex" flexDirection="column" padding="24px 16px 12px">
          <Typography variant="text2" color={COLORS.santasGrey}>
            {t("borrowerMarketList.table.noMarkets.filter.beginning")} {type}{" "}
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
        />
      )}
    </Accordion>
  )
}
