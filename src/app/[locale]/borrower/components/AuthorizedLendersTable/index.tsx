import * as React from "react"
import { useState } from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import { MarketWithdrawalRequetstCell } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/style"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { LendersTableProps } from "./interface"

export const LendersTable = ({
  label,
  tableData,
  isOpen,
  isLoading,
}: LendersTableProps) => {
  const [lendersNames, setLendersNames] = useState<{ [key: string]: string }>(
    (() => {
      const storedNames = JSON.parse(
        localStorage.getItem("lenders-name") || "{}",
      )
      return Object.keys(storedNames).reduce(
        (acc, key) => {
          acc[key.toLowerCase()] = storedNames[key]
          return acc
        },
        {} as { [key: string]: string },
      )
    })(),
  )

  const rows = tableData.map((lender) => ({
    id: lender.address,
    authorized: lender.isAuth,
    name: (() => {
      const correctLender = lendersNames[lender.address.toLowerCase()] || ""
      return { name: correctLender, address: lender }
    })(),
    walletAddress: lender.address,
    markets: lender.markets,
  }))

  const columns: GridColDef[] = [
    {
      sortable: false,
      field: "name",
      disableColumnMenu: true,
      headerName: "Name",
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <LenderName
          setLendersName={setLendersNames}
          lenderName={params.value.name}
          address={params.value.address}
        />
      ),
      flex: 1,
    },
    {
      sortable: false,
      field: "walletAddress",
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
      sortable: true,
      field: "markets",
      headerName: "Assigned to Markets",
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      flex: 4,
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {value.map((market: { marketName: string; address: string }) => (
            <LendersMarketChip
              marketName={market.marketName}
              width="fit-content"
            />
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
            "& .MuiDataGrid-cell": { cursor: "default" },
          }}
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
        />
      )}
    </Accordion>
  )
}
