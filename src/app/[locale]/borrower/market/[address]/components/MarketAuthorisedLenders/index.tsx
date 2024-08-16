import { useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  Divider,
  IconButton,
  Link,
  Skeleton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import { useGetAuthorisedLendersByMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useGetLenders"
import {
  SkeletonContainer,
  SkeletonStyle,
} from "@/app/[locale]/borrower/market/[address]/style"
import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { Accordion } from "@/components/Accordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import {
  DATE_FORMAT,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"

import { MarketAuthorisedLendersProps } from "./interface"
import {
  DataGridCells,
  MarketLendersMLA,
  MarketWithdrawalRequestsContainer,
  MarketWithdrawalRequetstCell,
  MLATableButton,
} from "./style"

export const MarketAuthorisedLenders = ({
  market,
}: MarketAuthorisedLendersProps) => {
  const hasMLA = 0 // test const for hoiding/showing MLA columns in table

  const [state, copyToClipboard] = useCopyToClipboard()
  const [lendersName, setLendersName] = useState<{ [key: string]: string }>(
    JSON.parse(localStorage.getItem("lenders-name") || "{}"),
  )

  const { data, isLoading } = useGetAuthorisedLendersByMarket(market)
  const { t } = useTranslation()
  const lendersRows = data
    ? data?.map((lender) => ({
        id: lender.lender,
        authorized: lender.authorized,
        name: (() => {
          const correctLender = lendersName[lender.lender.toLowerCase()] || ""
          return { name: correctLender, address: lender.lender }
        })(),
        walletAddress: lender.lender,
        dateAdded: timestampToDateFormatted(
          lender.changes[0].blockTimestamp,
          DATE_FORMAT,
        ),
        signedMLA: "Yes",
        signDate: timestampToDateFormatted(
          lender.changes[0].blockTimestamp,
          DATE_FORMAT,
        ),
        MLA: "View|Download",
      }))
    : []

  const authorizedRows = lendersRows?.filter((row) => row.authorized)
  const deauthorizedRows = lendersRows?.filter((row) => !row.authorized)

  const commonColumns: GridColDef[] = [
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
      flex: 2,
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
      flex: 2,
    },
    {
      sortable: false,
      field: "dateAdded",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.dateAdded",
      ),
      minWidth: 124,
      headerAlign: hasMLA ? "left" : "right",
      align: hasMLA ? "left" : "right",
      flex: 1.5,
    },
  ]

  const mlaColumns: GridColDef[] = [
    {
      sortable: false,
      field: "signedMLA",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.signedMLA",
      ),
      width: 96,
      headerAlign: "left",
      align: "left",
      flex: 1.5,
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
      flex: 1.5,
    },
    {
      sortable: false,
      field: "MLA",
      headerName: t("borrowerMarketDetails.authorisedLenders.tableHeaders.MLA"),
      minWidth: 130,
      flex: 2,
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

  const columns: GridColDef[] = hasMLA
    ? [...commonColumns, ...mlaColumns]
    : commonColumns

  if (isLoading) {
    return (
      <Box sx={MarketWithdrawalRequestsContainer} id="lenders">
        <Typography variant="title3" sx={{ height: "38px" }}>
          {t("borrowerMarketDetails.authorisedLenders.header")}
        </Typography>

        <Box sx={SkeletonContainer} flexDirection="column" gap="20px">
          <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
          <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
          <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
          <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={MarketWithdrawalRequestsContainer} id="lenders">
      {lendersRows.length === 0 && (
        <Box display="flex" flexDirection="column">
          <Typography variant="title3" sx={{ marginBottom: "8px" }}>
            No lenders yet
          </Typography>
          <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
            There is no any lenders yet – edit list to add them
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{
              width: "100px",
              height: "32px",
              marginTop: "24px",
              borderRadius: 2,
            }}
          >
            Edit List
          </Button>
        </Box>
      )}

      {authorizedRows.length === 0 && lendersRows.length !== 0 && (
        <Box display="flex" flexDirection="column">
          <Typography variant="title3" sx={{ marginBottom: "8px" }}>
            {t("borrowerMarketDetails.authorisedLenders.header")}
          </Typography>
          <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
            No active lenders yet – edit list to add them
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{
              width: "100px",
              height: "32px",
              marginTop: "24px",
              borderRadius: 2,
            }}
          >
            Edit List
          </Button>
        </Box>
      )}

      {authorizedRows.length !== 0 && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="title3">
              {t("borrowerMarketDetails.authorisedLenders.header")}
            </Typography>
            <Button
              sx={{ border: "1px solid", borderColor: COLORS.whiteLilac }}
            >
              {t("borrowerMarketDetails.authorisedLenders.buttons.editList")}
            </Button>
          </Box>
          <DataGrid
            sx={{
              ...DataGridCells,
              "& .MuiDataGrid-columnHeader": {
                marginBottom: "6px",
                padding: "0 8px",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontSize: 11,
              },
            }}
            rows={authorizedRows}
            columns={columns}
            columnHeaderHeight={40}
          />
        </>
      )}

      {deauthorizedRows.length !== 0 && (
        <>
          {authorizedRows.length === 0 && <Divider sx={{ margin: "32px 0" }} />}

          <Accordion
            open={authorizedRows.length === 0}
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
              sx={{
                ...DataGridCells,
                "& .MuiDataGrid-columnHeader": {
                  marginBottom: "6px",
                  padding: "0 8px",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontSize: 11,
                },
              }}
              rows={deauthorizedRows}
              columns={columns}
              columnHeaderHeight={authorizedRows.length === 0 ? 40 : 0}
            />
          </Accordion>
        </>
      )}
    </Box>
  )
}
