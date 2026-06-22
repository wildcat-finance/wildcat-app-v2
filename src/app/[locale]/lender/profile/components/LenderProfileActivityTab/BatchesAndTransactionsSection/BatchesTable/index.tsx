import { Box, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import Link from "next/link"

import {
  ProfileHealthClickableGridSx,
  ProfileHealthLinkCell,
  ProfileHealthRowLinkInteractiveSx,
  ProfileHealthRowLinkStretchedSx,
  ProfileHealthTableScrollSx,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/style"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { LinkGroup } from "@/components/LinkComponent"
import { formatUsd } from "@/components/Profile/shared/analytics"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildBorrowerProfileHref,
  buildMarketHref,
  trimAddress,
} from "@/utils/formatters"

import { BatchTableRow, TypeSafeColDef } from "./interface"
import { BatchStatus, StatusPillChip } from "../StatusPillChip"

type BatchesTableProps = {
  rows: GridRowsProp<BatchTableRow>
}

// USD amount, greyed out when zero (matching the Figma "$0" treatment).
const AmountCell = ({ value }: { value: number }) => (
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

export const BatchesTable = ({ rows }: BatchesTableProps) => {
  const { chainId } = useSelectedNetwork()
  const { getTxUrl } = useBlockExplorer()

  const columns: TypeSafeColDef<BatchTableRow>[] = [
    {
      field: "marketName",
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
              {row.marketName}
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
      field: "expiry",
      headerName: "Expiry",
      minWidth: 150,
      flex: 1,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "requested",
      headerName: "Requested",
      minWidth: 110,
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <AmountCell value={value as number} />,
    },
    {
      field: "withdrawn",
      headerName: "Withdrawn",
      minWidth: 110,
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <AmountCell value={value as number} />,
    },
    {
      field: "remaining",
      headerName: "Remaining",
      minWidth: 110,
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <AmountCell value={value as number} />,
    },
    {
      field: "txHash",
      headerName: "Tx",
      minWidth: 150,
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
    {
      field: "status",
      headerName: "Status",
      minWidth: 100,
      flex: 0.1,
      sortable: false,
      headerAlign: "right",
      align: "right",
      renderCell: ({ value }) => (
        <StatusPillChip status={value as BatchStatus} />
      ),
    },
  ]

  return (
    <Box sx={ProfileHealthTableScrollSx}>
      <DataGrid
        disableVirtualization
        sx={ProfileHealthClickableGridSx}
        rowHeight={66}
        rows={rows}
        columns={columns}
        columnHeaderHeight={40}
      />
    </Box>
  )
}
