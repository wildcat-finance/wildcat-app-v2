"use client"

import { Box, Button, Divider, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

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
  ContentContainer,
  MarketParametersContainer,
  MarketParametersRowContainer,
  MarketParametersRowsDivider,
  ProfileHeaderButton,
  ProfileHeaderContainer,
} from "./style"

export default function BorrowerPage() {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()

  const mocks = [
    {
      id: "Market1",
      name: "Market name",
      status: "Penalty",
      asset: "ETH",
      lenderAPR: "12",
      crr: "12",
      type: "Type",
      lend: "10,000.00",
      debt: "10,000.00",
      kyc: "10,000.00",
      keyring: "10,000.00",
      deployed: "28-12-2023 21:36",
    },
    {
      id: "Market1",
      name: "Market name",
      status: "Penalty",
      asset: "ETH",
      lenderAPR: "12",
      crr: "12",
      type: "Type",
      lend: "10,000.00",
      debt: "10,000.00",
      kyc: "10,000.00",
      keyring: "10,000.00",
      deployed: "28-12-2023 21:36",
    },
    {
      id: "Market1",
      name: "Market name",
      status: "Penalty",
      asset: "ETH",
      lenderAPR: "12",
      crr: "12",
      type: "Type",
      lend: "10,000.00",
      debt: "10,000.00",
      kyc: "10,000.00",
      keyring: "10,000.00",
      deployed: "28-12-2023 21:36",
    },
    {
      id: "Market1",
      name: "Market name",
      status: "Penalty",
      asset: "ETH",
      lenderAPR: "12",
      crr: "12",
      type: "Type",
      lend: "10,000.00",
      debt: "10,000.00",
      kyc: "10,000.00",
      keyring: "10,000.00",
      deployed: "28-12-2023 21:36",
    },
    {
      id: "Market1",
      name: "Market name",
      status: "Penalty",
      asset: "ETH",
      lenderAPR: "12",
      crr: "12",
      type: "Type",
      lend: "10,000.00",
      debt: "10,000.00",
      kyc: "10,000.00",
      keyring: "10,000.00",
      deployed: "28-12-2023 21:36",
    },
  ]

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("borrowerMarketList.table.header.marketName"),
      flex: 4,
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </span>
      ),
    },
    {
      field: "status",
      headerName: t("borrowerMarketList.table.header.status"),
      minWidth: 150,
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
    },
    {
      field: "debt",
      headerName: "Total Debt",
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
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
          {params.value}
        </Typography>
      ),
      flex: 2,
    },
  ]

  return (
    <Box sx={ContentContainer}>
      <Box sx={ProfileHeaderContainer}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="title1">Wintermute LLC</Typography>
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
        </Box>

        <Typography
          variant="text2"
          color={COLORS.santasGrey}
          sx={{ display: "inline-block", width: "586px" }}
        >
          – leading global algorithmic trading firm and one of the largest
          players in digital asset markets. With an average daily trading volume
          of over $5bn.
        </Typography>
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box marginBottom="44px">
        <Typography variant="title3">Active Markets</Typography>
        <DataGrid
          sx={{
            maxHeight:
              "calc(100vh - 43px - 43px - 52px - 92px - 64px - 314px);",
            overflow: "auto",
          }}
          rows={mocks}
          columns={columns}
        />
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
            <MarketParametersItem title="Markets" value="7" />
            <Divider sx={MarketParametersRowsDivider} />

            <MarketParametersItem title="Markets" value="12 ETH" />
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
