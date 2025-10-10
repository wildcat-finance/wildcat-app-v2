/* eslint-disable no-nested-ternary */

"use client"

import * as React from "react"

import {
  Box,
  Button,
  Divider,
  IconButton,
  Skeleton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { LenderRole, MarketVersion } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import {
  SkeletonContainer,
  SkeletonStyle,
} from "@/app/[locale]/borrower/market/[address]/style"
import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { Accordion } from "@/components/Accordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { EtherscanBaseUrl } from "@/config/network"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  DATE_FORMAT,
  formatBlockTimestamp,
  timestampToDateFormatted,
  TOKEN_FORMAT_DECIMALS,
  trimAddress,
} from "@/utils/formatters"

import { MarketAuthorisedLendersProps } from "./interface"
import {
  DataGridCells,
  MarketLendersMLA,
  MarketWithdrawalRequestsContainer,
  MarketWithdrawalRequetstCell,
  MLATableButton,
  NumberOfLenders,
} from "./style"
import { useGetMarketLenders } from "../../hooks/useGetMarketLenders"
import { ForceBuyBackModal } from "../Modals/ForceBuyBackModal"

export const MarketAuthorisedLenders = ({
  market,
  marketAccount,
}: MarketAuthorisedLendersProps) => {
  const editLendersLink = market
    ? `${ROUTES.borrower.policy}?policy=${encodeURIComponent(
        market?.hooksConfig?.hooksAddress ?? market?.controller ?? "",
      )}`
    : ROUTES.borrower.lendersList

  const hasMLA = 0 // test const for hoiding/showing MLA columns in table

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const [state, copyToClipboard] = useCopyToClipboard()

  const { data, isLoading } = useGetMarketLenders(market)
  const { t } = useTranslation()
  const lendersRows = data
    ? data?.map((lender) => {
        const lenderData = {
          id: lender.address,
          balance:
            market?.marketToken
              .getAmount(market?.normalizeAmount(lender.scaledBalance))
              .format(TOKEN_FORMAT_DECIMALS, true) ?? "0",
          role: lender.inferredRole,
          isDeauthorized:
            market?.version === MarketVersion.V2
              ? lender.credential !== undefined && !lender.hasValidCredential
              : lender.isAuthorizedOnController !== undefined &&
                (lender.role === LenderRole.Null ||
                  lender.role === LenderRole.WithdrawOnly),
          // lender.isAuthorizedOnController === false ||
          // (lender.role !== undefined &&
          //   lender.role !== LenderRole.DepositAndWithdraw) ||
          // (lender.credentialExpiry !== undefined &&
          //   !lender.hasValidCredential),
          accessLevel:
            lender.inferredRole === LenderRole.DepositAndWithdraw
              ? "Deposit & Withdraw"
              : lender.inferredRole === LenderRole.WithdrawOnly
                ? "Withdraw Only"
                : lender.inferredRole === LenderRole.Blocked
                  ? "Blocked From Deposits"
                  : lender.credential !== undefined
                    ? !lender.hasValidCredential &&
                      lender.credentialExpiry !== undefined &&
                      lender.credentialExpiry < Date.now()
                      ? "Credential Expired"
                      : "Provider Removed"
                    : "Unknown", // @todo

          accessExpiry: lender.credentialExpiry
            ? formatBlockTimestamp(lender.credentialExpiry, {
                year: "numeric",
                hour: undefined,
                minute: undefined,
              })
            : "Never", // @todo
          name: (() => {
            const correctLender =
              lendersNames[lender.address.toLowerCase()] || ""
            return { name: correctLender, address: lender.address }
          })(),
          walletAddress: lender.address,
          dateAdded: timestampToDateFormatted(
            lender.addedTimestamp,
            DATE_FORMAT,
          ),
          signedMLA: "Yes",
          signDate: timestampToDateFormatted(
            lender.addedTimestamp,
            DATE_FORMAT,
          ),
          MLA: "View|Download",
          raw: lender,
        }
        console.log(`Market Version: ${market.version}`)
        console.log(
          `market requires access for deposit: ${market.hooksConfig?.depositRequiresAccess}`,
        )
        console.log(`can deposit: ${lender.canDeposit}`)
        // console.log(
        //   `is deauthorized on controller: ${
        //     lender.isAuthorizedOnController === false
        //   }`,
        // )
        // console.log(
        //   `role not undefined, not deposit and withdraw: ${
        //     lender.role !== undefined &&
        //     lender.role !== LenderRole.DepositAndWithdraw
        //   }`,
        // )
        // console.log(
        //   `expiry defined but expired: ${
        //     lender.credentialExpiry !== undefined && !lender.hasValidCredential
        //   }`,
        // )
        return lenderData
      })
    : []

  const authorizedRows = lendersRows?.filter((row) => !row.isDeauthorized)
  const deauthorizedRows = lendersRows?.filter((row) => row.isDeauthorized)

  const commonColumns: GridColDef[] = [
    {
      sortable: false,
      field: "name",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.name",
      ),
      minWidth: 146,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => <LenderName address={params.value.address} />,
      flex: 1,
    },
    {
      sortable: false,
      field: "walletAddress",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.walletAddress",
      ),
      minWidth: 146,
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
      flex: 1,
    },
    {
      sortable: true,
      field: "balance",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.balance",
      ),
      renderHeader: () => (
        <Typography variant="text4" color={COLORS.santasGrey}>
          {t("borrowerMarketDetails.authorisedLenders.tableHeaders.balance")},{" "}
          <span style={{ color: COLORS.ultramarineBlue }}>
            {market.underlyingToken.symbol}
          </span>
        </Typography>
      ),
      minWidth: 142,
      headerAlign: "left",
      align: "left",
      flex: 2,
      renderCell: ({ value }) => {
        const number = parseFloat(value.split(" ")[0].replace(/,/g, "")) || 0
        return (
          <span style={{ width: "100%", whiteSpace: "normal" }}>
            {number.toLocaleString()}
          </span>
        )
      },
      sortComparator: (v1, v2) => {
        const num1 = parseFloat(v1.split(" ")[0].replace(/,/g, "")) || 0
        const num2 = parseFloat(v2.split(" ")[0].replace(/,/g, "")) || 0
        return num1 - num2
      },
    },
    {
      sortable: false,
      field: "accessLevel",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.accessLevel",
      ),
      minWidth: 104,
      headerAlign: "left",
      align: "left",
      flex: 1,
      renderCell: ({ value }) => (
        <Box
          sx={{
            height: "60px",
            display: "flex",
            padding: "12px 0",
            gap: "2px",
            flexDirection: "column",
          }}
        >
          {value === "Deposit & Withdraw" && (
            <Box
              sx={{
                width: "fit-content",
                height: "fit-content",
                padding: "2px 6px",
                borderRadius: "6px",
                bgcolor: COLORS.blackHaze,
              }}
            >
              <Typography variant="text4">Deposit</Typography>
            </Box>
          )}
          {value === ("Deposit & Withdraw" || "Withdraw Only") && (
            <Box
              sx={{
                width: "fit-content",
                height: "fit-content",
                padding: "2px 6px",
                borderRadius: "6px",
                bgcolor: COLORS.blackHaze,
              }}
            >
              <Typography variant="text4">Withdraw</Typography>
            </Box>
          )}
          {value === "Blocked From Deposits" && (
            <Box
              sx={{
                width: "fit-content",
                height: "fit-content",
                padding: "2px 6px",
                borderRadius: "6px",
                bgcolor: COLORS.blackHaze,
              }}
            >
              <Typography variant="text4">Blocked From Deposits</Typography>
            </Box>
          )}
          {value === "Credential Expired" && (
            <Box
              sx={{
                width: "fit-content",
                height: "fit-content",
                padding: "2px 6px",
                borderRadius: "6px",
                bgcolor: COLORS.blackHaze,
              }}
            >
              <Typography variant="text4">Credential Expired</Typography>
            </Box>
          )}
          {value === "Provider Removed" && (
            <Box
              sx={{
                width: "fit-content",
                height: "fit-content",
                padding: "2px 6px",
                borderRadius: "6px",
                bgcolor: COLORS.blackHaze,
              }}
            >
              <Typography variant="text4">Provider Removed</Typography>
            </Box>
          )}
        </Box>
      ),
    },
    {
      sortable: false,
      field: "accessExpiry",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.accessExpiry",
      ),
      minWidth: 110,
      headerAlign: "left",
      align: "left",
      flex: 1,
    },
    {
      sortable: false,
      field: "dateAdded",
      headerName: t(
        "borrowerMarketDetails.authorisedLenders.tableHeaders.dateAdded",
      ),
      minWidth: 110,
      headerAlign: hasMLA ? "left" : "right",
      align: hasMLA ? "left" : "right",
      flex: 1,
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
            {t("borrowerMarketDetails.authorisedLenders.notSigned")}
          </Typography>
        ),
    },
  ]

  const columns: GridColDef[] = hasMLA
    ? [...commonColumns, ...mlaColumns]
    : commonColumns

  const lendersInMarket = authorizedRows.filter(
    (lender) => parseFloat(lender.balance.split(" ")[0].replace(/,/g, "")) > 0,
  ).length

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
      {lendersRows.length === 0 && marketAccount?.isBorrower && (
        <Box display="flex" flexDirection="column">
          <Typography variant="title3" sx={{ marginBottom: "8px" }}>
            {t("borrowerMarketDetails.authorisedLenders.noLendersTitle")}
          </Typography>
          <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
            {t("borrowerMarketDetails.authorisedLenders.noLendersSubtitle")}
          </Typography>
          <Link href={editLendersLink}>
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
              {t("borrowerMarketDetails.authorisedLenders.buttons.editPolicy")}
            </Button>
          </Link>
        </Box>
      )}

      {authorizedRows.length === 0 &&
        lendersRows.length !== 0 &&
        marketAccount?.isBorrower && (
          <Box display="flex" flexDirection="column">
            <Typography variant="title3" sx={{ marginBottom: "8px" }}>
              {t("borrowerMarketDetails.authorisedLenders.header")}
            </Typography>
            <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
              {t("borrowerMarketDetails.authorisedLenders.noActiveLenders")}
            </Typography>
            <Link href={editLendersLink}>
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
                {t(
                  "borrowerMarketDetails.authorisedLenders.buttons.editPolicy",
                )}
              </Button>
            </Link>
          </Box>
        )}

      {authorizedRows.length !== 0 && market && (
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
            {marketAccount?.isBorrower && (
              <Link href={editLendersLink}>
                <Button size="small" variant="outlined" color="secondary">
                  {t(
                    "borrowerMarketDetails.authorisedLenders.buttons.editPolicy",
                  )}
                </Button>
              </Link>
            )}
          </Box>

          <Box sx={{ width: "100%", display: "flex", gap: "11px" }}>
            <Box sx={NumberOfLenders}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                Number of Lenders
              </Typography>
              <Typography variant="text1">{authorizedRows.length}</Typography>
            </Box>

            <Box sx={NumberOfLenders}>
              <Typography variant="text4" color={COLORS.santasGrey}>
                Lenders Currently in the Market
              </Typography>
              <Typography variant="text1" color={COLORS.ultramarineBlue}>
                {lendersInMarket}
              </Typography>
            </Box>
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
            getRowHeight={() => "auto"}
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
              getRowHeight={() => "auto"}
            />
          </Accordion>
        </>
      )}
    </Box>
  )
}
