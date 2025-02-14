"use client"

import * as React from "react"
import { useState } from "react"

import { Box, Skeleton, Typography, Button } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useTranslation } from "react-i18next"

import { MarketWithdrawalRequetstCell } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/style"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl, TargetChainId } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted, trimAddress } from "@/utils/formatters"

import {
  BorrowerInvitationRow,
  BorrowerInvitesTableProps,
  TypeSafeColDef,
} from "./interface"
import { useAllBorrowerInvitations } from "../../hooks/useAllBorrowerInvitations"
import { useRegisterTestnetBorrower } from "../../hooks/useRegisterTestnetBorrower"
import { CancelInviteModal } from "../CancelInviteModal"
import { InviteBorrowerModal } from "../InviteBorrowerModal"

dayjs.extend(relativeTime)

const RegisterBorrowerButton = ({ address }: { address: string }) => {
  const { mutate, isPending } = useRegisterTestnetBorrower()

  return (
    <Button variant="outlined" onClick={() => mutate(address)}>
      {isPending ? "Registering..." : "Register"}
    </Button>
  )
}

export const BorrowerInvitesTable = () => {
  const { t } = useTranslation()

  const { data: tableData, isLoading } = useAllBorrowerInvitations()
  const [selectedInvite, setSelectedInvite] = useState<{
    address: string
    name: string
  } | null>(null)
  const rows = React.useMemo(
    () =>
      tableData?.map((row, index) => ({
        ...row,
        cancelColumn: `cancel-${index}`,
        registerColumn: `register-${index}`,
      })),
    [tableData],
  )

  const columns: TypeSafeColDef<
    BorrowerInvitationRow & {
      cancelColumn: string
      registerColumn: string
    }
  >[] = [
    {
      field: "name",
      headerName: "Borrower Name",
      flex: 1,
      // minWidth: 134,
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
      field: "alias",
      headerName: "Borrower Alias",
      flex: 1,
      // minWidth: 134,
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
      field: "timeInvited",
      headerName: "Invited",
      flex: 1,
      // minWidth: 134,
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
          <span
            title={timestampToDateFormatted(+new Date(params.value) / 1000)}
          >
            {dayjs(+new Date(params.value)).fromNow()}
          </span>
        </span>
      ),
    },
    {
      sortable: false,
      field: "address",
      headerName: "Wallet Address",
      // minWidth: 176,
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
      flex: 0.6,
      // minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => <span>{params.value ? "Yes" : "No"}</span>,
    },
    {
      field: "timeSigned",
      headerName: "Signed",
      flex: 1,
      // minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <span>
          {params.value ? (
            <span
              title={timestampToDateFormatted(+new Date(params.value) / 1000)}
            >
              {dayjs(+new Date(params.value)).fromNow()}
            </span>
          ) : (
            "N/A"
          )}
        </span>
      ),
    },
    {
      field: "registerColumn",
      headerName: "",
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        if (params.row.timeSigned && !params.row.registeredOnChain) {
          if (TargetChainId === SupportedChainId.Sepolia) {
            return <RegisterBorrowerButton address={params.row.address} />
          }
          return (
            <Typography variant="text3" color={COLORS.blackRock07}>
              Pending Registration
            </Typography>
          )
        }
        return null
      },
    },
    {
      field: "cancelColumn",
      headerName: "",
      sortable: false,
      // minWidth: 120,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Button
          variant="outlined"
          sx={{
            color: COLORS.dullRed,
            borderColor: COLORS.dullRed,
            "&:hover": {
              borderColor: COLORS.dullRed08,
            },
          }}
          onClick={() =>
            setSelectedInvite({
              address: params.row.address,
              name: params.row.name,
            })
          }
        >
          {t("admin.inviteBorrower.cancel")}
        </Button>
      ),
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        <InviteBorrowerModal />
      </Box>
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
        rows={tableData}
        columns={columns}
        columnHeaderHeight={40}
        getRowHeight={() => "auto"}
      />
      {selectedInvite && (
        <CancelInviteModal
          isOpen={!!selectedInvite}
          onClose={() => setSelectedInvite(null)}
          address={selectedInvite.address}
          borrowerName={selectedInvite.name}
        />
      )}
    </Box>
  )
}

export default BorrowerInvitesTable
