import { useEffect, useState } from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import Link from "next/link"

import {
  ProfileHealthClickableGridSx,
  ProfileHealthLinkCell,
  ProfileHealthRowLinkInteractiveSx,
  ProfileHealthRowLinkStretchedSx,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/style"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { LinkGroup } from "@/components/LinkComponent"
import { formatUsd } from "@/components/Profile/shared/analytics"
import { TablePagination } from "@/components/TablePagination"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildBorrowerProfileHref,
  buildMarketHref,
  trimAddress,
} from "@/utils/formatters"

import { ActivityType, TransactionTableRow, TypeSafeColDef } from "./interface"
import { BatchStatus, StatusPillChip } from "../StatusPillChip"

type TransactionsTableProps = {
  rows: GridRowsProp<TransactionTableRow>
}

// Each activity type maps to a direction (arrow + label) and, for withdrawals,
// a status sub-chip: a request is still pending, an execution is completed.
type TxTypeDisplay = {
  arrow: string
  label: string
  status?: BatchStatus
}

const TX_TYPE_DISPLAY: Record<ActivityType, TxTypeDisplay> = {
  Deposit: { arrow: "↓", label: "Deposit" },
  "Withdrawal Request": { arrow: "↑", label: "Withdraw", status: "Pending" },
  "Withdrawal Execution": {
    arrow: "↑",
    label: "Withdraw",
    status: "Completed",
  },
}

// Direction pill (↓ Deposit / ↑ Withdraw) plus, for withdrawals, a status pill.
const TxTypeCell = ({ type }: { type: ActivityType }) => {
  const display = TX_TYPE_DISPLAY[type]

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "4px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          backgroundColor: COLORS.blackHaze,
          borderRadius: "6px",
          padding: "2px 6px",
        }}
      >
        <Box
          component="span"
          sx={{ fontSize: "13px", lineHeight: 1, fontWeight: 600 }}
        >
          {display.arrow}
        </Box>
        <Typography
          variant="text4"
          sx={{ fontWeight: 500, whiteSpace: "nowrap" }}
        >
          {display.label}
        </Typography>
      </Box>

      {display.status && <StatusPillChip status={display.status} />}
    </Box>
  )
}

// USD amount, greyed out when zero (matching the Figma "$0" treatment).
const UsdCell = ({ value }: { value: number }) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
    <Typography
      variant="text3"
      noWrap
      color={value > 0 ? COLORS.blackRock : COLORS.santasGrey}
    >
      {formatUsd(value, { compact: true })}
    </Typography>
  </Box>
)

export const TransactionsTable = ({ rows }: TransactionsTableProps) => {
  const { chainId } = useSelectedNetwork()
  const { getTxUrl } = useBlockExplorer()
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  })

  // Rows are filtered upstream; reset to the first page when they change.
  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }))
  }, [rows])

  const columns: TypeSafeColDef<TransactionTableRow>[] = [
    {
      field: "market",
      headerName: "Market",
      flex: 1.4,
      minWidth: 240,
      headerAlign: "left",
      align: "left",
      renderCell: ({ row }) => (
        <Box
          sx={{
            ...ProfileHealthLinkCell,
            paddingRight: "16px",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "6px",
            minWidth: 0,
          }}
        >
          <Box
            component={Link}
            href={buildMarketHref(
              row.marketId,
              undefined,
              ROUTES.lender.market,
            )}
            sx={ProfileHealthRowLinkStretchedSx}
          >
            <Typography
              variant="text3"
              sx={{
                display: "block",
                width: "100%",
                minWidth: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {row.market}
            </Typography>
          </Box>

          {row.borrower ? (
            <Box
              component={Link}
              href={buildBorrowerProfileHref(row.borrower, chainId)}
              prefetch={false}
              sx={{
                ...ProfileHealthRowLinkInteractiveSx,
                display: "flex",
                textDecoration: "none",
              }}
            >
              <BorrowerProfileChip
                borrower={row.borrowerName ?? row.borrower}
              />
            </Box>
          ) : (
            <BorrowerProfileChip borrower={row.borrowerName ?? row.borrower} />
          )}
        </Box>
      ),
    },
    {
      field: "date",
      headerName: "Date",
      minWidth: 150,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Typography variant="text3" noWrap>
          {value as string}
        </Typography>
      ),
    },
    {
      field: "type",
      headerName: "Type",
      minWidth: 150,
      flex: 1,
      sortable: false,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => <TxTypeCell type={value as ActivityType} />,
    },
    {
      field: "amountUsd",
      headerName: "Amount",
      minWidth: 110,
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <UsdCell value={value as number} />,
    },
    {
      field: "balanceInProtocol",
      headerName: "Balance in protocol",
      minWidth: 150,
      flex: 1,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <UsdCell value={value as number} />,
    },
    {
      field: "txHash",
      headerName: "Tx",
      minWidth: 160,
      flex: 1,
      sortable: false,
      headerAlign: "right",
      align: "right",
      renderCell: ({ value }) => (
        <Box
          sx={{
            ...ProfileHealthRowLinkInteractiveSx,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Typography variant="text3" noWrap>
            {trimAddress(value as string, 8)}
          </Typography>
          <LinkGroup
            copyValue={value as string}
            linkValue={getTxUrl(value as string)}
          />
        </Box>
      ),
    },
  ]

  return (
    <DataGrid
      disableVirtualization
      sx={ProfileHealthClickableGridSx}
      rowHeight={66}
      rows={rows}
      columns={columns}
      columnHeaderHeight={40}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      slots={{ pagination: TablePagination }}
      hideFooter={false}
    />
  )
}
