import * as React from "react"

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

import {
  MarketsTableModel,
  TypeSafeColDef,
} from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipButton } from "@/components/TooltipButton"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { statusComparator, tokenAmountComparator } from "@/utils/comparators"
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

  const columns: TypeSafeColDef<MarketsTableModel>[] = [
    {
      field: "status",
      headerName: t("borrowerMarketList.table.header.status"),
      maxWidth: 146,
      minWidth: 130,
      flex: 2,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <Box width="130px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "name",
      headerName: t("borrowerMarketList.table.header.marketName"),
      flex: 3.35,
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
      minWidth: 131,
      flex: 1,
      headerAlign: "right",
      align: "right",
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
      minWidth: 102,
      flex: 1,
      headerAlign: "right",
      align: "right",
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
      minWidth: 79,
      flex: 1,
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
      minWidth: 106,
      flex: 1.6,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
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
      flex: 1.2,
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
    },
  ]

  const rows: GridRowsProp<MarketsTableModel> = tableData.map((market) => {
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
      lenderAPR: annualInterestBips,
      crr: reserveRatioBips,
      maxCapacity: maxTotalSupply,
      borrowable: borrowableAssets,
      deploy: deployedEvent ? deployedEvent.blockTimestamp : 0,
    }
  })

  const defaultFilters =
    assetFilter?.length === 0 && statusFilter?.length === 0 && nameFilter === ""

  return (
    <Accordion sx={{ width: "100%", minWidth: 0 }} defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3" color={COLORS.blackRock}>
            {label}
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
            {statusFilter?.length !== 0 &&
              statusFilter?.map((status) => ` ${status.toLowerCase()}`)}{" "}
            {nameFilter === "" ? "" : nameFilter}{" "}
            {assetFilter?.length !== 0 &&
              `${assetFilter?.map((asset) => ` ${asset.name}`)}`}{" "}
            {t("borrowerMarketList.table.noMarkets.filter.ending")}
          </Typography>
        </Box>
      )}
      {tableData.length !== 0 && !isLoading && (
        <DataGrid
          sx={{
            overflow: "auto",
            maxWidth: "calc(100vw - 267px)",
            padding: "0 16px",
            "& .MuiDataGrid-columnHeader": { padding: 0 },
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
