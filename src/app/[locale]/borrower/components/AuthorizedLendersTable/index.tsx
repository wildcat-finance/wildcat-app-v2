import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Button,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import Link from "next/link"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import { MarketWithdrawalRequetstCell } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/style"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { LinkGroup } from "@/components/LinkComponent"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import {
  LendersTableModal,
  LendersTableProps,
  TypeSafeColDef,
} from "./interface"

export const LendersTable = ({
  label,
  tableData,
  isOpen,
  isLoading,
}: LendersTableProps) => {
  const { getAddressUrl } = useBlockExplorer()
  const getEditLendersLink = (lenderAddress: string) =>
    `${ROUTES.borrower.lendersList}?lenderAddress=${encodeURIComponent(
      lenderAddress,
    )}`

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const rows: GridRowsProp<LendersTableModal> = tableData.map((lender) => ({
    id: lender.address,
    authorized: lender.isAuthorized,
    name: (() => lendersNames[lender.address.toLowerCase()] || "")(),
    address: lender.address,
    markets: lender.markets,
  }))

  const columns: TypeSafeColDef<LendersTableModal>[] = [
    {
      sortable: false,
      field: "name",
      disableColumnMenu: true,
      headerName: "Name",
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => <LenderName address={params.row.address} />,
      flex: 1,
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

          <LinkGroup linkValue={getAddressUrl(value)} copyValue={value} />
        </Box>
      ),
      flex: 1,
    },
    {
      sortable: true,
      field: "markets",
      headerName: "Assigned to Markets",
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      flex: 4,
      renderCell: (params) =>
        !params.value.length ? (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="text3" color={COLORS.santasGrey}>
              No markets yet
            </Typography>

            <Link href={getEditLendersLink(params.row.address)}>
              <Button
                variant="text"
                size="small"
                sx={{ color: COLORS.ultramarineBlue }}
              >
                Add markets
              </Button>
            </Link>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              padding: "14px 0",
            }}
          >
            {params.value.map((market: { name: string; address: string }) => (
              <LendersMarketChip marketName={market.name} width="fit-content" />
            ))}
          </Box>
        ),
    },
  ]

  return (
    <Accordion sx={{ width: "100%", minWidth: 0 }} defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">{label}</Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {isLoading ? "are loading" : rows.length}
          </Typography>
        </Box>
      </AccordionSummary>

      {isLoading && (
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
      )}

      {tableData.length !== 0 && !isLoading && (
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
      )}
    </Accordion>
  )
}
