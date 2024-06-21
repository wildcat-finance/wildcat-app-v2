import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef, GridRowParams } from "@mui/x-data-grid"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

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
  secondsToDays,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatus } from "@/utils/marketStatus"

import { OthersMarketsTableProps } from "./interface"

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
  const router = useRouter()

  const columns: GridColDef[] = [
    {
      field: "status",
      headerName: t("borrowerMarketList.table.header.status"),
      minWidth: 150,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => <MarketStatusChip status={params.value} />,
    },
    {
      field: "name",
      headerName: t("borrowerMarketList.table.header.marketName"),
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </span>
      ),
    },
    {
      field: "borrowerName",
      headerName: t("borrowerMarketList.table.header.borrowerName"),
      width: 155,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "asset",
      headerName: t("borrowerMarketList.table.header.asset"),
      minWidth: 151,
      headerAlign: "right",
      align: "right",
    },
    {
      field: "lenderAPR",
      headerName: t("borrowerMarketList.table.header.apr"),
      minWidth: 106,
      headerAlign: "right",
      align: "right",
      sortComparator: percentComparator,
    },
    {
      field: "crr",
      headerName: t("borrowerMarketList.table.header.crr"),
      minWidth: 85,
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
    },
    {
      field: "maxCapacity",
      headerName: t("borrowerMarketList.table.header.capacity"),
      minWidth: 136,
      headerAlign: "right",
      align: "right",
      sortComparator: capacityComparator,
    },
    {
      field: "borrowable",
      headerName: t("borrowerMarketList.table.header.borrowable"),
      minWidth: 104,
      headerAlign: "right",
      align: "right",
    },
    {
      field: "deploy",
      headerName: t("borrowerMarketList.table.header.deploy"),
      minWidth: 114,
      headerAlign: "right",
      align: "right",
      sortComparator: dateComparator,
      renderCell: (params) => (
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {params.value}
        </Typography>
      ),
    },
  ]

  const rows = tableData.map((market) => {
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
      timeDelinquent,
      delinquencyGracePeriod,
      isClosed,
      isIncurringPenalties,
      isDelinquent,
    } = market

    const borrower = borrowersData?.find(
      (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
    )
    const borrowerName = borrower ? borrower.name : trimAddress(borrowerAddress)
    const delinquencyPeriod =
      timeDelinquent > delinquencyGracePeriod
        ? 0
        : delinquencyGracePeriod - timeDelinquent
    const penaltyPeriod = timeDelinquent - delinquencyGracePeriod
    const marketStatus = {
      status: getMarketStatus(isClosed, isDelinquent, isIncurringPenalties),
      healthyPeriod: secondsToDays(Math.abs(timeDelinquent)),
      penaltyPeriod: secondsToDays(penaltyPeriod),
      delinquencyPeriod: secondsToDays(delinquencyPeriod),
    }

    return {
      id: address,
      status: marketStatus,
      name,
      borrowerName,
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

  const handleRowClick = (params: GridRowParams) => {
    router.push(`${ROUTES.borrower.market}/${params.row.id}`)
  }

  const defaultFilters =
    assetFilter === SidebarMarketAssets.ALL &&
    statusFilter === "All" &&
    nameFilter === ""

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
        <Box display="flex" flexDirection="column" padding="32px 16px">
          <Typography variant="title3">
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
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
          onRowClick={handleRowClick}
        />
      )}
    </Accordion>
  )
}
