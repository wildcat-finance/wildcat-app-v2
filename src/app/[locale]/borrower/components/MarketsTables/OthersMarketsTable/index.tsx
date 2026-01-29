import * as React from "react"
import { useEffect } from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Button,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { TablePagination } from "@/components/TablePagination"
import { TooltipButton } from "@/components/TooltipButton"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import {
  formatBps,
  formatTokenWithCommas,
  timestampToDateFormatted,
  trimAddress,
  buildMarketHref,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

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
    pageSize: 10,
    page: 0,
  })

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
      flex: 1.7,
      minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <span
            style={{
              width: "100%",
              paddingRight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
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
      field: "borrowerName",
      headerName: t("borrowerMarketList.table.header.borrowerName"),
      minWidth: 134,
      flex: 1.7,
      headerAlign: "left",
      align: "left",
      renderHeader: () => (
        <Typography
          variant="text4"
          sx={{
            lineHeight: "10px",
            color: COLORS.santasGrey,
            padding: "0 12px",
          }}
        >
          Borrower
        </Typography>
      ),
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Link
            href={`${ROUTES.borrower.profile}/${params.row.borrowerAddress}`}
            style={{
              textDecoration: "none",
              width: "fit-content",
              height: "fit-content",
            }}
          >
            <Button
              size="small"
              variant="text"
              sx={{
                fontSize: pxToRem(13),
                lineHeight: lh(20, 13),
                fontWeight: 500,
                minWidth: "fit-content",
                width: "fit-content",
              }}
            >
              {params.value}
            </Button>
          </Link>
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
        <Box display="flex" columnGap="4px" alignItems="center">
          <Typography
            variant="text4"
            sx={{ lineHeight: "10px", color: COLORS.santasGrey }}
          >
            CRR
          </Typography>
          <TooltipButton value="The percentage of market funds kept unborrowed and locked as reserve." />
        </Box>
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
      borrower: borrowerAddress,
      name,
      underlyingToken,
      annualInterestBips,
      reserveRatioBips,
      maxTotalSupply,
      borrowableAssets,
      deployedEvent,
      chainId,
    } = market

    const borrower = borrowersData?.find(
      (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
    )
    const borrowerName = borrower
      ? borrower.alias || borrower.name
      : trimAddress(borrowerAddress)
    const marketStatus = getMarketStatusChip(market)
    const marketType = getMarketTypeChip(market)

    return {
      id: address,
      chainId,
      status: marketStatus,
      marketType,
      name,
      borrowerName,
      borrowerAddress,
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
            height: "626px",

            overflow: "auto",
            maxWidth: "calc(100vw - 267px)",
            padding: "0 16px",
            "& .MuiDataGrid-columnHeader": { padding: 0 },
            "& .MuiDataGrid-cell": { padding: "0px" },

            "& .MuiDataGrid-row": {
              "& > a:hover": {
                backgroundColor: "transparent",
              },
            },

            "& .MuiDataGrid-footerContainer": {
              "& .MuiToolbar-root": {
                padding: "32px 0 6px",
              },
            },
          }}
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
          hideFooter={false}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          slots={{
            pagination: TablePagination,
          }}
        />
      )}
    </Accordion>
  )
}
