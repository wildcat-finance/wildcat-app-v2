import { useState } from "react"

import {
  Box,
  Button,
  IconButton,
  Link,
  SvgIcon,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import { Accordion } from "@/components/Accordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { MarketAuthorisedLendersProps } from "./interface"
import {
  DataGridCells,
  MarketLendersMLA,
  MarketWithdrawalRequestsContainer,
  MarketWithdrawalRequetstCell,
  MLATableButton,
} from "./style"
import Copy from "../../../../../../../assets/icons/copy_icon.svg"
import LinkIcon from "../../../../../../../assets/icons/link_icon.svg"
import { useGetAuthorisedLendersByMarket } from "../../hooks/useGetLenders"

export const MarketAuthorisedLenders = ({
  market,
}: MarketAuthorisedLendersProps) => {
  const [state, copyToClipboard] = useCopyToClipboard()
  const [lendersName, setLendersName] = useState<{ [key: string]: string }>(
    JSON.parse(localStorage.getItem("lenders-name") || "{}"),
  )

  const { data } = useGetAuthorisedLendersByMarket(market)
  const { t } = useTranslation()
  const rows = data
    ? data?.map((lender) => ({
        id: lender,
        name: (() => {
          const correctLender = lendersName[lender] || ""
          return { name: correctLender, address: lender }
        })(),
        walletAddress: lender,
        dateAdded: "12-Jul-2023",
        signedMLA: "Yes",
        signDate: "13-Jul-2023",
        MLA: "View|Download",
      }))
    : []

  const columns: GridColDef[] = [
    {
      sortable: false,
      field: "name",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.name",
      ),
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <LenderName
          setLendersName={setLendersName}
          lenderName={params.value.name}
          address={params.value.address}
        />
      ),
    },
    {
      sortable: false,
      field: "walletAddress",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.walletAddress",
      ),
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography sx={{ minWidth: "80px" }} variant="text3">
            {trimAddress(value)}
          </Typography>
          <IconButton
            disableRipple
            sx={AddressButtons}
            onClick={() => {
              copyToClipboard(value)
            }}
          >
            <SvgIcon fontSize="medium">
              <Copy />
            </SvgIcon>
          </IconButton>
          <Link
            href={`${EtherscanBaseUrl}/address/${value}`}
            target="_blank"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <IconButton disableRipple sx={AddressButtons}>
              <SvgIcon fontSize="medium">
                <LinkIcon />
              </SvgIcon>
            </IconButton>
          </Link>
        </Box>
      ),
    },
    {
      sortable: false,
      field: "dateAdded",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.dateAdded",
      ),
      minWidth: 124,
      headerAlign: "left",
      align: "left",
    },
    {
      sortable: false,
      field: "signedMLA",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.signedMLA",
      ),
      width: 96,
      headerAlign: "left",
      align: "left",
    },
    {
      sortable: false,
      field: "signDate",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.signDate",
      ),
      minWidth: 80,
      headerAlign: "left",
      align: "left",
    },
    {
      sortable: false,
      field: "MLA",
      headerName: t("borrowerMarketDetails.authorisedLenders.tableHeaders.MLA"),
      minWidth: 130,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: ({ value }) =>
        value ? (
          <Box sx={MarketLendersMLA}>
            <Button sx={MLATableButton}>
              {t("borrowerMarketDetails.authorisedLenders.buttons.view")}
            </Button>
            <Box
              sx={{
                border: "1px solid",
                height: "20px",
                borderColor: COLORS.athensGrey,
              }}
            />
            <Button sx={MLATableButton}>
              {t("borrowerMarketDetails.authorisedLenders.buttons.download")}
            </Button>
          </Box>
        ) : (
          <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
            Not signed yet
          </Typography>
        ),
    },
  ]

  return (
    <Box sx={MarketWithdrawalRequestsContainer} id="lenders">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="title3">
          {" "}
          {t("borrowerMarketDetails.authorisedLenders.header")}
        </Typography>
        <Button sx={{ border: "1px solid", borderColor: COLORS.whiteLilac }}>
          {t("borrowerMarketDetails.authorisedLenders.buttons.editList")}
        </Button>
      </Box>

      <DataGrid
        sx={DataGridCells}
        rows={rows}
        columns={columns}
        columnHeaderHeight={40}
      />
      <Accordion
        sx={{
          flexDirection: "row-reverse",
          justifyContent: "flex-end",
        }}
        iconContainerSx={{
          width: "fit-content",
        }}
        summarySx={{ color: COLORS.blueRibbon }}
        iconColor={COLORS.blueRibbon}
        title="Deleted Lenders"
      >
        <DataGrid
          sx={DataGridCells}
          rows={rows}
          columns={columns}
          columnHeaderHeight={0}
        />
      </Accordion>
    </Box>
  )
}
