import { useState } from "react"

import { SvgIcon, Typography } from "@mui/material"
import { Box } from "@mui/system"
import { DataGrid, GridColDef, GridRowHeightParams } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import Cross from "@/assets/icons/cross_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { mockLendersData } from "@/mocks/mocks"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { MarketWithdrawalRequetstCell } from "./style"

export const EditLendersTable = () =>
  //   {
  //        rows,
  //        columns,
  //   }: {
  //        rows: {
  //          isAuth: boolean
  //          address: string
  //          markets: {
  //            marketName: string
  //            address: string
  //          }[]
  //        }[]
  //        columns: GridColDef[]
  //   },
  {
    const { t } = useTranslation()

    const [lendersName, setLendersName] = useState<{ [key: string]: string }>(
      JSON.parse(localStorage.getItem("lenders-name") || "{}"),
    )

    const idMocks = mockLendersData.map((item) => ({
      ...item,
      id: item.address,
      name: (() => {
        const correctLender = lendersName[item.address.toLowerCase()] || ""
        return { name: correctLender, address: item.address }
      })(),
    }))

    const columns: GridColDef[] = [
      {
        field: "name",
        disableColumnMenu: true,
        headerName: "Name",
        minWidth: 160,
        headerAlign: "left",
        align: "left",
        renderCell: (params) => (
          <LenderName
            setLendersName={setLendersName}
            lenderName={params.value.name}
            address={params.value.address}
          />
        ),
        flex: 1.5,
      },
      {
        field: "address",
        headerName: "Wallet Address",
        minWidth: 176,
        headerAlign: "left",
        align: "left",
        renderCell: ({ value }) => (
          <Box sx={MarketWithdrawalRequetstCell}>
            <Typography sx={{ minWidth: "80px" }} variant="text3">
              {trimAddress(value)}
            </Typography>

            <LinkGroup
              linkValue={`${EtherscanBaseUrl}/address/${value}`}
              copyValue={value}
            />
          </Box>
        ),
        flex: 2,
      },
      {
        field: "assignedAll",
        disableColumnMenu: true,
        headerName: "Assigned to All",
        minWidth: 160,
        headerAlign: "left",
        align: "left",
        renderCell: (params) => (
          <ExtendedCheckbox
            sx={{
              "& ::before": {
                transform: "translate(-3px, -3px) scale(0.75)",
              },
            }}
          />
        ),
        flex: 1,
      },
      {
        sortable: true,
        field: "markets",
        headerName: "Assigned to Markets",
        minWidth: 300,
        headerAlign: "left",
        align: "left",
        flex: 4,
        display: "flex",
        renderCell: ({ value }) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: "4px",
              width: "300px",
              flexWrap: "wrap",
              border: `1px solid ${COLORS.whiteLilac}`,
              borderRadius: "8px",
              boxSizing: "border-box",
            }}
          >
            {value.map((market: { marketName: string; address: string }) => (
              <LendersMarketChip marketName={market.marketName} />
            ))}
          </Box>
        ),
      },
      {
        sortable: false,
        field: "",
        width: 24,
        renderCell: () => (
          <SvgIcon>
            <Cross />
          </SvgIcon>
        ),
      },
    ]
    return (
      <DataGrid getRowHeight={() => "auto"} rows={idMocks} columns={columns} />
    )
  }
