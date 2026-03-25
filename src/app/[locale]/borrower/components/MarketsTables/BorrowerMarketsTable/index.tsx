import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { HooksKind, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import {
  MarketsTableModel,
  TypeSafeColDef,
} from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { ColumnHeaderTitle } from "@/components/ColumnHeaderTitle"
import { TablePagination } from "@/components/TablePagination"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import {
  buildMarketHref,
  formatBps,
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

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
  usePagination,
  pageSize,
}: BorrowerMarketsTableProps) => {
  const { t } = useTranslation()

  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: pageSize ?? 10,
    page: 0,
  })

  React.useEffect(() => {
    if (usePagination) {
      setPaginationModel((prevState) => ({ ...prevState, page: 0 }))
    }
  }, [assetFilter, statusFilter, nameFilter])

  const paginationProps = React.useMemo(() => {
    if (usePagination) {
      return {
        hideFooter: false,
        paginationModel,
        onPaginationModelChange: setPaginationModel,
        slots: {
          pagination: TablePagination,
        },
      }
    }
    return {}
  }, [usePagination, paginationModel, setPaginationModel])

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
      renderHeader: () => (
        <ColumnHeaderTitle
          title={t("borrowerMarketList.table.header.status")}
        />
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      renderHeader: () => (
        <ColumnHeaderTitle
          title={t("borrowerMarketList.table.header.marketName")}
        />
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {params.value}
          </span>
        </Link>
      ),
    },
    {
      field: "marketType",
      headerName: t("borrowerMarketList.table.header.marketType"),
      maxWidth: 146,
      minWidth: 130,
      flex: 2,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
      sortable: true,
      renderHeader: () => (
        <ColumnHeaderTitle
          title={t("borrowerMarketList.table.header.marketType")}
        />
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <Box width={130}>
            <MarketTypeChip {...params.value} />
          </Box>
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
      renderHeader: () => (
        <ColumnHeaderTitle title={t("borrowerMarketList.table.header.asset")} />
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      renderHeader: () => (
        <ColumnHeaderTitle title={t("borrowerMarketList.table.header.apr")} />
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
        <ColumnHeaderTitle
          title={t("borrowerMarketList.table.header.crr")}
          tooltipText="The percentage of market funds kept unborrowed and locked as reserve."
        />
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      renderHeader: () => (
        <ColumnHeaderTitle
          title={t("borrowerMarketList.table.header.capacity")}
        />
      ),
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      renderHeader: () => (
        <ColumnHeaderTitle
          title={t("borrowerMarketList.table.header.borrowable")}
        />
      ),
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      renderHeader: () => (
        <ColumnHeaderTitle
          title={t("borrowerMarketList.table.header.deploy")}
        />
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      chainId,
    } = market

    const marketStatus = getMarketStatusChip(market)
    const marketType = getMarketTypeChip(market)

    return {
      id: address,
      chainId,
      status: marketStatus,
      marketType,
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
            ...(usePagination
              ? {
                  "& .MuiDataGrid-footerContainer": {
                    "& .MuiToolbar-root": {
                      padding: "32px 0 6px",
                    },
                  },
                }
              : {}),
          }}
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(paginationProps as any)}
        />
      )}
    </Accordion>
  )
}
