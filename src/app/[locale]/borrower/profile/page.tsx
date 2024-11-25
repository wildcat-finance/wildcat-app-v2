"use client"

import * as React from "react"

import {
  Box,
  Button,
  Divider,
  Skeleton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"
import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketParametersItem } from "@/components/MarketParameters/components/MarketParametersItem"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"
import {
  capacityComparator,
  dateComparator,
  percentComparator,
  statusComparator,
} from "@/utils/comparators"
import {
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"

import {
  ContentContainer,
  MarketParametersContainer,
  MarketParametersRowContainer,
  MarketParametersRowsDivider,
  ProfileHeaderButton,
} from "./style"

export default function BorrowerPage() {
  const { t } = useTranslation()
  const { data: borrowerMarkets, isLoading } = useGetBorrowerMarkets()

  const rows: GridRowsProp = (borrowerMarkets ?? []).map((market) => {
    const {
      address,
      name,
      underlyingToken,
      annualInterestBips,
      reserveRatioBips,
      deployedEvent,
      maximumDeposit,
      totalBorrowed,
    } = market

    const marketStatus = getMarketStatusChip(market)

    return {
      id: address,
      name,
      status: marketStatus,
      asset: underlyingToken.symbol,
      lenderAPR: annualInterestBips,
      crr: reserveRatioBips,
      type: "Type",
      lend: maximumDeposit,
      debt: totalBorrowed,
      kyc: "10,000.00",
      keyring: "10,000.00",
      deployed: deployedEvent ? deployedEvent.blockTimestamp : 0,
    }
  })

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("borrowerMarketList.table.header.marketName"),
      flex: 3,
      minWidth: 152,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "136px",
          }}
        >
          {value}
        </span>
      ),
    },
    {
      field: "status",
      headerName: t("borrowerMarketList.table.header.status"),
      minWidth: 120,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => <MarketStatusChip status={params.value} />,
      flex: 1,
    },
    {
      field: "asset",
      headerName: t("borrowerMarketList.table.header.asset"),
      minWidth: 151,
      headerAlign: "right",
      align: "right",
      flex: 2,
    },
    {
      field: "lenderAPR",
      headerName: t("borrowerMarketList.table.header.apr"),
      minWidth: 106,
      headerAlign: "right",
      align: "right",
      sortComparator: percentComparator,
      flex: 1,
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
      flex: 1,
    },
    {
      field: "type",
      headerName: "Market Type",
      minWidth: 120,
      headerAlign: "right",
      align: "right",
      sortComparator: capacityComparator,
      flex: 1.5,
    },
    {
      field: "lend",
      headerName: "Available to Lend",
      minWidth: 130,
      headerAlign: "right",
      align: "right",
      sortComparator: capacityComparator,
      flex: 2,
      renderCell: (params) =>
        params.value
          ? formatTokenWithCommas(params.value, {
              withSymbol: false,
              fractionDigits: 2,
            })
          : "0",
    },
    {
      field: "debt",
      headerName: "Total Debt",
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
      renderCell: (params) =>
        params.value
          ? formatTokenWithCommas(params.value, {
              withSymbol: false,
              fractionDigits: 2,
            })
          : "0",
    },
    {
      field: "kyc",
      headerName: "KYC Options",
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
    },
    {
      field: "keyring",
      headerName: "Keyring",
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
    },
    {
      field: "deployed",
      headerName: "Deployed",
      minWidth: 126,
      headerAlign: "right",
      align: "right",
      sortComparator: dateComparator,
      renderCell: (params) => (
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {timestampToDateFormatted(params.value)}
        </Typography>
      ),
      flex: 2,
    },
  ]

  return (
    <Box sx={ContentContainer}>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <SvgIcon sx={{ fontSize: "48px", marginBottom: "24px" }}>
          <Avatar />
        </SvgIcon>

        <Typography variant="title1" sx={{ marginBottom: "12px" }}>
          Wintermute LLC
        </Typography>

        <Typography
          variant="text2"
          color={COLORS.santasGrey}
          sx={{
            display: "inline-block",
            maxWidth: "586px",
            marginBottom: "22px",
          }}
        >
          – leading global algorithmic trading firm and one of the largest
          players in digital asset markets. With an average daily trading volume
          of over $5bn.
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box display="flex" gap="6px">
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              sx={ProfileHeaderButton}
            >
              Website
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="secondary"
              sx={ProfileHeaderButton}
            >
              Twitter
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="secondary"
              sx={ProfileHeaderButton}
            >
              Linkedin
            </Button>
          </Box>

          <Button
            variant="text"
            size="small"
            sx={{ gap: "4px", alignItems: "center" }}
          >
            <SvgIcon
              fontSize="medium"
              sx={{
                "& path": {
                  fill: `${COLORS.greySuit}`,
                  transition: "fill 0.2s",
                },
              }}
            >
              <Edit />
            </SvgIcon>
            Edit Profile
          </Button>
        </Box>
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box marginBottom="44px">
        <Typography variant="title3">Active Markets</Typography>
        {!isLoading && (
          <DataGrid
            sx={{
              marginTop: "12px",
              overflow: "auto",
              "& .MuiDataGrid-columnHeader": { padding: 0 },
              "& .MuiDataGrid-cell": { padding: "0px" },
            }}
            rows={rows}
            columns={columns}
          />
        )}
        {isLoading && (
          <Box
            marginTop="30px"
            display="flex"
            flexDirection="column"
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
      </Box>

      <Box>
        <Typography variant="title3">Overall Info</Typography>

        <Box sx={MarketParametersContainer}>
          <Box sx={MarketParametersRowContainer}>
            <MarketParametersItem
              title="Legal Name"
              value="Wintermute"
              link="Wintermute"
            />
            <Divider sx={MarketParametersRowsDivider} />

            <MarketParametersItem title="Headquarters" value="London" />
            <Divider sx={MarketParametersRowsDivider} />

            <MarketParametersItem title="Founded" value="2017" />
            <Divider sx={MarketParametersRowsDivider} />
          </Box>

          <Box sx={MarketParametersRowContainer}>
            <MarketParametersItem
              title="Markets"
              value={!isLoading ? (borrowerMarkets ?? []).length : "Loading..."}
            />
            <Divider sx={MarketParametersRowsDivider} />

            <MarketParametersItem title="Total amount borrowed" value="12" />
            <Divider sx={MarketParametersRowsDivider} />

            <MarketParametersItem
              title="Defaults"
              value="0"
              tooltipText="TBD"
            />
            <Divider sx={MarketParametersRowsDivider} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
