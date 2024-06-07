import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { DataGrid, GridColDef, GridRowParams } from "@mui/x-data-grid"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipIcon } from "@/components/InputLabel/style"
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
} from "@/utils/formatters"
import { getMarketStatus } from "@/utils/marketStatus"

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
          <Tooltip title="TBD" placement="right">
            <SvgIcon fontSize="small" sx={TooltipIcon}>
              <Question />
            </SvgIcon>
          </Tooltip>
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
        <Box display="flex" flexDirection="column" padding="32px 16px">
          <Typography variant="title3">{noMarketsTitle}</Typography>
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            {noMarketsSubtitle}
          </Typography>
        </Box>
      )}
      {tableData.length === 0 && !isLoading && !defaultFilters && (
        <Box display="flex" flexDirection="column" padding="32px 16px">
          <Typography variant="title3">
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
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
          onRowClick={handleRowClick}
        />
      )}
    </Accordion>
  )
}
