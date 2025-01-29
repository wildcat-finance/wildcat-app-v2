"use client"

import * as React from "react"
import { useState } from "react"

import { Box, Skeleton, Typography, Button } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { MarketWithdrawalRequetstCell } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/style"
import {
  BorrowerProfile,
  BorrowerProfileForAdminView,
} from "@/app/api/profiles/interface"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted, trimAddress } from "@/utils/formatters"

import { TypeSafeColDef } from "./interface"
import { useAllBorrowerProfiles } from "../../hooks/useAllBorrowerProfiles"
import { EditBorrowerModal } from "../EditBorrowerModal"

export const BorrowersTable = () => {
  const { t } = useTranslation()

  const { data: tableData, isLoading } = useAllBorrowerProfiles()
  const [selectedBorrower, setSelectedBorrower] =
    useState<BorrowerProfile | null>(null)

  const rows = tableData?.map((borrower, index) => ({
    ...borrower,
    id: index.toString(),
  }))

  const columns: TypeSafeColDef<
    BorrowerProfileForAdminView & { id: string }
  >[] = [
    {
      field: "timeInvited",
      headerName: "Invited At",
      flex: 1,
      minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <span
          style={{
            width: "100%",
            paddingRight: "20px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {timestampToDateFormatted(+new Date(params.value) / 1000)}
        </span>
      ),
    },
    {
      field: "name",
      headerName: "Borrower Name",
      flex: 1.7,
      minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
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
      ),
    },
    {
      sortable: false,
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
      flex: 1,
    },
    {
      field: "registeredOnChain",
      headerName: "Registered On Chain",
      flex: 1,
      minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => <span>{params.value ? "Yes" : "No"}</span>,
    },
    {
      field: "timeSigned",
      headerName: "Signed At",
      flex: 1,
      minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <span>
          {params.value
            ? timestampToDateFormatted(+new Date(params.value) / 1000)
            : "N/A"}
        </span>
      ),
    },
    {
      field: "chainId",
      headerName: "",
      sortable: false,
      minWidth: 100,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        if (!params.row.timeSigned) {
          return (
            <Button
              variant="text"
              color="error"
              onClick={() => setSelectedBorrower(params.row)}
            >
              View Profile
            </Button>
          )
        }

        return <EditBorrowerModal address={params.row.address} />
      },
    },
  ]

  if (isLoading)
    return (
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
    )

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 3,
      }}
    >
      <DataGrid
        sx={{
          overflow: "auto",
          maxWidth: "calc(100vw - 267px)",

          "& .MuiDataGrid-cell": {
            minHeight: "52px",
            height: "auto",
            cursor: "default",
          },
        }}
        rows={rows}
        columns={columns}
        columnHeaderHeight={40}
        getRowHeight={() => "auto"}
      />
      {/* {selectedBorrower && (
        <CancelInviteModal
          isOpen={!!selectedBorrower}
          onClose={() => setSelectedBorrower(null)}
          address={selectedBorrower?.address}
          borrowerName={selectedBorrower?.name}
        />
      )} */}
    </Box>
  )
}

export default BorrowersTable
